# 17 — API Specifications

## Overview

All APIs follow RESTful conventions over HTTPS. Requests and responses use JSON. Authentication is via Bearer JWT in the `Authorization` header unless stated otherwise.

---

## Base URL

```
Production:  https://api.yourdomain.com/v1
Staging:     https://api-staging.yourdomain.com/v1
Development: http://localhost:3000/v1
```

---

## Common Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
X-Request-ID: <uuid>          (optional; for tracing)
```

---

## Standard Response Envelope

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 154,
    "total_pages": 8
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The email field is required.",
    "details": [
      { "field": "email", "message": "email is required" }
    ]
  }
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — resource created |
| 204 | No Content — successful delete |
| 400 | Bad Request — validation error |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource not found |
| 409 | Conflict — duplicate resource |
| 422 | Unprocessable Entity — business logic error |
| 429 | Too Many Requests — rate limit exceeded |
| 500 | Internal Server Error |

---

## Auth APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register new customer |
| POST | `/auth/login` | None | Login and receive tokens |
| POST | `/auth/logout` | Bearer | Logout and revoke token |
| POST | `/auth/refresh` | Cookie | Refresh access token |
| GET | `/auth/verify-email` | None | Verify email from link |
| POST | `/auth/forgot-password` | None | Send password reset email |
| POST | `/auth/reset-password` | None | Reset password with token |
| GET | `/auth/me` | Bearer | Get own profile |
| PUT | `/auth/me` | Bearer | Update own profile |

### POST `/auth/register`

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
    "access_token": "eyJ...",
    "expires_in": 900
  }
}
```

---

## Product APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | None | List products with filters |
| GET | `/products/:id` | None | Get product details |
| GET | `/products/:id/variants` | None | Get product variants |
| GET | `/products/:id/reviews` | None | Get product reviews |
| GET | `/products/search` | None | Full-text + semantic search |
| POST | `/admin/products` | Admin | Create product |
| PUT | `/admin/products/:id` | Admin | Update product |
| DELETE | `/admin/products/:id` | Admin | Archive product |
| POST | `/admin/products/import` | Admin | Bulk CSV import |

### GET `/products`

**Query Parameters:**

| Param | Type | Example |
|-------|------|---------|
| `category` | string | `oversized-t-shirts` |
| `color` | string | `black,white` |
| `size` | string | `M,L,XL` |
| `min_price` | number | `499` |
| `max_price` | number | `1999` |
| `in_stock` | boolean | `true` |
| `sort` | string | `price_asc\|price_desc\|newest\|popular` |
| `page` | number | `1` |
| `limit` | number | `20` (max 100) |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Classic Oversized Tee",
      "slug": "classic-oversized-tee",
      "price": 999,
      "discount_price": 799,
      "primary_image_url": "https://cdn.../image.jpg",
      "category": { "id": "uuid", "name": "Oversized T-Shirts" },
      "average_rating": 4.3,
      "review_count": 128,
      "is_in_stock": true,
      "available_sizes": ["S", "M", "L", "XL"]
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 84 }
}
```

---

## Cart APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | Optional | Get current cart |
| POST | `/cart/items` | Optional | Add item to cart |
| PUT | `/cart/items/:id` | Optional | Update item quantity |
| DELETE | `/cart/items/:id` | Optional | Remove item |
| POST | `/cart/coupon` | Optional | Apply coupon |
| DELETE | `/cart/coupon` | Optional | Remove coupon |

---

## Order APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/checkout/place-order` | Bearer | Place order |
| GET | `/orders` | Bearer | List user orders |
| GET | `/orders/:id` | Bearer | Order detail |
| POST | `/orders/:id/cancel` | Bearer | Cancel order |
| POST | `/orders/:id/return` | Bearer | Initiate return |
| GET | `/orders/:id/invoice` | Bearer | Download invoice |
| GET | `/admin/orders` | Admin | All orders |
| PUT | `/admin/orders/:id/status` | Admin | Update status |

### POST `/checkout/place-order`

**Request:**
```json
{
  "address_id": "uuid",
  "payment_method": "upi",
  "coupon_code": "WELCOME20",
  "use_loyalty_points": 500,
  "notes": "Please pack carefully"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-2024-00182",
    "total_amount": 899,
    "payment_intent": {
      "gateway": "razorpay",
      "order_id": "rzp_ord_xxx",
      "key": "rzp_live_xxx"
    }
  }
}
```

---

