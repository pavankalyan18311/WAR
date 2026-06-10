# 20 — Deployment & CI/CD

## Overview

The platform uses a fully automated CI/CD pipeline with three environments (Development, Staging, Production). Every code change goes through automated testing, security scanning, and health checks before reaching production. A robust rollback strategy ensures near-zero-downtime deployments.

---

## Environments

| Environment | Purpose | Domain | Auto-Deploy |
|-------------|---------|--------|-------------|
| Development | Local / feature branch testing | localhost / dev.domain.com | On push to feature branch |
| Staging | Pre-production validation | staging.domain.com | On merge to `main` |
| Production | Live user traffic | domain.com | Manual approval after staging |

### Environment Isolation

- Separate databases, Redis clusters, and S3 buckets per environment.
- Staging uses production-mirror data (anonymised) for realistic testing.
- Production secrets are never accessible from staging or dev.

---

## CI/CD Pipeline

### Trigger Events

| Trigger | Pipeline |
|---------|---------|
| Push to feature branch | Lint + Unit tests |
| Pull Request opened | Lint + Unit + Integration + Security scan |
| Merge to `main` | Full pipeline + Deploy to Staging |
| Manual approval | Deploy to Production |

### Full Pipeline Stages

```
┌─────────────────────────────────────────────────────┐
│ Stage 1: Code Quality                                │
│  - ESLint + Prettier check                          │
│  - TypeScript compilation check                     │
└──────────────────────┬──────────────────────────────┘
                       │ (pass)
┌──────────────────────▼──────────────────────────────┐
│ Stage 2: Unit Tests                                  │
│  - Jest unit tests                                  │
│  - Coverage threshold check (min 80%)               │
└──────────────────────┬──────────────────────────────┘
                       │ (pass)
┌──────────────────────▼──────────────────────────────┐
│ Stage 3: Integration Tests                           │
│  - Spin up PostgreSQL + Redis test containers       │
│  - Run NestJS integration tests                     │
└──────────────────────┬──────────────────────────────┘
                       │ (pass)
┌──────────────────────▼──────────────────────────────┐
│ Stage 4: Security Scan                               │
│  - npm audit (fail on high/critical CVEs)           │
│  - Semgrep SAST                                     │
│  - Docker image scan (Trivy)                        │
└──────────────────────┬──────────────────────────────┘
                       │ (pass)
┌──────────────────────▼──────────────────────────────┐
│ Stage 5: Docker Build                                │
│  - Build multi-stage Docker images                  │
│  - Tag with git SHA + semantic version              │
│  - Push to container registry (ECR / GCR)          │
└──────────────────────┬──────────────────────────────┘
                       │ (pass)
┌──────────────────────▼──────────────────────────────┐
│ Stage 6: Deploy to Staging                           │
│  - Helm chart update / kubectl apply                │
│  - Run DB migrations                                │
│  - Smoke tests (health check endpoints)             │
│  - E2E tests against staging                        │
└──────────────────────┬──────────────────────────────┘
                       │ (pass)
┌──────────────────────▼──────────────────────────────┐
│ Stage 7: Manual Approval Gate                        │
│  - Slack notification to team                       │
│  - Reviewer approves in GitHub / Slack              │
└──────────────────────┬──────────────────────────────┘
                       │ (approved)
┌──────────────────────▼──────────────────────────────┐
│ Stage 8: Deploy to Production                        │
│  - Rolling deployment (zero downtime)               │
│  - Run DB migrations                                │
│  - Post-deploy smoke tests                          │
│  - Monitor error rates for 10 minutes               │
└─────────────────────────────────────────────────────┘
```

---

## GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  unit-tests:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
      redis:
        image: redis:7
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379

  security-scan:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: returntocorp/semgrep-action@v1

  build-and-push:
    needs: [unit-tests, integration-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: |
          helm upgrade --install api ./helm/api \
            --set image.tag=${{ github.sha }} \
            --namespace staging
      - name: Run migrations
        run: kubectl exec deploy/api -- npm run migration:run
      - name: Smoke test
        run: curl -f https://api-staging.domain.com/health

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://domain.com
    steps:
      - name: Deploy to production
        run: |
          helm upgrade --install api ./helm/api \
            --set image.tag=${{ github.sha }} \
            --namespace production
      - name: Run migrations
        run: kubectl exec deploy/api -- npm run migration:run
      - name: Smoke test
        run: curl -f https://api.domain.com/health
```

---

## Docker Configuration

### Backend Dockerfile (Multi-Stage)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: .
    ports: ['3000:3000']
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/fashion_dev
      REDIS_URL: redis://redis:6379
    depends_on: [postgres, redis]

  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: fashion_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports: ['5432:5432']

  redis:
    image: redis:7
    ports: ['6379:6379']

volumes:
  pgdata:
```

---

## Kubernetes (Helm Chart)

### Deployment Manifest (NestJS API)

```yaml
# helm/api/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: {{ .Values.replicaCount }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0       # Zero-downtime rolling deploy
  selector:
    matchLabels:
      app: api
  template:
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 3000
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 1500m
              memory: 1.5Gi
          envFrom:
            - secretRef:
                name: api-secrets
```

---

## Rollback Strategy

### Automatic Rollback

If post-deploy smoke tests fail, the pipeline automatically rolls back:

```bash
# Triggered if smoke test fails
helm rollback api --namespace production
```

Kubernetes rolling update guarantees that old pods are kept alive until new pods pass readiness probes — so no traffic is routed to failed pods.

### Manual Rollback

```bash
# View deployment history
helm history api --namespace production

# Roll back to previous release
helm rollback api 0 --namespace production

# Roll back to specific revision
helm rollback api 3 --namespace production
```

### Database Migration Rollback

Every migration must include a `down()` method:

```typescript
// 1700000000-AddLoyaltyTier.ts
export class AddLoyaltyTier1700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'loyalty_tier', type: 'enum',
      enum: ['bronze', 'silver', 'gold'], default: "'bronze'"
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'loyalty_tier');
  }
}
```

---

## Health Check Endpoint

```typescript
// GET /health
{
  "status": "ok",
  "timestamp": "2024-11-01T10:00:00Z",
  "version": "1.4.2",
  "git_sha": "a1b2c3d",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "s3": "ok"
  }
}
```

---

## Backup Strategy

| Resource | Method | Frequency | Retention |
|----------|--------|-----------|-----------|
| PostgreSQL | Automated RDS snapshots | Daily | 30 days |
| PostgreSQL WAL | Continuous WAL archiving to S3 | Continuous | 7 days |
| Redis | AOF persistence to disk | Continuous | — |
| S3 buckets | Cross-region replication | Real-time | Permanent |
| Application config | Git version control | Per commit | Permanent |

### Restore Procedure

```bash
# Restore PostgreSQL from snapshot (RDS)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier fashion-db-restored \
  --db-snapshot-identifier rds:fashion-db-2024-11-01

# Point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier fashion-db \
  --target-db-instance-identifier fashion-db-restored \
  --restore-time 2024-11-01T08:30:00Z
```

---

## Monitoring Post-Deploy

After every production deployment, an automated 10-minute monitoring window checks:

| Metric | Alert Threshold |
|--------|----------------|
| HTTP 5xx error rate | > 0.5% |
| API p99 latency | > 2 seconds |
| Database connection errors | Any |
| Payment failure rate | > 2% |

If any threshold is breached within 10 minutes of deployment, the pipeline automatically triggers a rollback and notifies the team via Slack and PagerDuty.

---

## Semantic Versioning

The platform follows **SemVer** (MAJOR.MINOR.PATCH):

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Breaking API change | MAJOR | 1.0.0 → 2.0.0 |
| New feature (backward-compatible) | MINOR | 1.0.0 → 1.1.0 |
| Bug fix / patch | PATCH | 1.0.0 → 1.0.1 |

Releases are tagged in Git and a changelog is auto-generated from commit messages using **Conventional Commits** format.
