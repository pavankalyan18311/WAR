# Supabase-first migration plan for WAR

## Goal
Use Supabase as the primary backend and database for authentication, user data, products, orders, cart, wishlist, and profile management. Keep Python only for AI-related services such as size recommendation, try-on processing, or recommendation engines.

## Current state
The project already has a solid foundation for this direction:
- Frontend Supabase client helpers already exist under `frontend/src/lib/supabase/`
- A database schema draft already exists in `frontend/supabase/schema.sql`
- Supabase query helpers already exist in `frontend/src/lib/supabase/queries.ts`

The remaining work is mainly to make the app consistently use Supabase instead of the older FastAPI-backed flow.

## Target architecture
- Frontend: Next.js
- Auth: Supabase Auth
- Database: Supabase Postgres
- Storage: Supabase Storage
- Realtime / edge logic: Supabase Edge Functions if needed
- Python: optional AI microservice for advanced model features

## Recommended migration phases

### Phase 1 — Supabase project setup
1. Create a new Supabase project.
2. Run the SQL from `frontend/supabase/schema.sql`.
3. Enable auth providers needed for your app.
4. Configure storage buckets for product images and profile images.
5. Add environment variables to the frontend.

### Phase 2 — Auth migration
1. Replace the current FastAPI-based auth flow with Supabase Auth.
2. Use Supabase-managed email/password and maybe OTP sign-in.
3. Keep user profile rows in the `profiles` table.
4. Remove dependency on the existing FastAPI `/auth/*` endpoints for normal sign-in and signup.

### Phase 3 — Database migration
1. Move product data and product variants into Supabase tables.
2. Use `products`, `product_images`, `product_variants`, `categories`, and `collections`.
3. Make sure RLS policies are set for public product reads and protected user-owned writes.
4. Replace any direct SQLAlchemy usage with Supabase queries.

### Phase 4 — Orders, cart, wishlist, and accounts
1. Use Supabase tables for `orders`, `order_items`, `addresses`, `wishlist`, and `cart` (or a server-side cart table if needed).
2. Replace frontend mock account/order flows with real Supabase-backed data.
3. Add row-level-security rules so users can only access their own data.

### Phase 5 — Keep Python only for AI
1. Keep FastAPI only as an optional AI service.
2. Expose Python endpoints for:
   - size recommendation
   - virtual try-on processing
   - recommendation engine / personalization
3. Call those endpoints from the frontend when needed.

## File-by-file migration guidance

### Frontend
- `frontend/src/store/authStore.ts`
  - Move from FastAPI auth calls to Supabase Auth.
- `frontend/src/lib/supabase/queries.ts`
  - Continue expanding this file for products, orders, wishlist, and coupons.
- `frontend/src/app/products/ProductsPage.tsx`
  - Replace mock product rendering with Supabase product queries.
- `frontend/src/app/products/[slug]/page.tsx`
  - Replace mock product details with Supabase data.
- `frontend/src/app/account/orders/page.tsx`
  - Replace mock orders with `getUserOrders()`.

### Backend
- `backend/app/main.py`
  - Keep only if you want Python AI endpoints.
- `backend/app/routers/auth.py`
  - Can be deprecated for normal auth.
- `backend/app/routers/orders.py`
  - Can be reduced and eventually removed for Supabase-backed orders.
- `backend/app/routers/products.py`
  - Can be retired once products live in Supabase.

## Recommended first milestone
Build a working Supabase-backed MVP with:
1. Supabase Auth login/signup
2. Product listing from Supabase
3. Product detail page from Supabase
4. User order history from Supabase

This gives you a clean working store quickly without needing the full FastAPI backend.

## Suggested implementation order
1. Set up Supabase project and schema
2. Add frontend env variables
3. Switch auth to Supabase Auth
4. Load products from Supabase
5. Load orders and profiles from Supabase
6. Keep Python as an AI service only

## Final recommendation
Use Supabase as the system of record for the store, and use Python only where it adds real value. That gives you a faster, simpler, and more maintainable stack for this product.
