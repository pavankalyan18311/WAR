# ThreadX — AI-Powered Men's Fashion E-Commerce Platform

Premium t-shirt shopping experience with AI Virtual Try-On, Size Recommendation, RAG Chatbot, and Personalisation.

---

## Project Structure

```
TSHIRT-WEBSITE/
├── frontend/                # Next.js 16 + TypeScript + Tailwind CSS
│   └── src/
│       ├── app/             # App Router pages
│       │   ├── page.tsx             → Home page
│       │   ├── products/            → Product listing + PDP
│       │   ├── cart/                → Cart page
│       │   ├── checkout/            → Checkout flow
│       │   ├── try-on/              → AI Virtual Try-On
│       │   └── auth/                → Login / Register
│       ├── components/      # Reusable components
│       │   ├── layout/      → Header, Footer
│       │   ├── product/     → ProductCard
│       │   ├── cart/        → CartDrawer
│       │   ├── chat/        → AI ChatWidget
│       │   └── home/        → NewsletterForm
│       ├── store/           # Zustand stores (cart, auth, wishlist)
│       ├── lib/             # API client, utils, mock data
│       └── types/           # TypeScript types
├── backend/                 # FastAPI + SQLAlchemy + PostgreSQL
│   └── app/
│       ├── main.py          → FastAPI app entry
│       ├── core/            → Config, DB, Security
│       ├── models/          → SQLAlchemy ORM models
│       ├── schemas/         → Pydantic request/response schemas
│       └── routers/         → Auth, Products, Orders, AI
├── documentation/           # Module-level docs
└── docker-compose.yml       # PostgreSQL + Redis + Backend + Frontend
```

---

## Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

### Backend
```bash
cd backend
cp .env.example .env    # Fill in your values
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### Full Stack (Docker)
```bash
docker-compose up --build
```

---

## Tech Stack

| Layer       | Technology |
|-------------|------------|
| Frontend    | Next.js 16, TypeScript, Tailwind CSS |
| State       | Zustand, TanStack Query |
| Backend     | FastAPI, SQLAlchemy (async), Alembic |
| Database    | PostgreSQL + pgvector |
| Cache       | Redis |
| Storage     | AWS S3 / MinIO |
| AI          | OpenAI API (chat + embeddings) |
| Auth        | JWT (RS256), bcrypt |
| Deploy      | Docker Compose |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — hero, categories, new arrivals, AI features, best sellers |
| `/products` | Product listing with filters (category, size, colour, sort) |
| `/products/[slug]` | Product detail — gallery, size selector, reviews, AI tools |
| `/cart` | Cart with coupon, shipping calculator, order summary |
| `/checkout` | 3-step checkout — address → payment → confirm |
| `/try-on` | AI Virtual Try-On (8-stage pipeline UI) |
| `/auth/login` | Login with Google OAuth support |
| `/auth/register` | Register with password strength validation |

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Invalidate session |
| GET | `/api/products` | List products with filters |
| GET | `/api/products/categories` | List all categories |
| GET | `/api/products/{slug}` | Get single product |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | List user orders |
| POST | `/api/ai/size-recommendation` | AI size predictor |
| POST | `/api/ai/chat` | AI chatbot (RAG) |
