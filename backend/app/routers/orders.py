from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Order, OrderItem, OrderAddress, CartItem, ProductVariant, Coupon
from app.schemas.schemas import CreateOrderRequest, OrderOut
from app.routers.deps import get_current_user
from app.models.models import User
import uuid
import random
import string

router = APIRouter(prefix="/orders", tags=["Orders"])


def generate_order_number() -> str:
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"TXN-{suffix}"


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(
    payload: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch cart items
    result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.user_id)
    )
    cart_items = result.scalars().all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Calculate totals
    subtotal = 0.0
    order_items_data = []
    for item in cart_items:
        variant_result = await db.execute(
            select(ProductVariant).where(ProductVariant.variant_id == item.variant_id)
        )
        variant = variant_result.scalar_one_or_none()
        if not variant or variant.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for variant {item.variant_id}")
        price = variant.price_override or 0
        subtotal += price * item.quantity
        order_items_data.append((variant, item.quantity, price))

    discount = 0.0
    if payload.coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(Coupon.code == payload.coupon_code, Coupon.is_active.is_(True))
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon:
            if coupon.type == "percentage":
                discount = round(subtotal * (coupon.value / 100), 2)
            elif coupon.type == "flat_amount":
                discount = min(coupon.value, subtotal)

    shipping = 0.0 if subtotal >= 999 else 99.0
    total = subtotal - discount + shipping

    # Create order
    order = Order(
        order_number=generate_order_number(),
        user_id=current_user.user_id,
        payment_method=payload.payment_method,
        subtotal=subtotal,
        discount=discount,
        shipping=shipping,
        tax=0,
        total=total,
        coupon_code=payload.coupon_code,
        notes=payload.notes,
    )
    db.add(order)
    await db.flush()

    # Order items + deduct stock
    for variant, qty, price in order_items_data:
        order_item = OrderItem(
            order_id=order.order_id,
            variant_id=variant.variant_id,
            quantity=qty,
            unit_price=price,
        )
        db.add(order_item)
        variant.stock_quantity -= qty

    # Shipping address snapshot
    addr = OrderAddress(
        order_id=order.order_id,
        **payload.shipping_address.model_dump(),
    )
    db.add(addr)

    # Clear cart
    for item in cart_items:
        await db.delete(item)

    await db.flush()
    await db.refresh(order)
    return OrderOut.model_validate(order)


@router.get("", response_model=list[OrderOut])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order).where(Order.user_id == current_user.user_id).order_by(Order.created_at.desc())
    )
    return [OrderOut.model_validate(o) for o in result.scalars().all()]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order).where(Order.order_id == order_id, Order.user_id == current_user.user_id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderOut.model_validate(order)
