# 08 — Reviews & Moderation

## Overview

The Reviews module allows customers to rate and review products with text, photos, or videos. Reviews go through an AI spam detection pre-filter followed by optional manual approval before being published on the storefront.

---

## Review Types

| Type | Description | Max Size |
|------|-------------|----------|
| Text | Written review with star rating | 2000 characters |
| Photo | Text review + up to 5 photos | 5 MB per photo |
| Video | Text review + one video | 50 MB, max 60 seconds |

---

## Rating System

- **Scale:** 1–5 stars (integers only)
- **Aggregate:** Product rating = average of all approved reviews
- **Distribution:** Star breakdown shown on product page (% per star level)
- **Minimum:** A review must include at least a star rating. Text is optional but recommended.

---

## Review Eligibility

| Rule | Description |
|------|-------------|
| Verified Purchase | Only customers who ordered the product can leave a review |
| One review per product per user | Customers may edit but not duplicate |
| Review window | Reviews can be left within 180 days of delivery |
| After return | Customers who returned the item may still leave a review |

---

## Submission Flow

```
Customer submits review
        │
        ▼
Eligibility check (verified purchase)
        │
        ▼
AI Spam Detection
        │
    ┌───┴───┐
    │       │
   Pass    Fail
    │       │
    ▼       ▼
Manual    Auto-
Review    Reject
Queue     (logged)
    │
    ▼
Admin Approves / Rejects
    │
    ▼
Published on Product Page
```

---

## AI Spam Detection

The AI moderation model classifies each incoming review before it reaches the manual queue.

### Classification Labels

| Label | Action |
|-------|--------|
| `ham` | Pass — forward to manual review queue (or auto-approve if confidence > 0.95) |
| `spam` | Auto-reject — review not queued for manual review |
| `abusive` | Auto-reject + flag user account for review |
| `off_topic` | Flag for manual review with low priority |

### Detection Signals

- Repeated characters, excessive punctuation
- Promotional content or competitor mentions
- Profanity and hate speech detection
- Sentiment anomaly (5-star text with very negative language)
- Duplicate content detection (same review across multiple products)
- Account age and order history heuristics

### Confidence Threshold

- `confidence ≥ 0.95` AND `label = ham` → **Auto-approve** (skip manual queue)
- `confidence ≥ 0.90` AND `label = spam` → **Auto-reject**
- All other cases → **Manual review queue**

---

## Manual Moderation

Admins see a moderation dashboard with:

- Review content (text + media)
- Product name and purchase verification status
- AI label and confidence score
- Quick actions: **Approve**, **Reject**, **Request Edit**, **Flag User**

---

## Media Handling

Photos and videos are:
1. Uploaded directly to S3 via pre-signed URL
2. Scanned for NSFW content (automated)
3. Compressed and optimised (images resized to max 1200px width)
4. Served via CDN

Media paths:
```
reviews/{product_id}/{review_id}/photo_{1..5}.jpg
reviews/{product_id}/{review_id}/video.mp4
```

---

## Verified Purchase Badge

Reviews from customers with a confirmed delivery of the product show a **"Verified Purchase"** badge, increasing review credibility.

---

## Review Display on Storefront

- Sorted by: Most Recent | Most Helpful | Highest Rated | Lowest Rated
- Helpful voting: users can mark reviews as helpful (increments `helpful_count`)
- Pagination: 10 reviews per page
- Filtering: by star rating, media presence, verified purchase

---

## Database Table: `reviews`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `product_id` | UUID | FK to products |
| `user_id` | UUID | FK to users |
| `order_id` | UUID | For verified purchase check |
| `rating` | Integer | 1–5 |
| `title` | String | Short headline |
| `body` | Text | Review text |
| `media_urls` | JSONB | Array of S3 photo/video URLs |
| `status` | Enum | `pending` \| `approved` \| `rejected` |
| `ai_label` | String | `ham` \| `spam` \| `abusive` \| `off_topic` |
| `ai_confidence` | Float | 0.0–1.0 |
| `helpful_count` | Integer | Helpful vote count |
| `is_verified_purchase` | Boolean | |
| `created_at` | Timestamp | |
| `approved_at` | Timestamp | |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reviews` | Submit a review (auth required) |
| GET | `/api/reviews/product/:productId` | Get approved reviews for a product |
| PUT | `/api/reviews/:id` | Edit own review (auth required) |
| DELETE | `/api/reviews/:id` | Delete own review (auth required) |
| POST | `/api/reviews/:id/helpful` | Vote review as helpful |
| GET | `/api/admin/reviews/queue` | Moderation queue (admin only) |
| PUT | `/api/admin/reviews/:id/approve` | Approve a review (admin only) |
| PUT | `/api/admin/reviews/:id/reject` | Reject a review (admin only) |
