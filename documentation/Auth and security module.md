# 14 — Authentication & Security

## Overview

The platform uses JWT-based authentication with role-based access control (RBAC), end-to-end encryption, rate limiting, and bot protection to secure all user data and platform operations.

---

## Authentication

### Registration

```
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!"
}
```

**Process:**
1. Validate email uniqueness and password strength
2. Hash password using **bcrypt** (rounds: 12)
3. Create user record with `status: unverified`
4. Send email verification link (JWT with 24-hour expiry)
5. Return access token and refresh token

**Password requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

---

### Login

```
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Process:**
1. Look up user by email
2. Verify password with bcrypt
3. Check account is not suspended
4. Issue access token (15-minute TTL) and refresh token (30-day TTL)
5. Log login event (IP, device, timestamp)

---

### Token Management

| Token | Type | Expiry | Storage |
|-------|------|--------|---------|
| Access Token | JWT (RS256) | 15 minutes | In-memory / HTTP header |
| Refresh Token | Opaque random string | 30 days | HttpOnly cookie |

**Refresh flow:**
```
POST /api/auth/refresh
Cookie: refresh_token=...
→ Returns new access token (and rotates refresh token)
```

**Logout:**
```
POST /api/auth/logout
→ Invalidates refresh token (added to Redis blocklist)
```

---

### OAuth (Social Login)

| Provider | Scope |
|----------|-------|
| Google | email, profile |
| (Future) Apple | email, name |

OAuth users are created with a random secure password and linked to their provider account.

---

### Email Verification

- Required before placing a first order.
- Verification link format: `GET /api/auth/verify-email?token=<jwt>`
- Token expiry: 24 hours; resend allowed after 60 seconds.

---

### Password Reset

```
POST /api/auth/forgot-password  { "email": "..." }
→ Sends reset link (valid 1 hour)

POST /api/auth/reset-password   { "token": "...", "new_password": "..." }
→ Resets password, invalidates all existing refresh tokens for that user
```

---

## Role-Based Access Control (RBAC)

Four roles with hierarchical permissions:

```
super_admin > admin > customer > guest
```

**Implementation (NestJS):**
```typescript
@Roles('admin', 'super_admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Delete('/products/:id')
deleteProduct(@Param('id') id: string) { ... }
```

Guards enforce:
1. JWT validity
2. Token not revoked (checked against Redis blocklist)
3. User role matches required roles

---

## Security Controls

### Encryption

| Data | Method |
|------|--------|
| Passwords | bcrypt (rounds: 12) |
| Data in transit | TLS 1.2+ (HTTPS enforced) |
| Data at rest (DB) | AES-256 via PostgreSQL encryption or managed DB encryption |
| S3 assets | Server-side encryption (SSE-S3) |
| PII fields | Application-level encryption for phone numbers |

### Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5 attempts / 15 minutes per IP |
| `POST /auth/register` | 10 requests / hour per IP |
| `POST /auth/forgot-password` | 3 requests / hour per email |
| `POST /api/chat/message` | 60 messages / minute per user |
| `POST /api/try-on/initiate` | 10 jobs / hour per user |
| All other API routes | 300 requests / minute per user |

Rate limit counters stored in Redis with TTL.

### Bot Protection

- Cloudflare Turnstile or hCaptcha on registration, login, and checkout.
- Suspicious traffic patterns (rapid API calls, scraping patterns) trigger temporary IP block.
- Honeypot fields on forms to catch bots.

### CSRF Protection

- All state-changing requests (POST/PUT/DELETE) require a valid `X-CSRF-Token` header.
- CSRF token rotated per session.

### SQL Injection Prevention

- All database queries use **parameterised statements** (TypeORM / Prisma).
- No raw SQL string interpolation.

### XSS Prevention

- All user-generated content is sanitised server-side before storage.
- `Content-Security-Policy` headers on all responses.
- React's built-in escaping on the frontend.

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Audit Logging

All sensitive actions are logged to an immutable audit log:

| Action | Logged Fields |
|--------|---------------|
| Login / Logout | user_id, ip, user_agent, timestamp |
| Password change | user_id, ip, timestamp |
| Admin actions | admin_id, action, affected_resource_id, timestamp |
| Role changes | super_admin_id, target_user_id, old_role, new_role |
| Order cancellations | user_id, order_id, reason |

Audit logs are append-only and stored for 2 years.

---

## Account Suspension

Admins can suspend a customer account:
- Suspended users cannot log in and receive a clear error message.
- Active sessions are invalidated immediately.
- Can be lifted by Admin or Super Admin.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/verify-email` | Verify email address |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Set new password |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update profile |
