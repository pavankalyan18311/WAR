# 18 — Infrastructure

## Overview

The platform is built on a modern cloud-native stack. This document covers the full technology stack, service configuration, scaling strategy, and infrastructure diagram.

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14+ | SSR/SSG React web application |
| Backend | NestJS (Node.js) | RESTful API services |
| Primary DB | PostgreSQL 15+ | Relational data store |
| Vector DB | PGVector (Postgres extension) | Semantic search embeddings |
| Cache | Redis 7+ | Session store, API cache, rate limits |
| Job Queue | Bull (Redis-backed) | Async job processing |
| Object Storage | S3-compatible (AWS S3 / MinIO) | Images, videos, documents |
| CDN | Cloudflare | Asset delivery + DDoS + WAF |
| Monitoring | Prometheus + Grafana | Metrics + dashboards |
| Log Aggregation | Loki / ELK Stack | Centralised log collection |
| Container | Docker | Service packaging |
| Orchestration | Kubernetes (EKS / GKE) | Container orchestration |
| CI/CD | GitHub Actions | Automated pipelines |

---

## Infrastructure Diagram

```
                         ┌──────────────────┐
                         │   Cloudflare CDN  │
                         │  WAF + DDoS Prot. │
                         └────────┬─────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     Load Balancer (ALB)     │
                    └──────┬──────────┬──────────┘
                           │          │
              ┌────────────▼─┐    ┌───▼──────────────┐
              │  Next.js App │    │   NestJS API     │
              │  (3 replicas)│    │  (5 replicas)    │
              └──────────────┘    └────────┬─────────┘
                                           │
                    ┌──────────────────────┼──────────────────┐
                    │                      │                  │
          ┌─────────▼──────┐    ┌──────────▼───┐   ┌─────────▼──────┐
          │  PostgreSQL     │    │  Redis Cluster│   │  S3 Bucket     │
          │  (Primary +     │    │  (3 nodes)   │   │  + CloudFront  │
          │   2 Replicas)   │    └──────────────┘   └────────────────┘
          └─────────────────┘
                    │
          ┌─────────▼──────┐
          │  PGVector       │
          │  (same cluster) │
          └─────────────────┘

                    ┌──────────────────────────┐
                    │   AI Worker Cluster       │
                    │   (GPU instances)         │
                    │   - Virtual Try-On jobs   │
                    │   - Embedding generation  │
                    └──────────────────────────┘

                    ┌──────────────────────────┐
                    │  Observability Stack      │
                    │  Prometheus + Grafana     │
                    │  Loki (log aggregation)   │
                    └──────────────────────────┘
```

---

## Frontend: Next.js

| Configuration | Value |
|--------------|-------|
| Rendering | SSR for product pages (SEO), SSG for static pages |
| Deployment | Vercel or containerised on Kubernetes |
| Environment | `.env.local` for secrets via CI/CD injection |
| CDN | Static assets served via Cloudflare |
| Image Optimisation | next/image with S3 + CDN |
| State Management | React Context + SWR for server state |
| Styling | Tailwind CSS |

---

## Backend: NestJS

| Configuration | Value |
|--------------|-------|
| Node.js version | 20 LTS |
| Framework | NestJS 10+ |
| ORM | TypeORM or Prisma |
| Validation | class-validator + class-transformer |
| Documentation | Swagger/OpenAPI auto-generated |
| Containerisation | Docker (multi-stage build) |
| Process Manager | PM2 (for non-Kubernetes setups) |

### NestJS Module Structure

```
src/
  modules/
    auth/
    products/
    cart/
    orders/
    reviews/
    wishlist/
    loyalty/
    notifications/
    chatbot/
    virtual-try-on/
    size-recommendation/
    recommendations/
    analytics/
    admin/
  common/
    guards/
    interceptors/
    pipes/
    filters/
  config/
  database/
  queue/
```

---

## PostgreSQL

| Configuration | Value |
|--------------|-------|
| Version | PostgreSQL 15+ |
| Extensions | PGVector, pg_trgm (trigram search), uuid-ossp |
| Setup | Primary + 2 read replicas |
| Connection Pooling | PgBouncer (max 100 connections per instance) |
| Backup | Daily snapshots + continuous WAL archiving to S3 |
| Encryption at Rest | AWS RDS encryption or `pgcrypto` |
| Migrations | TypeORM migrations (version-controlled) |

