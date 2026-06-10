# 19 — Testing Strategy

## Overview

The platform follows a comprehensive testing pyramid covering unit, integration, end-to-end (E2E), performance, and security tests. All tests run automatically in CI/CD pipelines before any deployment to staging or production.

---

## Testing Pyramid

```
         ┌─────────────┐
         │  E2E Tests  │  ← Few, slow, high confidence
         │  (Playwright)│
         └──────┬──────┘
         ┌──────▼──────────┐
         │ Integration Tests│  ← Moderate number
         │ (Supertest/Jest) │
         └──────┬───────────┘
    ┌───────────▼───────────────┐
    │       Unit Tests           │  ← Many, fast, focused
    │  (Jest / Vitest)           │
    └────────────────────────────┘
```

---

## 1. Unit Tests

### Scope

Test individual functions, service methods, and utility logic in complete isolation. All external dependencies (database, Redis, external APIs) are mocked.

### Framework

- **Backend:** Jest + ts-jest
- **Frontend:** Vitest + React Testing Library

### Coverage Targets

| Module | Target Coverage |
|--------|----------------|
| Auth service | 95% |
| Size recommendation logic | 90% |
| Cart pricing calculations | 95% |
| Coupon validation | 95% |
| Loyalty points engine | 90% |
| Order state machine | 90% |
| All other services | 80% |

### Examples

#### Cart Pricing Unit Test

```typescript
// cart.service.spec.ts
describe('CartService', () => {
  describe('calculateTotal', () => {
    it('applies percentage coupon correctly', () => {
      const cart = {
        items: [{ unit_price: 999, quantity: 2 }],
        coupon: { type: 'percentage', value: 20 }
      };
      const result = service.calculateTotal(cart);
      expect(result.subtotal).toBe(1998);
      expect(result.discount_amount).toBe(399.6);
      expect(result.total).toBe(1598.4 + result.tax + result.shipping);
    });

    it('does not apply expired coupon', () => {
      const expiredCoupon = { valid_until: '2020-01-01', ...coupon };
      expect(() => service.validateCoupon(expiredCoupon)).toThrow('CouponExpiredError');
    });
  });
});
```

#### Size Recommendation Unit Test

```typescript
describe('SizeRecommendationService', () => {
  it('recommends L for chest 98cm athletic build', () => {
    const result = service.recommend({
      height_cm: 178, weight_kg: 72,
      chest_cm: 98, body_type: 'athletic'
    });
    expect(result.recommended_size).toBe('L');
    expect(result.confidence_score).toBeGreaterThan(0.7);
  });

  it('returns high confidence for complete measurements', () => {
    const result = service.recommend({ height_cm: 175, chest_cm: 95, weight_kg: 70 });
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.85);
  });
});
```

---

## 2. Integration Tests

### Scope

Test complete request–response cycles through the NestJS application, including real database queries (against a test PostgreSQL instance) and real Redis interactions. External third-party services (payment gateway, email) are stubbed.

### Framework

- **Supertest** for HTTP request simulation
- **Jest** for assertions
- **test containers** (Docker) for spinning up PostgreSQL + Redis in CI

### Setup

```typescript
// test/setup.ts
beforeAll(async () => {
  app = await createTestApp();
  db = app.get(DataSource);
  await db.runMigrations();
  await seedTestData(db);
});

afterAll(async () => {
  await db.dropDatabase();
  await app.close();
});
```

### Examples

#### Auth Integration Test

```typescript
describe('POST /auth/login', () => {
  it('returns 200 with tokens for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234!' });

    expect(res.status).toBe(200);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.headers['set-cookie']).toContain('refresh_token');
  });

  it('returns 401 for incorrect password', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  it('locks account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }
    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test1234!' });

    expect(res.status).toBe(429);
  });
});
```

#### Order Integration Test

```typescript
describe('Order placement flow', () => {
  it('creates order, deducts stock, and returns payment intent', async () => {
    const token = await loginAs('customer');
    const productBefore = await db.findOne(Product, { where: { id: TEST_PRODUCT_ID } });

    const res = await request(app.getHttpServer())
      .post('/v1/checkout/place-order')
      .set('Authorization', `Bearer ${token}`)
      .send({
        address_id: TEST_ADDRESS_ID,
        payment_method: 'upi'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order_number).toMatch(/^ORD-/);

    const productAfter = await db.findOne(ProductVariant, { where: { id: TEST_VARIANT_ID } });
    expect(productAfter.stock_quantity).toBe(productBefore.stock_quantity - 1);
  });
});
```

---

## 3. End-to-End (E2E) Tests

### Scope

Simulate real user journeys through the full stack — browser to database — across the Next.js frontend. Covers the most critical user flows.

### Framework

**Playwright** (cross-browser: Chromium, Firefox, WebKit)

