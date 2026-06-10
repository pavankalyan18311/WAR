# 16 — Database Design

## Overview

The platform uses **PostgreSQL** as the primary relational database with the **PGVector** extension for semantic search. This document covers all 18+ core tables, their schemas, relationships, and indexing strategy.

---

## Entity Relationship Overview

```
users
  ├── addresses (1:N)
  ├── orders (1:N)
  │     └── order_items (1:N)
  ├── wishlists (1:1)
  │     └── wishlist_items (1:N)
  ├── reviews (1:N)
  ├── reward_points (1:N)
  ├── chat_sessions (1:N)
  │     └── chat_messages (1:N)
  ├── virtual_try_ons (1:N)
  └── recommendations (1:N)

products
  ├── categories (N:1)
  ├── product_images (1:N)
  ├── product_variants (1:N)
  ├── reviews (1:N)
  ├── wishlist_items (1:N)
  └── recommendations (1:N)

orders
  ├── payments (1:1)
  ├── coupons (N:1)
  └── notifications (1:N)
```

---

## Table Schemas

### `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `name` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `phone` | VARCHAR(15) | UNIQUE |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | ENUM('guest','customer','admin','super_admin') | DEFAULT 'customer' |
| `status` | ENUM('active','suspended','unverified') | DEFAULT 'unverified' |
| `email_verified_at` | TIMESTAMPTZ | |
| `avatar_url` | TEXT | |
| `date_of_birth` | DATE | |
| `gender` | ENUM('male','female','other') | |
| `loyalty_tier` | ENUM('bronze','silver','gold') | DEFAULT 'bronze' |
| `referral_code` | VARCHAR(20) | UNIQUE |
| `referred_by_user_id` | UUID | FK users(id) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Indexes:** `email`, `phone`, `referral_code`, `role`, `status`

---

### `categories`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `name` | VARCHAR(100) | NOT NULL |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL |
| `description` | TEXT | |
| `parent_id` | UUID | FK categories(id), nullable |
| `image_url` | TEXT | |
| `sort_order` | INTEGER | DEFAULT 0 |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | |

---

### `products`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `category_id` | UUID | FK categories(id) |
| `name` | VARCHAR(255) | NOT NULL |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL |
| `description` | TEXT | |
| `price` | DECIMAL(10,2) | NOT NULL |
| `discount_price` | DECIMAL(10,2) | |
| `discount_starts_at` | TIMESTAMPTZ | |
| `discount_ends_at` | TIMESTAMPTZ | |
| `fabric` | VARCHAR(100) | |
| `material` | VARCHAR(100) | |
| `fit_type` | ENUM('oversized','regular','slim','relaxed') | |
| `weight_grams` | INTEGER | |
| `tags` | TEXT[] | |
| `status` | ENUM('active','draft','archived') | DEFAULT 'draft' |
| `is_featured` | BOOLEAN | DEFAULT FALSE |
| `seo_title` | VARCHAR(255) | |
| `seo_description` | TEXT | |
| `embedding` | VECTOR(384) | PGVector; for semantic search |
| `search_vector` | TSVECTOR | For full-text search |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `category_id`, `status`, `is_featured`, GIN(`tags`), GIN(`search_vector`), HNSW(`embedding`)

---

### `product_variants`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `product_id` | UUID | FK products(id) ON DELETE CASCADE |
| `sku` | VARCHAR(100) | UNIQUE, NOT NULL |
| `color` | VARCHAR(50) | |
| `color_hex` | VARCHAR(7) | |
| `size` | ENUM('XS','S','M','L','XL','XXL','3XL') | |
| `stock_quantity` | INTEGER | DEFAULT 0 |
| `low_stock_threshold` | INTEGER | DEFAULT 10 |
| `price_override` | DECIMAL(10,2) | nullable |
| `is_active` | BOOLEAN | DEFAULT TRUE |

**Indexes:** `product_id`, `sku`, `size`, `color`

---

### `product_images`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `product_id` | UUID | FK products(id) ON DELETE CASCADE |
| `url` | TEXT | NOT NULL |
| `type` | ENUM('primary','secondary','360','thumbnail') | |
| `sort_order` | INTEGER | DEFAULT 0 |
| `alt_text` | VARCHAR(255) | |

