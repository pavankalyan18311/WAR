"""
Razorpay Payment Gateway Integration
=====================================
Endpoints:
  POST /payments/create-order   — Creates a Razorpay order (server-side, amount from DB)
  POST /payments/verify         — Verifies signature + creates Order in DB after payment
  POST /payments/webhook        — Handles Razorpay event webhooks (backup confirmation)
  POST /payments/refund         — Initiates a full or partial refund

Security model:
  • Amount is always computed server-side from the authenticated user's cart.
  • Frontend only sends razorpay_order_id, razorpay_payment_id, razorpay_signature.
  • Signature is verified with HMAC-SHA256 using RAZORPAY_KEY_SECRET (never leaves server).
  • Webhook payload is verified with RAZORPAY_WEBHOOK_SECRET (set in Razorpay Dashboard).
"""

import hashlib
import hmac
import json
import logging
import random
import string
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.models import (
    CartItem,
    Coupon,
    Order,
    OrderAddress,
    OrderItem,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    ProductVariant,
    User,
)
from app.routers.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── Razorpay client factory ────────────────────────────────────────────────────

def _razorpay_client():
    """
    Returns an initialised razorpay.Client.
    Raises 503 if keys are not yet configured — so the app starts fine without them.
    """
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=503,
            detail=(
                "Payment gateway is not configured. "
                "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file."
            ),
        )
    import razorpay  # lazy import — not required at startup

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    client.set_app_details({"title": "WAR Brand", "version": "1.0.0"})
    return client


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class CreateOrderResponse(BaseModel):
    razorpay_order_id: str
    amount: int          # paise (₹1 = 100 paise)
    currency: str = "INR"
    key_id: str          # public key — safe to send to browser
    prefill: dict


class DeliveryAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    delivery_address: DeliveryAddress
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class VerifyPaymentResponse(BaseModel):
    success: bool
    order_number: str
    order_id: str
    message: str


class RefundRequest(BaseModel):
    payment_id: str
    amount: Optional[int] = None   # paise; None = full refund
    reason: str = "requested_by_customer"
    notes: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Razorpay signature verification.
    Expected signature = HMAC-SHA256(f"{order_id}|{payment_id}", key_secret)
    """
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def _verify_webhook_signature(body: bytes, received_signature: str) -> bool:
    """Verify Razorpay webhook payload signature."""
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, received_signature)


def _generate_order_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"WAR-{suffix}"


async def _compute_cart_totals(
    user_id: uuid.UUID,
    coupon_code: Optional[str],
    db: AsyncSession,
) -> dict:
    """
    Server-side cart total calculation.
    Amount is NEVER trusted from the client — always recalculated here.
    """
    result = await db.execute(select(CartItem).where(CartItem.user_id == user_id))
    cart_items = result.scalars().all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    subtotal = 0.0
    for item in cart_items:
        variant_result = await db.execute(
            select(ProductVariant).where(ProductVariant.variant_id == item.variant_id)
        )
        variant = variant_result.scalar_one_or_none()
        if not variant:
            raise HTTPException(status_code=400, detail=f"Product variant not found: {item.variant_id}")
        if variant.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Only {variant.stock_quantity} unit(s) available for a product in your cart",
            )
        price = float(variant.price_override or 0)
        subtotal += price * item.quantity

    discount = 0.0
    if coupon_code:
        coupon_result = await db.execute(
            select(Coupon).where(Coupon.code == coupon_code, Coupon.is_active.is_(True))
        )
        coupon = coupon_result.scalar_one_or_none()
        if coupon:
            if coupon.type == "percentage":
                discount = round(subtotal * (coupon.value / 100), 2)
            elif coupon.type == "flat_amount":
                discount = min(float(coupon.value), subtotal)

    shipping = 0.0 if subtotal >= 999 else 99.0
    total = subtotal - discount + shipping

    return {
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "total": total,
        "amount_paise": int(total * 100),  # Razorpay requires integer paise
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/create-order", response_model=CreateOrderResponse, summary="Step 1 — Create Razorpay order")
async def create_razorpay_order(
    payload: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Creates a Razorpay order with the cart total calculated server-side.
    Returns the order_id and public key_id needed to open the Razorpay checkout popup.
    """
    client = _razorpay_client()
    totals = await _compute_cart_totals(current_user.user_id, payload.coupon_code, db)

    razorpay_order = client.order.create({
        "amount": totals["amount_paise"],
        "currency": "INR",
        "receipt": f"war_{uuid.uuid4().hex[:12]}",
        "notes": {
            "user_id": str(current_user.user_id),
            "source": "war-brand-checkout",
        },
        "payment_capture": 1,  # Auto-capture — change to 0 for manual capture flow
    })

    logger.info(
        "Razorpay order created: %s for user %s, amount: ₹%.2f",
        razorpay_order["id"],
        current_user.user_id,
        totals["total"],
    )

    return CreateOrderResponse(
        razorpay_order_id=razorpay_order["id"],
        amount=totals["amount_paise"],
        currency="INR",
        key_id=settings.RAZORPAY_KEY_ID,
        prefill={
            "name": f"{current_user.first_name or ''} {current_user.last_name or ''}".strip()
                    or getattr(current_user, "name", ""),
            "email": current_user.email or "",
            "contact": current_user.phone or "",
        },
    )


