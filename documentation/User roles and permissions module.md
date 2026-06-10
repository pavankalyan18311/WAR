# 02 — User Roles & Permissions

## Role Hierarchy

```
Super Admin
    └── Admin
            └── Registered Customer
                        └── Guest User
```

---

## Role Definitions

### 1. Guest User

An unauthenticated visitor browsing the platform.

**Capabilities:**

| Feature | Allowed |
|---------|---------|
| Browse products | ✅ |
| Search products | ✅ |
| View product details | ✅ |
| Use AI chatbot | ✅ |
| Use virtual try-on | ✅ |
| Register an account | ✅ |
| Add to wishlist | ❌ |
| Place orders | ❌ |
| Leave reviews | ❌ |
| View order history | ❌ |

**Session:** Guest sessions are ephemeral. Cart and try-on sessions may be preserved temporarily via browser storage and migrated on registration/login.

---

### 2. Registered Customer

An authenticated user with a verified account.

**Capabilities:**

| Feature | Allowed |
|---------|---------|
| All Guest capabilities | ✅ |
| Manage wishlist (add/remove/share) | ✅ |
| Place and track orders | ✅ |
| Manage delivery addresses | ✅ |
| Save body measurements | ✅ |
| Save virtual try-on avatars | ✅ |
| Leave product reviews (text/photo/video) | ✅ |
| Earn and redeem loyalty points | ✅ |
| Refer friends | ✅ |
| View order history | ✅ |
| Manage payment methods | ✅ |
| Update profile and preferences | ✅ |

**Authentication:** JWT access token (15-minute expiry) + refresh token (30-day expiry).

---

### 3. Admin

A platform operator managing day-to-day operations.

**Capabilities:**

| Feature | Allowed |
|---------|---------|
| Manage products (create/edit/delete) | ✅ |
| Manage product categories | ✅ |
| Manage inventory and stock | ✅ |
| Manage orders (view/update/cancel) | ✅ |
| Manage customers (view/suspend) | ✅ |
| Manage reviews (approve/reject/delete) | ✅ |
| Manage coupons (create/expire) | ✅ |
| View revenue and product analytics | ✅ |
| View customer analytics | ✅ |
| View AI usage analytics | ✅ |
| Respond to customer support tickets | ✅ |
| Access system configuration | ❌ |
| Manage admin roles | ❌ |

---

### 4. Super Admin

Full platform control including system-level configuration and role management.

**Capabilities:**

| Feature | Allowed |
|---------|---------|
| All Admin capabilities | ✅ |
| System configuration | ✅ |
| Role and permission management | ✅ |
| AI service configuration (model, thresholds) | ✅ |
| Infrastructure monitoring | ✅ |
| Create / deactivate Admin accounts | ✅ |
| Access audit logs | ✅ |
| Data export and GDPR requests | ✅ |

---

## Permission Matrix

| Action | Guest | Customer | Admin | Super Admin |
|--------|-------|----------|-------|-------------|
| View products | ✅ | ✅ | ✅ | ✅ |
| Purchase | ❌ | ✅ | ❌ | ❌ |
| Manage own profile | ❌ | ✅ | ✅ | ✅ |
| Manage products | ❌ | ❌ | ✅ | ✅ |
| Manage orders | ❌ | Own only | All | All |
| Manage users | ❌ | ❌ | View/Suspend | Full |
| Configure system | ❌ | ❌ | ❌ | ✅ |
| Configure AI | ❌ | ❌ | ❌ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ |
| Manage roles | ❌ | ❌ | ❌ | ✅ |

---

## JWT Payload Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "customer",
  "iat": 1700000000,
  "exp": 1700000900
}
```

**Roles enum:** `guest` | `customer` | `admin` | `super_admin`

---

## Role-Based Route Guards (NestJS)

```typescript
@Roles('admin', 'super_admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('/admin/products')
getAdminProducts() { ... }
```

Guards are enforced at the API gateway level **and** within individual NestJS service controllers.
