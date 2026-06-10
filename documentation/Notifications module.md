# 13 — Notifications

## Overview

The Notifications service dispatches messages to customers and admins across three channels: email, push notification, and SMS. It is event-driven, triggered by actions across all platform modules.

---

## Notification Channels

| Channel | Provider | Use Case |
|---------|----------|----------|
| Email | SendGrid / AWS SES | Transactional and marketing |
| Push | Firebase Cloud Messaging (FCM) / APNs | Real-time mobile alerts |
| SMS | Twilio / MSG91 | Critical order updates |

---

## Notification Categories

### 1. Order Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Order placed | Email + SMS | Customer |
| Order confirmed (payment received) | Email + Push | Customer |
| Order packed | Push | Customer |
| Order shipped | Email + Push + SMS | Customer |
| Order out for delivery | Push + SMS | Customer |
| Order delivered | Email + Push | Customer |
| Order cancelled | Email | Customer |
| Return approved | Email | Customer |
| Refund processed | Email + SMS | Customer |

### 2. Account Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Welcome (registration) | Email | Customer |
| Email verification | Email | Customer |
| Password reset | Email | Customer |
| Password changed | Email | Customer |
| Login from new device | Email | Customer |

### 3. Product & Wishlist Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Back in stock (wishlisted item) | Email + Push | Customer |
| Price drop on wishlisted item | Email + Push | Customer |

### 4. Loyalty Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Points earned after purchase | Push | Customer |
| Tier upgraded | Email + Push | Customer |
| Points expiring soon (30 days) | Email + Push | Customer |
| Referral bonus credited | Push | Customer |

### 5. Promotional Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Sale announcement | Email + Push | Opted-in customers |
| New collection launch | Email + Push | Opted-in customers |
| Personalised product recommendations | Email | Active customers |

### 6. Admin Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Low stock alert | Email | Admin |
| New review pending moderation | Email | Admin |
| Large order placed | Email | Admin |
| Payment failure spike | Email + SMS | Admin |

---

## Notification Preferences

Customers can manage their notification preferences from their account settings.

| Preference | Default | Channels |
|------------|---------|---------|
| Order updates | On | Email, Push, SMS |
| Promotions & offers | On | Email, Push |
| Back in stock | On | Email, Push |
| Price drops | On | Email, Push |
| Loyalty updates | On | Push |
| Account security | On (non-editable) | Email |

---

## Template System

Each notification type has a branded template:

- **Email:** HTML templates with inline CSS, responsive design
- **Push:** Title (50 chars max) + body (100 chars max) + optional image
- **SMS:** Plain text, under 160 characters

Templates are stored in the database and editable by Super Admins.

---

## Delivery Architecture

```
Platform Event (order.shipped, product.restocked, etc.)
        │
        ▼
Notification Service (NestJS)
        │
        ▼
Notification Queue (Bull / Redis)
        │
   ┌────┴────┐────────┐
   ▼         ▼        ▼
Email      Push      SMS
Worker    Worker    Worker
   │         │        │
   ▼         ▼        ▼
SendGrid   FCM/    Twilio/
/ SES      APNs    MSG91
```

**Queue:** Ensures delivery even under load; retries on failure (up to 3 attempts with exponential backoff).

---

## Database Table: `notifications`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `user_id` | UUID | Recipient |
| `type` | String | e.g. `order.shipped`, `points.earned` |
| `channel` | Enum | `email` \| `push` \| `sms` |
| `title` | String | |
| `body` | Text | |
| `data` | JSONB | Contextual data (order_id, product_id, etc.) |
| `status` | Enum | `queued` \| `sent` \| `failed` |
| `sent_at` | Timestamp | |
| `read_at` | Timestamp | (for push / in-app) |
| `created_at` | Timestamp | |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | User's notification inbox (auth) |
| PUT | `/api/notifications/:id/read` | Mark notification as read |
| PUT | `/api/notifications/read-all` | Mark all as read |
| GET | `/api/notifications/preferences` | Get notification preferences |
| PUT | `/api/notifications/preferences` | Update preferences |
| POST | `/api/admin/notifications/broadcast` | Admin: send broadcast notification |