---

### `addresses`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK users(id) ON DELETE CASCADE |
| `full_name` | VARCHAR(100) | NOT NULL |
| `phone` | VARCHAR(15) | NOT NULL |
| `address_line_1` | TEXT | NOT NULL |
| `address_line_2` | TEXT | |
| `city` | VARCHAR(100) | NOT NULL |
| `state` | VARCHAR(100) | NOT NULL |
| `pincode` | VARCHAR(10) | NOT NULL |
| `country` | VARCHAR(50) | DEFAULT 'India' |
| `is_default` | BOOLEAN | DEFAULT FALSE |
| `created_at` | TIMESTAMPTZ | |

---

### `orders`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `order_number` | VARCHAR(30) | UNIQUE, NOT NULL |
| `user_id` | UUID | FK users(id) |
| `status` | ENUM('pending','confirmed','packed','shipped','delivered','returned','refunded','cancelled') | |
| `subtotal` | DECIMAL(10,2) | |
| `discount_amount` | DECIMAL(10,2) | DEFAULT 0 |
| `shipping_amount` | DECIMAL(10,2) | DEFAULT 0 |
| `tax_amount` | DECIMAL(10,2) | DEFAULT 0 |
| `total_amount` | DECIMAL(10,2) | NOT NULL |
| `coupon_id` | UUID | FK coupons(id), nullable |
| `address_snapshot` | JSONB | Snapshot of address at order time |
| `payment_method` | ENUM('upi','card','netbanking','cod') | |
| `payment_status` | ENUM('pending','paid','failed','refunded') | DEFAULT 'pending' |
| `tracking_number` | VARCHAR(100) | |
| `tracking_url` | TEXT | |
| `notes` | TEXT | |
| `invoice_url` | TEXT | |
| `shipped_at` | TIMESTAMPTZ | |
| `delivered_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() |

**Indexes:** `user_id`, `status`, `payment_status`, `order_number`, `created_at`

---

### `order_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `order_id` | UUID | FK orders(id) ON DELETE CASCADE |
| `product_id` | UUID | FK products(id) |
| `variant_id` | UUID | FK product_variants(id) |
| `product_name` | VARCHAR(255) | Snapshot |
| `sku` | VARCHAR(100) | Snapshot |
| `color` | VARCHAR(50) | Snapshot |
| `size` | VARCHAR(10) | Snapshot |
| `quantity` | INTEGER | NOT NULL |
| `unit_price` | DECIMAL(10,2) | Snapshot |
| `total_price` | DECIMAL(10,2) | |

---

### `payments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `order_id` | UUID | FK orders(id), UNIQUE |
| `gateway` | VARCHAR(50) | e.g. 'razorpay','payumoney' |
| `gateway_order_id` | VARCHAR(100) | Gateway's reference |
| `gateway_payment_id` | VARCHAR(100) | |
| `amount` | DECIMAL(10,2) | |
| `currency` | VARCHAR(5) | DEFAULT 'INR' |
| `status` | ENUM('pending','completed','failed','refunded') | |
| `paid_at` | TIMESTAMPTZ | |
| `refunded_at` | TIMESTAMPTZ | |
| `refund_reference` | VARCHAR(100) | |

---

### `coupons`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `code` | VARCHAR(30) | UNIQUE, NOT NULL |
| `type` | ENUM('percentage','flat_amount','free_shipping','buy_x_get_y') | |
| `value` | DECIMAL(10,2) | |
| `min_order_value` | DECIMAL(10,2) | DEFAULT 0 |
| `max_uses` | INTEGER | |
| `uses_count` | INTEGER | DEFAULT 0 |
| `max_uses_per_user` | INTEGER | DEFAULT 1 |
| `valid_from` | TIMESTAMPTZ | |
| `valid_until` | TIMESTAMPTZ | |
| `first_order_only` | BOOLEAN | DEFAULT FALSE |
| `applicable_category_ids` | UUID[] | |
| `applicable_product_ids` | UUID[] | |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | |

---

