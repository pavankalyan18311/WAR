# 10 — Cart & Checkout

## Overview

The Cart module manages the user's active shopping basket. The Checkout module orchestrates address selection, payment method choice, coupon application, shipping calculation, and order creation.

---

## Cart

### Features

| Feature | Description |
|---------|-------------|
| Add item | Add a product variant to the cart |
| Remove item | Remove a specific item |
| Update quantity | Change the quantity of a cart item |
| Apply coupon | Validate and apply a discount coupon code |
| Calculate shipping | Real-time shipping cost based on address and weight |
| Merge carts | On login, merge guest cart with user's saved cart |
| Persist cart | Cart saved per user account; guest cart in session/localStorage |

### Business Rules

- Maximum 10 unique variants per cart.
- Maximum quantity of 5 units per variant.
- Items are not stock-reserved until order is placed.
- If an item goes out of stock after being added to cart, it is flagged at checkout with a prompt to remove it.
- Cart is invalidated (cleared) after a successful order.

### Cart Price Summary

```
Subtotal     = sum(item.price × item.quantity) for all items
Discount     = coupon_discount_amount (if valid coupon applied)
Shipping     = calculated based on address + total weight
Tax          = (subtotal - discount) × tax_rate (default 18% GST)
─────────────────────────────────────────────────────
Total        = Subtotal - Discount + Shipping + Tax
```

---

## Coupon Module

### Coupon Types

| Type | Description |
|------|-------------|
| `percentage` | e.g. 20% off the subtotal |
| `flat_amount` | e.g. ₹200 off the subtotal |
| `free_shipping` | Waives the shipping charge |
| `buy_x_get_y` | e.g. Buy 2, Get 1 Free |

### Coupon Rules

| Rule | Description |
|------|-------------|
| `min_order_value` | Minimum cart subtotal required |
| `max_uses` | Global maximum redemptions |
| `max_uses_per_user` | Per-user redemption limit |
| `valid_from` / `valid_until` | Active date range |
| `applicable_categories` | Restrict to specific categories |
| `applicable_products` | Restrict to specific product IDs |
| `first_order_only` | Only valid for a user's first order |

### Coupon Validation Response

```json
{
  "valid": true,
  "coupon_code": "WELCOME20",
  "type": "percentage",
  "value": 20,
  "discount_amount": 200,
  "message": "20% discount applied!"
}
```

---

## Checkout Flow

```
Step 1: Review Cart
      ↓
Step 2: Select / Add Delivery Address
      ↓
Step 3: Select Payment Method
      ↓
Step 4: Order Summary + Place Order
      ↓
Step 5: Payment Processing
      ↓
Step 6: Order Confirmation
```

---

## Address Management

Registered customers can save multiple addresses.

### Address Fields

| Field | Type | Required |
|-------|------|----------|
| `full_name` | String | ✅ |
| `phone` | String | ✅ |
| `address_line_1` | String | ✅ |
| `address_line_2` | String | Optional |
| `city` | String | ✅ |
| `state` | String | ✅ |
| `pincode` | String | ✅ |
| `country` | String | Default: India |
| `is_default` | Boolean | |

---

## Payment Methods

| Method | Description |
|--------|-------------|
| UPI | Unified Payments Interface (Razorpay / PayU gateway) |
| Credit / Debit Card | Via payment gateway |
| Net Banking | Via payment gateway |
| Cash on Delivery (COD) | Available for orders under ₹5,000 |
| Loyalty Points | Partial payment with earned points |

### Payment Flow

```
UPI / Card / Net Banking:
  1. Client requests payment intent from backend
  2. Backend creates order in DB (status: pending)
  3. Client redirected to payment gateway
  4. Gateway calls webhook on success/failure
  5. Backend confirms order (status: confirmed) or cancels

COD:
  1. Order created directly (status: confirmed)
  2. Payment recorded as pending_collection
  3. Marked paid on delivery confirmation
```

---

## Invoice Generation

On successful order:
1. A PDF invoice is generated using a template engine.
2. Stored in S3: `invoices/{order_id}/invoice.pdf`
3. Emailed to customer automatically.
4. Available for download from Order History.

### Invoice Contents

- Order ID, date, and customer details
- Line items with product name, size, colour, quantity, unit price
- Subtotal, discount, shipping, GST breakdown
- Total amount paid
- Payment method
- Delivery address
- Company GST number

---

## Database Tables

### `carts`

| Column | Type |
|--------|------|
| `id` | UUID |
| `user_id` | UUID (nullable for guests) |
| `session_id` | String (guest identifier) |
| `coupon_id` | UUID (nullable) |
| `created_at` | Timestamp |
| `updated_at` | Timestamp |

### `cart_items`

| Column | Type |
|--------|------|
| `id` | UUID |
| `cart_id` | UUID |
| `product_id` | UUID |
| `variant_id` | UUID |
| `quantity` | Integer |
| `unit_price` | Decimal (snapshot at add time) |

### `coupons`

| Column | Type |
|--------|------|
| `id` | UUID |
| `code` | String (unique, uppercase) |
| `type` | Enum |
| `value` | Decimal |
| `min_order_value` | Decimal |
| `max_uses` | Integer |
| `uses_count` | Integer |
| `valid_from` | Timestamp |
| `valid_until` | Timestamp |
| `is_active` | Boolean |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get current cart |
| POST | `/api/cart/items` | Add item to cart |
| PUT | `/api/cart/items/:id` | Update item quantity |
| DELETE | `/api/cart/items/:id` | Remove item from cart |
| POST | `/api/cart/coupon` | Apply coupon code |
| DELETE | `/api/cart/coupon` | Remove coupon |
| POST | `/api/checkout/shipping` | Calculate shipping for address |
| POST | `/api/checkout/place-order` | Place order and create payment intent |
| GET | `/api/addresses` | List saved addresses |
| POST | `/api/addresses` | Add new address |
| PUT | `/api/addresses/:id` | Update address |
| DELETE | `/api/addresses/:id` | Delete address |