@router.post("/verify", response_model=VerifyPaymentResponse, summary="Step 2 — Verify payment & create order")
async def verify_payment_and_create_order(
    payload: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verifies the Razorpay payment signature (HMAC-SHA256) then:
      1. Recalculates cart total server-side
      2. Creates the Order + OrderItems in the database
      3. Saves delivery address
      4. Deducts stock
      5. Clears the user's cart
    """
    # ── 1. Signature verification ──────────────────────────────────────────
    if not _verify_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        logger.warning(
            "Invalid Razorpay signature for payment %s (user %s)",
            payload.razorpay_payment_id,
            current_user.user_id,
        )
        raise HTTPException(status_code=400, detail="Payment signature is invalid. Please contact support.")

    # ── 2. Idempotency check — prevent duplicate processing ────────────────
    existing = await db.execute(
        select(Order).where(Order.razorpay_payment_id == payload.razorpay_payment_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This payment has already been processed.")

    # ── 3. Server-side total recalculation ─────────────────────────────────
    totals = await _compute_cart_totals(current_user.user_id, payload.coupon_code, db)

    # ── 4. Fetch cart items ────────────────────────────────────────────────
    result = await db.execute(select(CartItem).where(CartItem.user_id == current_user.user_id))
    cart_items = result.scalars().all()

    # ── 5. Create Order ────────────────────────────────────────────────────
    order = Order(
        order_number=_generate_order_number(),
        user_id=current_user.user_id,
        payment_method=PaymentMethod.razorpay,
        payment_status=PaymentStatus.paid,
        status=OrderStatus.confirmed,
        subtotal=totals["subtotal"],
        discount=totals["discount"],
        shipping=totals["shipping"],
        tax=0.0,
        total=totals["total"],
        coupon_code=payload.coupon_code,
        notes=payload.notes,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
    )
    db.add(order)
    await db.flush()  # get order_id

    # ── 6. Create OrderItems + deduct stock ────────────────────────────────
    for item in cart_items:
        variant_result = await db.execute(
            select(ProductVariant).where(ProductVariant.variant_id == item.variant_id)
        )
        variant = variant_result.scalar_one_or_none()
        if variant:
            price = float(variant.price_override or 0)
            db.add(
                OrderItem(
                    order_id=order.order_id,
                    variant_id=item.variant_id,
                    quantity=item.quantity,
                    unit_price=price,
                    total_price=price * item.quantity,
                )
            )
            variant.stock_quantity = max(0, variant.stock_quantity - item.quantity)

    # ── 7. Save delivery address ───────────────────────────────────────────
    addr = payload.delivery_address
    db.add(
        OrderAddress(
            order_id=order.order_id,
            full_name=addr.full_name,
            phone=addr.phone,
            address_line_1=addr.address_line1,
            address_line_2=addr.address_line2,
            city=addr.city,
            state=addr.state,
            pincode=addr.pincode,
            country="India",
        )
    )

    # ── 8. Clear cart ──────────────────────────────────────────────────────
    for item in cart_items:
        await db.delete(item)

    await db.commit()

    logger.info(
        "Order %s created for user %s | payment %s | ₹%.2f",
        order.order_number,
        current_user.user_id,
        payload.razorpay_payment_id,
        totals["total"],
    )

    return VerifyPaymentResponse(
        success=True,
        order_number=order.order_number,
        order_id=str(order.order_id),
        message="Payment verified and order placed successfully.",
    )


@router.post("/webhook", summary="Razorpay webhook receiver", include_in_schema=False)
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Receives Razorpay event webhooks as a reliability backup.

    Configure in Razorpay Dashboard → Settings → Webhooks:
      URL: https://yourdomain.com/api/payments/webhook
      Secret: <RAZORPAY_WEBHOOK_SECRET>
      Events to enable:
        ✓ payment.captured
        ✓ payment.failed
        ✓ order.paid
        ✓ refund.created
    """
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        # If webhook secret is not set, reject webhook calls entirely
        raise HTTPException(status_code=503, detail="Webhook not configured")

    body = await request.body()

    if not x_razorpay_signature or not _verify_webhook_signature(body, x_razorpay_signature):
        logger.warning("Razorpay webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type: str = event.get("event", "")
    logger.info("Razorpay webhook received: %s", event_type)

    if event_type == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        payment_id = payment.get("id")
        razorpay_order_id = payment.get("order_id")
        # Backup: mark order as paid if not already done
        result = await db.execute(
            select(Order).where(Order.razorpay_order_id == razorpay_order_id)
        )
        order = result.scalar_one_or_none()
        if order and order.payment_status != PaymentStatus.paid:
            order.payment_status = PaymentStatus.paid
            order.razorpay_payment_id = payment_id
            order.status = OrderStatus.confirmed
            await db.commit()
            logger.info("Webhook: order %s marked as paid via backup webhook", order.order_number)

    elif event_type == "payment.failed":
        payment = event["payload"]["payment"]["entity"]
        razorpay_order_id = payment.get("order_id")
        result = await db.execute(
            select(Order).where(Order.razorpay_order_id == razorpay_order_id)
        )
        order = result.scalar_one_or_none()
        if order and order.payment_status == PaymentStatus.pending:
            order.payment_status = PaymentStatus.failed
            await db.commit()
            logger.warning("Webhook: payment failed for order %s", razorpay_order_id)

    elif event_type == "refund.created":
        refund = event["payload"]["refund"]["entity"]
        payment_id = refund.get("payment_id")
        result = await db.execute(
            select(Order).where(Order.razorpay_payment_id == payment_id)
        )
        order = result.scalar_one_or_none()
        if order:
            order.payment_status = PaymentStatus.refunded
            order.status = OrderStatus.refunded
            await db.commit()
            logger.info("Webhook: refund processed for order %s", order.order_number)

    # Always return 200 — Razorpay retries non-200 responses
    return {"status": "ok"}


@router.post("/refund", summary="Initiate a refund (admin use)")
async def initiate_refund(
    payload: RefundRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Initiates a full or partial refund via Razorpay.
    Typically called from the admin panel for order cancellations.
    """
    client = _razorpay_client()

    refund_data: dict = {"speed": "optimum"}
    if payload.amount:
        refund_data["amount"] = payload.amount  # partial refund in paise
    if payload.notes:
        refund_data["notes"] = {"reason": payload.notes}

    try:
        refund = client.payment.refund(payload.payment_id, refund_data)
    except Exception as exc:
        logger.error("Razorpay refund failed for %s: %s", payload.payment_id, exc)
        raise HTTPException(status_code=502, detail=f"Razorpay refund failed: {exc}")

    logger.info("Refund initiated: %s for payment %s", refund.get("id"), payload.payment_id)
    return {"refund_id": refund.get("id"), "status": refund.get("status"), "amount": refund.get("amount")}


@router.get("/order/{razorpay_order_id}", summary="Fetch Razorpay order status")
async def get_razorpay_order_status(
    razorpay_order_id: str,
    current_user: User = Depends(get_current_user),
):
    """Returns current Razorpay order status — useful for polling if webhook is delayed."""
    client = _razorpay_client()
    try:
        order = client.order.fetch(razorpay_order_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch order: {exc}")
    return {
        "id": order.get("id"),
        "status": order.get("status"),
        "amount": order.get("amount"),
        "amount_paid": order.get("amount_paid"),
        "amount_due": order.get("amount_due"),
        "currency": order.get("currency"),
        "receipt": order.get("receipt"),
    }