### `reviews`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `product_id` | UUID | FK products(id) |
| `user_id` | UUID | FK users(id) |
| `order_id` | UUID | FK orders(id) |
| `rating` | SMALLINT | CHECK (1–5) |
| `title` | VARCHAR(100) | |
| `body` | TEXT | |
| `media_urls` | JSONB | Array of S3 URLs |
| `status` | ENUM('pending','approved','rejected') | DEFAULT 'pending' |
| `ai_label` | VARCHAR(20) | |
| `ai_confidence` | REAL | |
| `is_verified_purchase` | BOOLEAN | DEFAULT FALSE |
| `helpful_count` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | |
| `approved_at` | TIMESTAMPTZ | |

**Indexes:** `product_id`, `user_id`, `status`, `rating`

---

### `wishlists`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK users(id), UNIQUE |
| `share_token` | VARCHAR(64) | UNIQUE, nullable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `wishlist_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `wishlist_id` | UUID | FK wishlists(id) |
| `product_id` | UUID | FK products(id) |
| `variant_id` | UUID | FK product_variants(id) |
| `notify_restock` | BOOLEAN | DEFAULT TRUE |
| `added_at` | TIMESTAMPTZ | |

**UNIQUE constraint:** (`wishlist_id`, `variant_id`)

---

### `reward_points`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK users(id) |
| `type` | ENUM('earn','redeem','expire','bonus','referral','reversal') | |
| `amount` | INTEGER | Positive = earn; negative = deduct |
| `balance_after` | INTEGER | Running balance |
| `reference_id` | UUID | nullable |
| `description` | VARCHAR(255) | |
| `earned_at` | TIMESTAMPTZ | DEFAULT NOW() |
| `expires_at` | TIMESTAMPTZ | |

---

### `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK users(id) |
| `type` | VARCHAR(60) | e.g. 'order.shipped' |
| `channel` | ENUM('email','push','sms') | |
| `title` | VARCHAR(255) | |
| `body` | TEXT | |
| `data` | JSONB | |
| `status` | ENUM('queued','sent','failed') | |
| `sent_at` | TIMESTAMPTZ | |
| `read_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

---

### `virtual_try_ons`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | nullable |
| `session_id` | VARCHAR(100) | Guest session |
| `product_id` | UUID | FK products(id) |
| `status` | ENUM('queued','processing','completed','failed') | |
| `input_photo_url` | TEXT | |
| `measurements` | JSONB | |
| `output_front_url` | TEXT | |
| `output_side_url` | TEXT | |
| `output_back_url` | TEXT | |
| `error_message` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | NOW() + 30 days |

---

### `chat_sessions`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | nullable |
| `session_token` | VARCHAR(100) | UNIQUE |
| `started_at` | TIMESTAMPTZ | |
| `ended_at` | TIMESTAMPTZ | |

### `chat_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `session_id` | UUID | FK chat_sessions(id) |
| `role` | ENUM('user','assistant') | |
| `content` | TEXT | |
| `intent` | VARCHAR(50) | |
| `retrieved_context` | JSONB | |
| `created_at` | TIMESTAMPTZ | |

---

### `recommendations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK users(id) |
| `product_id` | UUID | FK products(id) |
| `score` | REAL | |
| `algorithm` | VARCHAR(30) | |
| `context` | VARCHAR(30) | |
| `shown_at` | TIMESTAMPTZ | |
| `clicked_at` | TIMESTAMPTZ | |
| `purchased_at` | TIMESTAMPTZ | |

---

## Indexing Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| products | search_vector | GIN | Full-text search |
| products | embedding | HNSW | Semantic similarity |
| products | (category_id, status) | BTREE | Category browsing |
| orders | (user_id, created_at) | BTREE | Order history |
| orders | status | BTREE | Admin filtering |
| reviews | (product_id, status) | BTREE | Product reviews |
| reward_points | (user_id, expires_at) | BTREE | Expiry queries |
| notifications | (user_id, read_at) | BTREE | Unread count |

---

## Migration Strategy

- Migrations managed via **TypeORM migrations** or **Flyway**.
- All schema changes go through versioned migration files.
- Migrations are run automatically in CI/CD before deployment.
- Rollback migration files required for every forward migration.
