# 03 — Product Catalog

## Overview

The Product Catalog module manages all product data across five men's fashion categories. It handles product creation, attribute management, inventory tracking, media assets, search indexing, and discount pricing.

---

## Product Categories

| ID | Category | Description |
|----|----------|-------------|
| 1 | Oversized T-Shirts | Relaxed, dropped-shoulder fits |
| 2 | Regular Fit T-Shirts | Classic everyday silhouettes |
| 3 | Polo T-Shirts | Collar polo styles |
| 4 | Graphic T-Shirts | Printed / illustrated designs |
| 5 | Premium Collection | Elevated fabrics and finishing |

Categories support a parent–child hierarchy for future expansion (e.g. Premium > Linen, Premium > Pima Cotton).

---

## Product Attributes

### Core Attributes

| Field | Type | Description |
|-------|------|-------------|
| `product_id` | UUID | Primary identifier |
| `sku` | String | Stock-keeping unit (unique) |
| `name` | String | Display name |
| `slug` | String | URL-friendly identifier |
| `description` | Text | Full HTML/Markdown description |
| `price` | Decimal | Base retail price |
| `discount_price` | Decimal | Sale / promotional price (nullable) |
| `category_id` | FK → categories | Product category |
| `status` | Enum | `active` \| `draft` \| `archived` |
| `created_at` | Timestamp | |
| `updated_at` | Timestamp | |

### Physical & Fit Attributes

| Field | Type | Description |
|-------|------|-------------|
| `color` | String / Enum | Colour name (and hex code) |
| `size` | Enum | `XS` \| `S` \| `M` \| `L` \| `XL` \| `XXL` \| `3XL` |
| `fabric` | String | e.g. "100% Cotton", "Cotton-Polyester blend" |
| `material` | String | Additional material detail |
| `weight` | Decimal (grams) | Fabric GSM or garment weight |
| `fit_type` | Enum | `oversized` \| `regular` \| `slim` \| `relaxed` |

### Inventory

| Field | Type | Description |
|-------|------|-------------|
| `stock_quantity` | Integer | Current available stock |
| `low_stock_threshold` | Integer | Alert trigger level (default: 10) |
| `is_in_stock` | Boolean | Computed from stock_quantity |

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `tags` | String[] | Searchable tags (e.g. `["summer", "casual"]`) |
| `seo_title` | String | Override for page title |
| `seo_description` | String | Meta description |

---

## Product Variants

Each product can have multiple **variants** based on size and colour combinations.

```
Product: "Classic Oversized Tee"
  └── Variant: White / M  (SKU: COT-WHT-M)  stock: 45
  └── Variant: White / L  (SKU: COT-WHT-L)  stock: 32
  └── Variant: Black / M  (SKU: COT-BLK-M)  stock: 18
  └── Variant: Black / L  (SKU: COT-BLK-L)  stock: 0  ← out of stock
```

**Variant table:** `product_variants`

| Field | Type |
|-------|------|
| `variant_id` | UUID |
| `product_id` | FK |
| `sku` | String (unique) |
| `color` | String |
| `size` | Enum |
| `stock_quantity` | Integer |
| `price_override` | Decimal (nullable) |

---

## Media Assets

### Image Types

| Type | Description | Recommended Resolution |
|------|-------------|----------------------|
| Primary Image | Main product listing image | 1200 × 1400 px |
| Secondary Images | Additional angles (up to 8) | 1200 × 1400 px |
| 360° Images | Rotational sequence (36 frames) | 800 × 800 px each |
| Thumbnail | Listing card image | 400 × 467 px |

### Video

| Field | Description |
|-------|-------------|
| Product Video | Up to 60s, MP4, used on PDP |
| Styling Video | Optional lookbook/styling video |

### Storage

All assets stored in **S3-compatible object storage** under structured paths:

```
products/{product_id}/primary.jpg
products/{product_id}/secondary/{1..8}.jpg
products/{product_id}/360/{001..036}.jpg
products/{product_id}/video.mp4
```

CDN is placed in front of S3 for cached delivery.

---

## Search & Filtering

### Search Capabilities

| Type | Implementation |
|------|---------------|
| Full-text search | PostgreSQL `tsvector` on name + description + tags |
| Attribute filters | Indexed columns: category, color, size, price range, fabric |
| Relevance ranking | ts_rank + manual boost for new/featured products |
| Semantic search | PGVector embeddings for AI chatbot product discovery |

### Filter Parameters

```
GET /api/products?
  category=oversized-t-shirts
  &color=black
  &size=L,XL
  &min_price=499
  &max_price=1999
  &in_stock=true
  &sort=price_asc|price_desc|newest|popular
  &page=1
  &limit=20
```

---

## Discount & Pricing Logic

```
Final Price = discount_price ?? price

Discount % = ((price - discount_price) / price) × 100
```

- Discounts can be set at the product level or variant level.
- Time-limited sales are managed via `discount_starts_at` and `discount_ends_at` timestamps.
- Coupons are applied at checkout (not at the catalog level).

---

## Admin Capabilities

| Action | Description |
|--------|-------------|
| Create product | Add new product with all attributes |
| Edit product | Update any attribute, price, or media |
| Archive product | Soft-delete; hidden from storefront |
| Bulk import | CSV import for bulk product creation |
| Manage inventory | Adjust stock quantities |
| Feature product | Mark as "featured" for homepage display |
| Reorder categories | Sort order for category listing pages |

---

## Events Emitted

| Event | Trigger | Consumers |
|-------|---------|-----------|
| `product.created` | New product published | Search indexer, recommendation engine |
| `product.updated` | Product edited | Search re-index |
| `product.low_stock` | Stock hits threshold | Notification service (admin alert) |
| `product.out_of_stock` | Stock reaches 0 | Notification service (wishlist subscribers) |
