# 01 — Platform Overview

## Vision

Build a **premium AI-first men's fashion e-commerce platform** that combines:

- Traditional e-commerce (browse, cart, checkout, orders)
- AI shopping assistant (RAG chatbot)
- AI virtual try-on (garment visualisation)
- AI size recommendation (fit prediction)
- Personalised recommendations (collaborative + content-based filtering)
- Loyalty & rewards system
- Social commerce (wishlist sharing, reviews)

---

## Business Goals

| Goal | Description |
|------|-------------|
| Increase Conversion Rate | AI chatbot guides users to the right product; try-on reduces hesitation |
| Reduce Return Rate | Accurate size recommendation + virtual try-on reduce wrong-size returns |
| Improve Customer Confidence | Seeing themselves in a garment before purchase builds trust |
| Create Personalised Experiences | Every user sees a tailored storefront based on their preferences and history |

---

## Platform Modules

### Core E-Commerce
1. **Product Catalog** — multi-category, rich media, inventory management
2. **Cart & Checkout** — coupon support, COD, UPI, invoice generation
3. **Order Management** — full lifecycle from Pending to Refunded
4. **Wishlist** — save, share, and convert to cart
5. **Reviews** — text, photo, video with AI moderation
6. **Loyalty Program** — points, tiers, referrals

### AI Modules
7. **Virtual Try-On** — 8-stage computer vision pipeline
8. **AI Chatbot** — RAG-powered product discovery and support
9. **Size Recommendation** — ML-based fit prediction
10. **Personalization Engine** — collaborative + content-based recommendations

### Platform & Operations
11. **Authentication & Security** — JWT, RBAC, encryption
12. **Notifications** — email, push, SMS
13. **Admin Dashboard** — product, order, customer, review management
14. **Analytics** — revenue, customer, product, and AI usage dashboards
15. **Infrastructure** — Next.js, NestJS, PostgreSQL, Redis, S3, Prometheus

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│            Next.js Web App  │  Mobile PWA / React Native    │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│               API Gateway + Auth (JWT + RBAC)                │
│              Rate Limiting │ CDN │ Bot Protection            │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌───▼──────────┐
│  AI Services │ │  Backend   │ │  Admin APIs  │
│  - Try-On    │ │  NestJS    │ │              │
│  - Chatbot   │ │  Services  │ │              │
│  - Size Rec  │ │            │ │              │
│  - Recs      │ └─────┬──────┘ └──────────────┘
└──────────────┘       │
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       Data Layer                             │
│  PostgreSQL + PGVector │ Redis Cache │ S3 Object Storage    │
└─────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│             Observability & DevOps                           │
│         Prometheus │ Grafana │ CI/CD Pipelines              │
└─────────────────────────────────────────────────────────────┘
```

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API Response Time (p95) | < 300ms |
| Virtual Try-On Processing | < 30 seconds |
| Uptime SLA | 99.9% |
| Data Encryption | At rest and in transit |
| GDPR / Data Privacy | User data deletion supported |
| Scalability | Horizontal scaling on all services |
| Image Storage Retention | Try-on outputs: 30 days; Product assets: permanent |
