# 09 — Wishlist

## Overview

The Wishlist module allows registered customers to save products they are interested in, share their wishlist with others, and move items to their cart when ready to purchase.

---

## Features

| Feature | Description |
|---------|-------------|
| Add product | Save any product variant to the wishlist |
| Remove product | Remove individual items |
| Move to cart | Add a wishlist item directly to the active cart |
| Share wishlist | Generate a public shareable link |
| Back-in-stock notification | Notify user when a wishlisted out-of-stock item restocks |
| Wishlist count badge | Live badge on the wishlist icon in the header |

---

## Business Rules

- One wishlist per customer account (a single default list).
- A product variant (specific size + colour) is saved, not just the base product.
- Duplicate variants are silently ignored (no error, no duplicate entry).
- Wishlisted items are **not reserved** — stock is not held.
- The wishlist persists indefinitely (no expiry).
- Guest users cannot use the wishlist; they are prompted to register.

---

## Wishlist Sharing

Customers can share their wishlist via a unique public URL:

```
https://shop.example.com/wishlist/share/{share_token}
```

- The share link shows product names, images, and prices in a read-only view.
- Anyone with the link can view the wishlist (no account required).
- The share token is regenerated each time the customer chooses to share.
- Sharing can be disabled (token invalidated) from the wishlist settings.

---

## Back-in-Stock Notifications

When a product variant in a customer's wishlist goes out of stock and subsequently **restocks**:

1. The `product.restocked` event is emitted by the inventory service.
2. The Notification service queries all wishlists containing that variant.
3. An email and/or push notification is dispatched to each subscribed customer.

Customers can opt out of back-in-stock notifications per item.

---

## Database Tables

### `wishlists`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `user_id` | UUID | FK to users (unique — one per user) |
| `share_token` | String | Nullable; public share identifier |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### `wishlist_items`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `wishlist_id` | UUID | FK to wishlists |
| `product_id` | UUID | FK to products |
| `variant_id` | UUID | FK to product_variants (specific size/colour) |
| `added_at` | Timestamp | |
| `notify_restock` | Boolean | Default: true |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/wishlist` | Get current user's wishlist |
| POST | `/api/wishlist/items` | Add item to wishlist |
| DELETE | `/api/wishlist/items/:variantId` | Remove item from wishlist |
| POST | `/api/wishlist/items/:variantId/move-to-cart` | Move item to cart |
| POST | `/api/wishlist/share` | Generate share link |
| DELETE | `/api/wishlist/share` | Invalidate share link |
| GET | `/api/wishlist/share/:token` | Public view of shared wishlist |

### POST `/api/wishlist/items`

```json
{
  "product_id": "uuid",
  "variant_id": "uuid"
}
```

### Response: GET `/api/wishlist`

```json
{
  "id": "uuid",
  "item_count": 3,
  "share_token": "abc123",
  "items": [
    {
      "id": "uuid",
      "product": {
        "id": "uuid",
        "name": "Classic Oversized Tee",
        "price": 999,
        "discount_price": 799,
        "image_url": "..."
      },
      "variant": {
        "id": "uuid",
        "color": "White",
        "size": "L",
        "in_stock": true
      },
      "added_at": "2024-11-01T10:00:00Z",
      "notify_restock": true
    }
  ]
}
```
