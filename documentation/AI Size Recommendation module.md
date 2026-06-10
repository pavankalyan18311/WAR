# 06 — AI Size Recommendation

## Overview

The Size Recommendation module predicts the best-fit garment size for a customer using their body measurements. It returns a primary size recommendation with a confidence score, plus alternative sizes — helping customers order the right size and reducing returns.

---

## Inputs

| Input | Type | Required | Notes |
|-------|------|----------|-------|
| Height | cm (Float) | Recommended | Strong predictor for T-shirt length |
| Weight | kg (Float) | Optional | Informs body mass estimation |
| Body Type | Enum | Optional | `slim` \| `athletic` \| `regular` \| `broad` |
| Chest circumference | cm (Float) | Recommended | Highest-impact measurement for shirts |
| Shoulder width | cm (Float) | Optional | Improves accuracy for oversized styles |
| Product category | Enum | System | Affects size chart used |
| Fit type | Enum | System | `oversized` \| `regular` \| `slim` |

---

## Outputs

```json
{
  "recommended_size": "L",
  "confidence_score": 0.91,
  "alternative_sizes": ["M", "XL"],
  "fit_notes": "L gives a comfortable regular fit. If you prefer a looser feel, try XL.",
  "size_chart": {
    "S":  { "chest_cm": "86–91",  "length_cm": "69" },
    "M":  { "chest_cm": "91–96",  "length_cm": "71" },
    "L":  { "chest_cm": "96–101", "length_cm": "73" },
    "XL": { "chest_cm": "101–106","length_cm": "75" },
    "XXL":{ "chest_cm": "106–111","length_cm": "77" }
  }
}
```

---

## Recommendation Logic

### Two-Layer Approach

#### Layer 1: Rule-Based Engine

Direct lookup against per-product size charts based on chest and height measurements.

```
IF chest < 91cm  → S
IF chest 91–96cm → M
IF chest 96–101cm→ L
IF chest > 101cm → XL
```

Rule-based results have a fixed confidence of **0.70** and serve as the fallback.

#### Layer 2: ML Model

A gradient-boosted or neural network model trained on:

- Historical order data
- Customer measurements at time of purchase
- Return events labelled with reason (size-related returns)

**Features:**
- `height`, `weight`, `chest`, `shoulder_width`, `body_type`
- `category_id`, `fit_type`, `fabric_code`
- `brand_size_tendency` (brand-level size calibration factor)

**Output:** Probability distribution over all sizes (XS through 3XL)

The ML model takes precedence over the rule-based engine when confidence ≥ 0.75.

---

## Confidence Score

The confidence score (0.0–1.0) reflects how certain the model is about the recommendation.

| Confidence Range | Label | UI Treatment |
|-----------------|-------|-------------|
| 0.85–1.00 | High | "Great fit — we're very confident" |
| 0.70–0.84 | Medium | "Good fit — based on your measurements" |
| 0.50–0.69 | Low | "Estimated fit — you may want to check the size chart" |
| < 0.50 | Uncertain | "Insufficient data — see size chart" |

---

## Alternative Sizes

Always return 1–2 alternative sizes with reasoning:

```json
"alternatives": [
  {
    "size": "M",
    "note": "If you prefer a slimmer look"
  },
  {
    "size": "XL",
    "note": "If you prefer an oversized feel"
  }
]
```

---

## Return-Rate Feedback Loop

When a return is processed with reason `wrong_size`:

1. The return event is logged with the customer's stated correct size.
2. This data feeds back into the ML model retraining pipeline (weekly batch job).
3. Products with consistently high size-related return rates trigger an alert for product team review.

---

## Fit Profiles

For customers who have ordered before, the system builds a **Fit Profile**:

```json
{
  "user_id": "uuid",
  "preferred_sizes": {
    "oversized": "L",
    "regular": "M",
    "slim": "M"
  },
  "confirmed_fit_count": 7,
  "last_return_reason": null
}
```

When a Fit Profile exists, it boosts recommendation confidence.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/size-recommendation` | Get size recommendation |
| GET | `/api/size-recommendation/history` | User's past recommendations (auth) |
| POST | `/api/size-recommendation/feedback` | User confirms or rejects recommendation |

### Request: `POST /api/size-recommendation`

```json
{
  "product_id": "uuid",
  "measurements": {
    "height_cm": 178,
    "weight_kg": 72,
    "chest_cm": 98,
    "body_type": "athletic"
  }
}
```

### Response

```json
{
  "product_id": "uuid",
  "recommended_size": "L",
  "confidence_score": 0.91,
  "confidence_label": "High",
  "fit_notes": "L gives a great regular fit for your chest measurement.",
  "alternative_sizes": [
    { "size": "M", "note": "For a slimmer look" },
    { "size": "XL", "note": "For an oversized feel" }
  ],
  "size_chart": { ... }
}
```

---

## Integration Points

| System | Integration |
|--------|-------------|
| Product Detail Page (PDP) | "Find My Size" button triggers recommendation widget |
| AI Chatbot | Chatbot calls size recommendation service for sizing queries |
| Cart | Size recommendation shown inline when a size is selected |
| Returns Module | Return reason data feeds model retraining |