### Critical User Journeys Covered

| Journey | Steps |
|---------|-------|
| **Guest Browse & Register** | Open homepage → browse products → click register → verify email → log in |
| **Product Discovery via Chatbot** | Open chat → describe product need → receive recommendations → click product |
| **Virtual Try-On** | Open product page → click Try On → upload photo → wait for results → view renders |
| **Size Recommendation** | Click "Find My Size" → enter measurements → see recommendation → add to cart |
| **Add to Cart & Checkout (UPI)** | Select product + size → add to cart → apply coupon → checkout → mock UPI → order confirmed |
| **Add to Cart & Checkout (COD)** | Add to cart → checkout → select COD → order confirmed |
| **Order Tracking** | Go to orders → find order → view tracking status |
| **Wishlist Flow** | Add to wishlist → view wishlist → move to cart |
| **Leave a Review** | Go to delivered order → click "Write Review" → submit text + photo review |
| **Admin: Approve Review** | Admin login → moderation queue → approve pending review |

### Example: Checkout E2E

```typescript
test('complete UPI checkout', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="product-card"]:first-child');
  await page.selectOption('[data-testid="size-select"]', 'L');
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="cart-icon"]');
  await page.click('[data-testid="checkout-btn"]');

  // Fill address
  await page.fill('[name="full_name"]', 'Test User');
  await page.fill('[name="pincode"]', '600001');
  await page.click('[data-testid="use-this-address"]');

  // Select UPI
  await page.click('[data-testid="payment-upi"]');
  await page.click('[data-testid="place-order"]');

  // Mock payment success callback
  await page.waitForURL('**/order-confirmation**');
  await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
});
```

---

## 4. Performance Tests

### Framework

**k6** (load testing) + **Artillery** (API stress testing)

### Scenarios

| Scenario | Description | Target |
|----------|-------------|--------|
| Homepage load | 500 concurrent users browsing | p95 < 200ms |
| Product search | 200 concurrent search queries | p95 < 300ms |
| Checkout flow | 50 concurrent order placements | p95 < 500ms |
| Chatbot messages | 100 concurrent chat sessions | p95 < 800ms |
| Try-on job queue | 20 concurrent try-on submissions | Queue processes within 2 min |

### k6 Example

```javascript
// load-test-products.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up
    { duration: '5m', target: 500 },   // sustained load
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api-staging.domain.com/v1/products?limit=20');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

---

## 5. Security Tests

### Static Analysis (SAST)

- **ESLint security plugin** — scans for common Node.js security issues
- **Semgrep** — custom rules for auth bypass, injection, and hardcoded secrets
- Runs on every pull request in CI

### Dependency Scanning

- **npm audit** — checks for known CVEs in dependencies
- **Snyk** — continuous vulnerability monitoring
- Fails CI if any high/critical CVEs are unresolved

### Dynamic Analysis (DAST)

- **OWASP ZAP** — automated scan against staging environment
- **Burp Suite** — manual penetration testing quarterly
- Tests for: SQL injection, XSS, CSRF, broken auth, insecure direct object references (IDOR)

### Specific Security Test Cases

| Test | Description |
|------|-------------|
| Auth bypass | Attempt to access `/admin` routes without admin token |
| IDOR | Attempt to view another user's orders using their order ID |
| SQL injection | Submit `' OR 1=1 --` in search and filter fields |
| Rate limit | Exceed login rate limit and verify 429 response |
| JWT tampering | Modify JWT payload and verify rejection |
| Expired token | Use expired access token and verify 401 |
| XSS | Submit `<script>` in review body and verify sanitisation |
| Mass assignment | Submit unexpected fields in order/user update |

---

## CI Test Pipeline

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:unit -- --coverage
      - run: npm run test:coverage-check  # enforce thresholds

  integration-tests:
    services:
      postgres:
        image: pgvector/pgvector:pg15
      redis:
        image: redis:7
    steps:
      - run: npm run test:integration

  e2e-tests:
    needs: [unit-tests, integration-tests]
    steps:
      - run: npx playwright test

  security-scan:
    steps:
      - run: npm audit --audit-level=high
      - run: npx semgrep --config=auto src/
```

---

## Test Data Management

- **Seed scripts** generate deterministic test data for integration and E2E tests.
- Test database is isolated (separate schema or separate DB) from development data.
- PII in test data is always synthetic (generated with Faker.js).
- Snapshots of the test DB state can be restored for reproducibility.

---

## Reporting

- **Unit/integration coverage:** Istanbul HTML report + Codecov badge
- **E2E results:** Playwright HTML report with screenshots and traces on failure
- **Performance:** k6 + Grafana dashboard for load test results
- **Security:** Semgrep SARIF report uploaded to GitHub Security tab
