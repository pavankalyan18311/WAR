# 07 — AI Personalization Engine

## Overview

The Personalization Engine surfaces relevant products to each user based on their browsing behaviour, purchase history, wishlist, and similarity to other users. It powers homepage recommendations, "You might also like" carousels, and post-purchase suggestions.

---

## Recommendation Types

| Placement | Algorithm | Description |
|-----------|-----------|-------------|
| Homepage feed | Hybrid (collab + content) | Personalised "For You" section |
| Product Detail Page | Content-based similarity | "Similar Products" |
| Cart cross-sell | Collaborative filtering | "Others also bought" |
| Post-purchase email | Purchase history | Complementary items |
| Trending (cold-start) | Popularity-based | For new / anonymous users |

---

## Algorithms

### 1. Collaborative Filtering

Recommends products that users with similar purchase/browsing patterns also liked.

```
User A bought: [Oversized White Tee, Graphic Black Tee]
User B bought: [Oversized White Tee, ...]
→ Recommend: Graphic Black Tee to User B
```

**Implementation:** Matrix factorisation (ALS or SVD) on user–item interaction matrix.  
**Data:** Purchase events, wishlist additions, product views (weighted).

**Interaction weights:**

| Signal | Weight |
|--------|--------|
| Purchase | 5.0 |
| Add to wishlist | 3.0 |
| Add to cart (no purchase) | 2.0 |
| Product page view (>30s) | 1.0 |
| Product page view (<30s) | 0.3 |

---

### 2. Content-Based Filtering

Recommends products similar to what the user has viewed or purchased, based on product attributes and embeddings.

**Product embedding:** Combines:
- TF-IDF features from product name + description + tags
- Categorical features: category, colour, fabric, fit type
- Price normalised to range [0, 1]

Stored as 384-dimension vectors in **PGVector**.

```sql
-- Find top 10 products similar to a given product
SELECT id, name, price
FROM products
WHERE id != $product_id
ORDER BY embedding <=> (SELECT embedding FROM products WHERE id = $product_id)
LIMIT 10;
```

---

### 3. Hybrid Reranking

The final ranked list is a weighted blend of both signals:

```
final_score = (0.6 × collaborative_score) + (0.4 × content_score)
```

Weights can be adjusted per user segment:
- New users (< 3 interactions): `collaborative_weight = 0.0`, pure content-based
- Active users (10+ interactions): full hybrid blend

---

### 4. Cold-Start Fallback (Trending)

For new or anonymous users with no interaction history:

1. Show **trending products** (most views in last 7 days)
2. Show **bestsellers** (most purchases in last 30 days)
3. Show **new arrivals** (added in last 14 days)

---

## Personalisation Signals

| Signal | Source | Weight |
|--------|--------|--------|
| Purchase history | Order service | Highest |
| Wishlist additions | Wishlist service | High |
| Cart additions | Cart service | Medium-High |
| Product page views | Analytics events | Medium |
| Review ratings given | Reviews service | Medium |
| Size preferences | Size recommendation | Low |
| Category preferences | Derived from above | Low |

---

## Real-Time vs Batch

| Mode | Frequency | Use Case |
|------|-----------|----------|
| Batch recompute | Nightly (02:00) | Collaborative filter model retraining |
| Near-real-time cache update | Every 15 minutes | Trending products, new arrivals |
| Real-time similarity lookup | Per request | "Similar products" on PDP |

---

## A/B Testing Integration

The engine supports A/B experiments:

```json
{
  "experiment_id": "exp_homepage_2024_q4",
  "variant": "B",
  "algorithm": "content_only",
  "user_id": "uuid"
}
```

Experiment assignments are stored in Redis and evaluated post-analysis for click-through and conversion lift.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recommendations/homepage` | Personalised homepage feed |
| GET | `/api/recommendations/similar/:productId` | Similar products |
| GET | `/api/recommendations/cart` | Cart cross-sell suggestions |
| GET | `/api/recommendations/trending` | Trending / cold-start fallback |
| POST | `/api/recommendations/feedback` | Log click/dismiss signal |

### Response: `GET /api/recommendations/homepage`

```json
{
  "user_id": "uuid",
  "algorithm": "hybrid",
  "recommendations": [
    {
      "product_id": "uuid",
      "name": "Classic Oversized Tee",
      "price": 999,
      "discount_price": 799,
      "image_url": "...",
      "score": 0.92,
      "reason": "Based on your recent purchases"
    }
  ],
  "generated_at": "2024-11-01T10:00:00Z"
}
```

---

## Database Tables

### `recommendations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `user_id` | UUID | |
| `product_id` | UUID | |
| `score` | Float | Ranking score |
| `algorithm` | String | `collaborative` \| `content` \| `hybrid` \| `trending` |
| `context` | String | `homepage` \| `pdp` \| `cart` \| `email` |
| `shown_at` | Timestamp | When recommendation was displayed |
| `clicked_at` | Timestamp | When user clicked (nullable) |
| `purchased_at` | Timestamp | When user purchased (nullable) |
