# 15 — Admin Dashboard & Analytics

## Overview

The Admin Dashboard provides platform operators with tools to manage products, orders, customers, and content. The Analytics section provides data-driven insights across revenue, customers, products, and AI feature usage.

---

## Admin Modules

### 1. Product Management

| Action | Description |
|--------|-------------|
| Create product | Add new product with all attributes and media |
| Edit product | Update pricing, description, stock, images |
| Archive product | Soft-delete from storefront (preserves history) |
| Bulk import | CSV upload for batch product creation |
| Manage categories | Add, edit, reorder categories |
| Inventory management | Adjust stock quantities, set reorder alerts |
| Feature products | Mark products for homepage / promotional placement |
| Manage media | Upload, replace, or reorder product images and videos |

---

### 2. Order Management

| Action | Description |
|--------|-------------|
| View all orders | Filter by status, date, customer, payment method |
| Update order status | Move order through lifecycle states |
| View order details | Line items, payment, address, tracking info |
| Process returns | Approve or reject return requests |
| Initiate refunds | Manual refund processing |
| Export orders | Download as CSV or Excel |
| Add order notes | Internal notes for team communication |
| Bulk status update | Mark batch of orders as shipped, etc. |

---

### 3. Customer Management

| Action | Description |
|--------|-------------|
| View customer list | Filter by tier, registration date, order count |
| View customer profile | Orders, wishlist, reviews, loyalty balance |
| Suspend / unsuspend account | Block access without deletion |
| Export customers | CSV export of customer data |
| View customer orders | Full purchase history |
| Manually adjust loyalty points | Correct errors or goodwill gestures |

---

### 4. Review Moderation

| Action | Description |
|--------|-------------|
| View pending queue | Reviews awaiting manual approval |
| Approve review | Publish to storefront |
| Reject review | Remove with optional reason |
| View all reviews | Filter by product, rating, status |
| Bulk approve | Mass-approve low-risk reviews |
| Flag user | Escalate abusive reviewer to account suspension |

---

### 5. Coupon Management

| Action | Description |
|--------|-------------|
| Create coupon | Set type, value, rules, and validity |
| Edit coupon | Update value or expiry date |
| Deactivate coupon | Immediately stop redemption |
| View usage stats | How many times used, total discount given |
| Bulk generate | Generate batch of unique single-use codes |

---

## Analytics Dashboard

### 1. Revenue Analytics

| Metric | Description |
|--------|-------------|
| Total Revenue (day/week/month/year) | Gross revenue from completed orders |
| Net Revenue | After discounts and refunds |
| Average Order Value (AOV) | Total revenue / order count |
| Revenue by Category | Breakdown per product category |
| Revenue by Payment Method | UPI vs Card vs COD |
| Refund Rate | Refunded amount / gross revenue |
| Discount Rate | Total discounts / gross revenue |
| Revenue Growth | Period-over-period comparison |

### 2. Customer Analytics

| Metric | Description |
|--------|-------------|
| New Registrations | Day/week/month |
| Daily Active Users | Unique logged-in sessions |
| Repeat Purchase Rate | % customers with 2+ orders |
| Customer Lifetime Value (CLV) | Average revenue per customer lifetime |
| Tier Distribution | % customers in Bronze/Silver/Gold |
| Retention Rate | % customers who return within 90 days |
| Churn Rate | % customers inactive for 90+ days |
| Top Customers by Revenue | Ranked list |

### 3. Product Analytics

| Metric | Description |
|--------|-------------|
| Best-Selling Products | Ranked by units sold |
| Products by Revenue | Ranked by total revenue |
| Low Stock Alerts | Products below reorder threshold |
| Return Rate by Product | % of orders returned per SKU |
| Conversion Rate by Product | Views to purchases |
| Wishlist-to-Purchase Rate | Wishlist adds to purchases |
| Review Score Distribution | Average rating per product |

### 4. AI Usage Analytics

| Metric | Description |
|--------|-------------|
| Virtual Try-On Volume | Jobs per day, completion rate, failure rate |
| Average Try-On Processing Time | P50/P95 in seconds |
| Chatbot Sessions | Sessions per day, messages per session |
| Chatbot Intent Distribution | Sales vs Support vs Size vs Order |
| Size Recommendation Usage | How often used, accuracy rate (post-purchase) |
| Recommendation CTR | Click-through rate on recommended products |
| Recommendation Conversion | Purchases from recommended products |

---

## Report Export

All analytics sections support:
- **Date range selection:** Last 7 / 30 / 90 days or custom range
- **Export formats:** CSV, PDF summary
- **Scheduled reports:** Weekly email digest to admin (configurable)

---

## Super Admin: System Configuration

| Setting | Description |
|---------|-------------|
| Loyalty programme rates | Points per rupee, tier thresholds |
| Shipping rates | Base rate, per-kg rate, free shipping threshold |
| Tax rate | GST percentage |
| COD limit | Maximum order value eligible for COD |
| AI service config | Model selection, confidence thresholds, try-on GPU quota |
| Notification templates | Edit email/push/SMS templates |
| Return window | Days allowed for returns |
| Feature flags | Enable/disable platform features |

---

## API Endpoints (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics/revenue` | Revenue metrics |
| GET | `/api/admin/analytics/customers` | Customer metrics |
| GET | `/api/admin/analytics/products` | Product metrics |
| GET | `/api/admin/analytics/ai` | AI usage metrics |
| GET | `/api/admin/dashboard` | Summary dashboard data |
| GET | `/api/admin/products` | Product list with admin fields |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Archive product |
| GET | `/api/admin/orders` | All orders |
| GET | `/api/admin/customers` | Customer list |
| GET | `/api/admin/coupons` | Coupon list |
| POST | `/api/admin/coupons` | Create coupon |
| GET | `/api/super-admin/config` | System configuration |
| PUT | `/api/super-admin/config` | Update configuration |
| GET | `/api/super-admin/users` | All admin users |
| POST | `/api/super-admin/users` | Create admin account |
