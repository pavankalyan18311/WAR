from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import re


# ─── Auth Schemas ─────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*]", v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    user_id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    avatar: Optional[str] = None
    is_verified: bool

    class Config:
        from_attributes = True


# ─── Product Schemas ──────────────────────────────────────────────────────────
class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None

    class Config:
        from_attributes = True


class ProductVariantOut(BaseModel):
    variant_id: UUID
    sku: str
    color: str
    size: str
    stock_quantity: int
    price_override: Optional[float] = None

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    url: str
    alt: Optional[str] = None
    type: str

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    product_id: UUID
    sku: str
    name: str
    slug: str
    description: str
    price: float
    discount_price: Optional[float] = None
    category: Optional[CategoryOut] = None
    status: str
    color: Optional[str] = None
    fabric: Optional[str] = None
    fit_type: Optional[str] = None
    weight: Optional[float] = None
    stock_quantity: int
    is_in_stock: bool = False
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if hasattr(obj, 'stock_quantity'):
            obj.is_in_stock = obj.stock_quantity > 0
        return super().model_validate(obj, **kwargs)


class ProductCreate(BaseModel):
    sku: str
    name: str
    slug: str
    description: str
    price: float
    discount_price: Optional[float] = None
    category_id: int
    color: Optional[str] = None
    fabric: Optional[str] = None
    fit_type: Optional[str] = None
    weight: Optional[float] = None
    stock_quantity: int = 0


class ProductListResponse(BaseModel):
    data: List[ProductOut]
    total: int
    page: int
    limit: int
    total_pages: int


# ─── Cart Schemas ─────────────────────────────────────────────────────────────
class AddToCartRequest(BaseModel):
    variant_id: UUID
    quantity: int = 1


class UpdateCartItemRequest(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    cart_item_id: UUID
    variant: ProductVariantOut
    product: Optional[ProductOut] = None
    quantity: int

    class Config:
        from_attributes = True


# ─── Order Schemas ────────────────────────────────────────────────────────────
class AddressIn(BaseModel):
    full_name: str
    phone: str
    address_line_1: str
    address_line_2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"


class CreateOrderRequest(BaseModel):
    shipping_address: AddressIn
    payment_method: str
    coupon_code: Optional[str] = None
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    variant_id: UUID
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    order_id: UUID
    order_number: str
    status: str
    payment_method: str
    payment_status: str
    subtotal: float
    discount: float
    shipping: float
    tax: float
    total: float
    coupon_code: Optional[str] = None
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


# ─── Review Schemas ───────────────────────────────────────────────────────────
class CreateReviewRequest(BaseModel):
    product_id: UUID
    rating: int
    title: Optional[str] = None
    body: str

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewOut(BaseModel):
    review_id: UUID
    rating: int
    title: Optional[str] = None
    body: str
    verified_purchase: bool
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True


# ─── Coupon Schemas ───────────────────────────────────────────────────────────
class ValidateCouponRequest(BaseModel):
    code: str
    order_amount: float


class CouponValidationResponse(BaseModel):
    valid: bool
    coupon_code: str
    type: Optional[str] = None
    value: Optional[float] = None
    discount_amount: Optional[float] = None
    message: str


# ─── AI Schemas ───────────────────────────────────────────────────────────────
class SizeRecommendationRequest(BaseModel):
    height: float
    weight: Optional[float] = None
    chest: Optional[float] = None
    shoulder: Optional[float] = None
    waist: Optional[float] = None
    product_id: Optional[UUID] = None


class SizeRecommendationResponse(BaseModel):
    recommended_size: str
    confidence: float
    fit_notes: List[str]


class ChatMessageRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    reply: str
    products: Optional[List[ProductOut]] = None
    conversation_id: str