## Review APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products/:id/reviews` | None | Get product reviews |
| POST | `/reviews` | Bearer | Submit review |
| PUT | `/reviews/:id` | Bearer | Edit own review |
| DELETE | `/reviews/:id` | Bearer | Delete own review |
| POST | `/reviews/:id/helpful` | Bearer | Vote helpful |
| GET | `/admin/reviews/queue` | Admin | Moderation queue |
| PUT | `/admin/reviews/:id/approve` | Admin | Approve review |
| PUT | `/admin/reviews/:id/reject` | Admin | Reject review |

---

## Chatbot APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/chat/message` | Optional | Send message |
| GET | `/chat/sessions` | Bearer | Chat history |
| GET | `/chat/sessions/:id` | Bearer | Session transcript |
| DELETE | `/chat/sessions/:id` | Bearer | Delete session |

### POST `/chat/message`

**Request:**
```json
{
  "session_id": "sess_abc123",
  "message": "I need a casual tee under ₹1000"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123",
    "reply": "Here are some great casual tees under ₹1000!",
    "intent": "product_discovery",
    "products": [
      {
        "id": "uuid",
        "name": "Graphic Tee",
        "price": 799,
        "image_url": "...",
        "url": "/products/graphic-tee"
      }
    ],
    "actions": [
      { "label": "View Product", "action": "navigate", "url": "/products/graphic-tee" },
      { "label": "Try On", "action": "open_tryon", "product_id": "uuid" }
    ]
  }
}
```

---

## Virtual Try-On APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/try-on/initiate` | Optional | Start try-on job |
| GET | `/try-on/:jobId/status` | Optional | Poll job status |
| GET | `/try-on/:jobId/results` | Optional | Get result URLs |
| GET | `/try-on/history` | Bearer | User's try-on history |
| DELETE | `/try-on/:jobId` | Optional | Delete session |

### POST `/try-on/initiate`

**Request (multipart/form-data):**
```
photo: <image file>
product_id: uuid
measurements: {"height_cm": 178, "weight_kg": 72, "chest_cm": 98}
```

**Response 202:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz",
    "status": "queued",
    "estimated_seconds": 20,
    "poll_url": "/try-on/job_xyz/status"
  }
}
```

### GET `/try-on/:jobId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "job_xyz",
    "status": "completed",
    "progress_percent": 100
  }
}
```

---

## Size Recommendation APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/size-recommendation` | Optional | Get size recommendation |
| GET | `/size-recommendation/history` | Bearer | Past recommendations |
| POST | `/size-recommendation/feedback` | Bearer | Confirm/reject recommendation |

---

## Wishlist APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/wishlist` | Bearer | Get wishlist |
| POST | `/wishlist/items` | Bearer | Add to wishlist |
| DELETE | `/wishlist/items/:variantId` | Bearer | Remove from wishlist |
| POST | `/wishlist/items/:variantId/move-to-cart` | Bearer | Move to cart |
| POST | `/wishlist/share` | Bearer | Generate share link |
| GET | `/wishlist/share/:token` | None | Public wishlist view |

---

## Loyalty APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/loyalty/balance` | Bearer | Points balance + tier |
| GET | `/loyalty/transactions` | Bearer | Transaction history |
| GET | `/loyalty/referral` | Bearer | Referral code + stats |

---

## Notification APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Bearer | Notification inbox |
| PUT | `/notifications/:id/read` | Bearer | Mark as read |
| PUT | `/notifications/read-all` | Bearer | Mark all as read |
| GET | `/notifications/preferences` | Bearer | Get preferences |
| PUT | `/notifications/preferences` | Bearer | Update preferences |

---

## Address APIs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/addresses` | Bearer | List addresses |
| POST | `/addresses` | Bearer | Add address |
| PUT | `/addresses/:id` | Bearer | Update address |
| DELETE | `/addresses/:id` | Bearer | Delete address |
| PUT | `/addresses/:id/default` | Bearer | Set as default |

---

## Pagination

All list endpoints support cursor-based or offset pagination:

```
GET /products?page=2&limit=20
```

Response includes `meta.page`, `meta.limit`, `meta.total`, `meta.total_pages`.

---

## Versioning

API version is included in the URL path (`/v1/`). Breaking changes increment the version. Old versions are supported for 12 months after a new version is released.

---

## Rate Limits

Rate limit headers are returned on all responses:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1700000060
```

On breach, HTTP 429 is returned with a `Retry-After` header.