### Read/Write Splitting

- **Writes:** Primary only
- **Reads (analytics, reporting):** Read replicas
- **Critical reads (order status, payment):** Primary only (to avoid replication lag)

---

## Redis

| Configuration | Value |
|--------------|-------|
| Version | Redis 7+ |
| Mode | Cluster (3 primary + 3 replica nodes) |
| Persistence | AOF (Append-Only File) |
| Eviction | `allkeys-lru` |
| Use Cases | Sessions, rate limits, API cache, Bull queues, pub/sub |

### Key Namespacing

```
session:{user_id}          → JWT session data
ratelimit:{user_id}:{route} → Rate limit counter
cache:product:{id}          → Product page cache (TTL: 5 min)
cache:homepage:trending     → Trending products (TTL: 15 min)
bull:{queue_name}           → Bull job queues
```

---

## S3 Object Storage

| Bucket | Contents | Access | Lifecycle |
|--------|----------|--------|-----------|
| `products` | Product images, 360°, videos | Public (via CDN) | No expiry |
| `tryon-outputs` | Virtual try-on renders | Private (signed URL) | 30-day TTL |
| `invoices` | Order invoice PDFs | Private (signed URL) | 7-year retention |
| `review-media` | Review photos and videos | Public (via CDN) | No expiry |
| `backups` | DB snapshots, exports | Private | 90-day retention |

---

## Bull Job Queues

| Queue | Workers | Description |
|-------|---------|-------------|
| `try-on` | 4 GPU workers | Virtual try-on pipeline |
| `notifications` | 10 workers | Email/push/SMS dispatch |
| `recommendations` | 2 workers | Batch recommendation recompute |
| `embeddings` | 2 workers | Product embedding generation |
| `analytics` | 2 workers | Event aggregation |

---

## Monitoring: Prometheus + Grafana

### Key Metrics Collected

| Category | Metrics |
|----------|---------|
| API | Request rate, latency (p50/p95/p99), error rate per route |
| Database | Query duration, connection pool usage, replication lag |
| Redis | Hit rate, memory usage, queue depths |
| Try-On Pipeline | Job queue depth, processing duration, failure rate |
| Business | Orders per hour, GMV, active sessions |
| Infrastructure | CPU, memory, disk I/O per pod |

### Alerts

| Alert | Threshold | Channel |
|-------|-----------|---------|
| API error rate > 1% | 5 minutes | PagerDuty + Slack |
| p99 API latency > 2s | 5 minutes | Slack |
| Try-on queue depth > 50 | Immediate | Slack |
| DB replication lag > 30s | Immediate | PagerDuty |
| Redis memory > 80% | Immediate | Slack |
| Disk usage > 85% | Immediate | PagerDuty |

---

## Kubernetes Configuration

| Resource | Replicas | CPU Request | Memory Request |
|----------|----------|-------------|----------------|
| NestJS API | 5 (auto-scale 3–15) | 500m | 512Mi |
| Next.js Web | 3 (auto-scale 2–10) | 500m | 512Mi |
| Try-On Worker | 4 (GPU nodes) | 2 CPU | 8Gi |
| Notification Worker | 10 | 250m | 256Mi |

**Horizontal Pod Autoscaler:** Scales based on CPU utilisation > 70% and custom metrics (queue depth).

---

## Environment Configuration

### Environment Variables (NestJS)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379

# Auth
JWT_SECRET=...
JWT_EXPIRES_IN=900
REFRESH_TOKEN_SECRET=...

# S3
AWS_REGION=ap-south-1
AWS_S3_BUCKET_PRODUCTS=fashion-products
AWS_S3_BUCKET_TRYON=fashion-tryon

# AI Services
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...

# Payment
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

# Notifications
SENDGRID_API_KEY=...
FCM_SERVER_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

All secrets are injected via **Kubernetes Secrets** or **AWS Secrets Manager** — never hardcoded.
