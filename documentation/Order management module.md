# 11 — Order Management

## Overview

The Order Management module handles the full lifecycle of a customer order — from placement through delivery, and if needed, return and refund. It integrates with payment gateways, shipping providers, and the notification service.

---

## Order Lifecycle

```
Pending → Confirmed → Packed → Shipped → Delivered
                                              │
                                         (if return)
                                              ↓
                                         Returned → Refunded
```

### State Definitions

| State | Description | Triggered By |
|-------|-------------|-------------|
| `pending` | Order placed, awaiting payment confirmation | Checkout |
| `confirmed` | Payment received or COD order accepted | Payment webhook / COD |
| `packed` | Warehouse has packed the order | Admin / warehouse system |
| `shipped` | Order picked up by courier | Shipping integration / admin |
| `delivered` | Order delivered to customer | Courier webhook / admin |
| `returned` | Return request approved, item collected | Returns flow |
| `refunded` | Refund processed to original payment method | Finance / payment gateway |

### Valid Transitions

```
pending     → confirmed | cancelled
confirmed   → packed | cancelled
packed      → shipped | cancelled
shipped     → delivered
delivered   → returned (within return window)
returned    → refunded
```

---

## Order Object

### `orders` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `order_number` | String | Human-readable (e.g. `ORD-2024-00182`) |
| `user_id` | UUID | FK to users |
| `status` | Enum | See states above |
| `subtotal` | Decimal | Sum of line items before discounts |
| `discount_amount` | Decimal | Coupon discount applied |
| `shipping_amount` | Decimal | Shipping charge |
| `tax_amount` | Decimal | GST amount |
| `total_amount` | Decimal | Final amount paid |
| `coupon_id` | UUID (nullable) | FK to coupons |
| `address_id` | UUID | FK to addresses (snapshot) |
| `payment_method` | Enum | `upi` \| `card` \| `netbanking` \| `cod` |
| `payment_status` | Enum | `pending` \| `paid` \| `failed` \| `refunded` |
| `tracking_number` | String | Courier tracking ID |
| `tracking_url` | String | Courier tracking page URL |
| `shipped_at` | Timestamp | |
| `delivered_at` | Timestamp | |
| `invoice_url` | String | S3 path to invoice PDF |
| `notes` | Text | Customer order notes |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### `order_items` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `order_id` | UUID | FK to orders |
| `product_id` | UUID | Snapshot |
| `variant_id` | UUID | Snapshot |
| `product_name` | String | Snapshot (in case product is edited) |
| `sku` | String | Snapshot |
| `color` | String | Snapshot |
| `size` | String | Snapshot |
| `quantity` | Integer | |
| `unit_price` | Decimal | Price at time of purchase |
| `total_price` | Decimal | unit_price × quantity |

---

## Returns & Refunds

### Return Eligibility

| Rule | Detail |
|------|--------|
| Return window | 7 days from delivered date |
| Eligible conditions | Unused, unwashed, original tags attached |
| Ineligible | Items marked "Final Sale", innerwear |
| Reason required | Customer must select a return reason |

### Return Reasons

- Wrong size
- Product not as described
- Defective / damaged
- Changed mind
- Received wrong item

### Return Flow

```
Customer requests return
        ↓
System checks eligibility (window, condition)
        ↓
Return request created (status: pending)
        ↓
Admin reviews and approves / rejects
        ↓
Pick-up scheduled (reverse logistics)
        ↓
Item collected and inspected
        ↓
Order status → Returned
        ↓
Refund initiated (original payment method)
        ↓
Order status → Refunded
        ↓
Customer notification sent
```

### Refund Timeline

| Payment Method | Refund Timeline |
|---------------|----------------|
| UPI | 5–7 business days |
| Card | 5–7 business days |
| Net Banking | 7–10 business days |
| COD | Bank transfer within 7 business days |

---

## Shipping Integration

The platform integrates with one or more shipping providers (e.g. Shiprocket, Delhivery, Bluedart).

### Shipping Workflow

1. When order status moves to `confirmed`, a shipment is created via the shipping API.
2. A tracking number and URL are saved to the order record.
3. The shipping provider sends webhook updates for status changes (in transit, out for delivery, delivered).
4. Each webhook update triggers an order status update and a customer notification.

### Shipping Cost Calculation

```
shipping_cost = base_rate + (total_weight_kg × per_kg_rate)

Free shipping threshold: orders ≥ ₹999 (configurable)
Express shipping: +₹99 flat (2–3 day delivery)
```

---

## Cancellations

- Orders can be cancelled by the customer while in `pending` or `confirmed` state.
- Admins can cancel orders in any state up to `shipped`.
- On cancellation with payment made: refund is automatically initiated.

---

## Loyalty Points on Orders

- Points are credited **after delivery** (not at order placement).
- Points are reversed if an order is returned/refunded.
- Points rate: 1 point per ₹10 spent (configurable by Super Admin).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List user's orders |
| GET | `/api/orders/:id` | Get order details |
| POST | `/api/orders/:id/cancel` | Cancel an order |
| GET | `/api/orders/:id/invoice` | Download invoice PDF |
| POST | `/api/orders/:id/return` | Initiate a return request |
| GET | `/api/admin/orders` | Admin: list all orders with filters |
| PUT | `/api/admin/orders/:id/status` | Admin: update order status |
| GET | `/api/admin/orders/:id` | Admin: full order details |

---

## Admin Order Management

Admins can:
- Filter orders by status, date range, customer, and payment method
- Bulk update order statuses (e.g. mark batch as shipped)
- Download order export as CSV
- View return requests and approve/reject
- Process manual refunds
- Add internal notes to orders
