# 12 — Loyalty Program

## Overview

The Loyalty Program rewards customers for purchases, referrals, and engagement. It uses a points-based system with three membership tiers (Bronze, Silver, Gold) that unlock progressively better benefits.

---

## Points System

### Earning Points

| Action | Points Earned |
|--------|---------------|
| Purchase | 1 point per ₹10 spent (post-delivery) |
| First order ever | Bonus 100 points |
| Writing a review | 25 points per approved review |
| Referring a friend | 200 points when friend places first order |
| Birthday month purchase | 2× points multiplier |
| Completing profile | 50 points (one-time) |

### Redeeming Points

- **Redemption rate:** 100 points = ₹10 discount
- **Minimum redemption:** 500 points (= ₹50)
- **Maximum per order:** Up to 30% of order total can be paid with points
- Points redemption is applied at checkout, before GST is calculated

### Points Expiry

- Points expire **12 months** after they are earned if no purchase is made.
- Active customers (at least 1 purchase per year) never lose points.
- Expiry warning notification sent 30 days before expiration.

---

## Membership Tiers

| Tier | Points Required (annual) | Multiplier | Benefits |
|------|--------------------------|-----------|---------|
| Bronze | 0–999 | 1× | Standard earn rate |
| Silver | 1,000–4,999 | 1.25× | 25% more points per purchase, early access to sales |
| Gold | 5,000+ | 1.5× | 50% more points, free express shipping, priority support |

### Tier Calculation

- Tier is evaluated based on **total points earned in the last 12 months** (rolling year).
- Tier upgrades take effect immediately.
- Tier downgrades happen at the annual review date (not immediately on drop).

---

## Referral Programme

### How It Works

1. Customer gets a unique referral link/code from their profile.
2. Friend registers using the referral link.
3. Friend places their first order (minimum ₹499).
4. **Referrer receives** 200 points.
5. **Referred friend receives** 100 points + 10% discount on first order.

### Rules

- One referral bonus per referred friend.
- Self-referral detected and blocked (same device, email, phone, or address).
- Referral bonus credited after the referred friend's first order is delivered.

---

## Loyalty Dashboard (Customer View)

The customer-facing loyalty dashboard shows:

- Current points balance
- Current tier and progress to next tier
- Points expiry dates
- Points transaction history
- Referral link and referral status
- Available rewards and how to redeem

---

## Database Tables

### `reward_points`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `user_id` | UUID | FK to users |
| `type` | Enum | `earn` \| `redeem` \| `expire` \| `bonus` \| `referral` \| `reversal` |
| `amount` | Integer | Points amount (positive for earn, negative for redeem) |
| `balance_after` | Integer | Running balance after this transaction |
| `reference_id` | UUID | FK to order/review/referral that triggered the event |
| `description` | String | Human-readable description |
| `earned_at` | Timestamp | |
| `expires_at` | Timestamp | When these points expire |

### `user_loyalty` (view/computed or materialised)

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | |
| `total_balance` | Integer | Current redeemable points |
| `tier` | Enum | `bronze` \| `silver` \| `gold` |
| `annual_earned` | Integer | Points earned in last 12 months |
| `tier_review_date` | Date | Next annual tier evaluation date |
| `referral_code` | String | Unique referral code |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/loyalty/balance` | Current points balance and tier |
| GET | `/api/loyalty/transactions` | Points transaction history |
| GET | `/api/loyalty/referral` | Referral link and referral stats |
| POST | `/api/loyalty/redeem` | Redeem points at checkout |
| GET | `/api/admin/loyalty/config` | Admin: view loyalty config |
| PUT | `/api/admin/loyalty/config` | Super Admin: update earn rates, tiers |

---

## Admin Configuration

Super Admins can configure:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `points_per_rupee` | 0.1 | Points earned per ₹1 spent |
| `points_to_rupee_rate` | 0.1 | ₹ value per point |
| `silver_threshold` | 1000 | Annual points for Silver |
| `gold_threshold` | 5000 | Annual points for Gold |
| `referral_referrer_bonus` | 200 | Points for referrer |
| `referral_referee_bonus` | 100 | Points for referred friend |
| `points_expiry_months` | 12 | Expiry in months |
| `max_redemption_pct` | 30 | Max % of order payable with points |
