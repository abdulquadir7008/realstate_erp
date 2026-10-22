# EstateFlow AI — Multi-Tenant Real Estate ERP & CRM SaaS

A full-stack real estate ERP with CRM, inventory, finance, construction, procurement, HR, workflow automation, an AI command center, and a customer self-service portal. Built as a **pnpm monorepo** on **Node 20+**.

## Monorepo layout

| Package | Stack | Port |
| --- | --- | --- |
| `apps/api` (`@re/api`) | NestJS 11 + Prisma 6 + PostgreSQL + JWT + Swagger | **4010** |
| `apps/web` (`@re/web`) | Next.js 15 App Router + React 19 + Tailwind 3 + TanStack Query | **3001** |
| `apps/mobile` (`@re/mobile`) | Expo SDK 58 + expo-router + React Query + SecureStore | Expo dev server |
| `packages/shared` (`@re/shared`) | Shared types, zod schemas, permission catalog, role templates | — |

## Features

### Dashboard & analytics

- **KPI dashboard** — live business overview from `/reports/dashboard`.
- **Reports & analytics** — sales, leads, inventory and construction reports; finance exposes outstanding and collections reports.
- **AI Command Center** (`/dashboard/ai`) — chat assistant with tool-calling over live ERP data (business overview, sales/collections trends, outstanding receivables, overdue demands, lead pipeline, inventory, construction, projects, customer search), AI-generated reports, conversation history, usage stats.
  - Uses an OpenAI-compatible `/chat/completions` endpoint (configurable via `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` — defaults to Hugging Face router).
  - Runs in **offline deterministic mode** when `AI_ENABLED=false` or no key is configured — answers are computed from database aggregates, never fabricated.

### Sales & CRM

- **Leads** — Kanban pipeline (`NEW → CONTACTED → QUALIFIED → SITE_VISIT → NEGOTIATION → CONVERTED / LOST`), sources, budget range, lead scoring, assignment to staff, activity timeline, follow-ups, convert lead to customer.
- **Customers** — customer master with codes, KYC status, contact details, source, org linkage, portal account linkage.
- **Bookings** — unit reservation, booking creation with payment plan, confirm, cancel, discount approval, status history; auto-marks units as booked/reserved.
- **Sales view** — booking and revenue oriented workspace.

### Property & inventory

- **Projects** — residential/commercial/plot/villa/mixed-use projects with codes, status, budget, dates, location, milestones and progress tracking.
- **Inventory** — buildings (towers/blocks/villa rows/plot sections), floors, units (apartment/villa/plot) with configuration, carpet/built-up/super built-up areas, base price and price per sqft, facing, parking slots, status lifecycle (`AVAILABLE`, `RESERVED`, `ON_HOLD`, `BOOKED`, `SOLD`), bulk unit creation and status changes.

### Finance

- **Payment plans** — percentage/amount milestone templates (construction-linked etc.), default plan per project.
- **Demands** — generated per booking with schedules, statuses (`DUE`, `PARTIAL`, `PAID`, `OVERDUE`) and waive action.
- **Payments** — record payments against demands or as direct payments, allocations, success workflow.
- **Receipts** — auto-numbered receipts linked to payments.
- **Refunds** — request and approval workflow.
- **Invoices** — sales invoices, line items, tax totals, paid/partial status, **PDF generation** (PDFKit).
- **Accounts & ledger** — chart of accounts, ledger entries.
- **Expenses** — expense categories, expenses with approval status.
- **Reports** — outstanding receivables and collections summaries.
- **Taxation** — tax rates per organization (GST/CGST/SGST/IGST defaults in org settings), financial years.

### Construction

- **Tasks** — statuses (`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`), priorities, assignees, due dates, project linkage.
- **Daily site reports** — progress notes per project.
- **Inspections** — quality/safety inspection records.
- **Milestones** — project milestone progress feeding the customer portal.

### Procurement

- **Vendors** — supplier master.
- **Materials & categories** — item catalog with codes and units.
- **Warehouses** — storage locations.
- **Stock & stock moves** — on-hand quantities and inward/outward transactions.
- **Requisitions** — raise and approve/reject material requests.
- **Purchase orders** — create, track, update status.
- **GRN** — goods receipt notes against purchase orders.

### HR

- **Employees** — staff directory with departments/branches.
- **Attendance** — daily attendance records.
- **Leave requests** — apply, approve/reject.

### Service & documents

- **Support tickets** — ticket numbers, categories, priority, status, SLA due date, threaded messages, customer linkage.
- **Handovers** — possession/handover records per booking/unit.
- **Document vault** — folders (booking/agreement/payment/etc.), versions, visibility (`CUSTOMER`/internal), status, grouping; customer-visible documents surface in the portal.

### Automation

- **Workflows** — definitions with triggers/actions, execution history, manual run.
- **Notifications** — targeted to a user or role code, unread count, mark-one/mark-all read, delete.

### Administration

- **Organization** — profile, settings (currency, locale, GST rates, document number prefixes).
- **Branches & departments**.
- **Financial years**.
- **Tax rates**.
- **Users** — create, invite, update, suspend, delete; role assignment.
- **Roles & permissions** — custom roles plus system templates (`OWNER`, `ADMIN`, `DIRECTOR`, `SALES_MANAGER`, `SALES_EXECUTIVE`, `CRM_EXECUTIVE`, `ACCOUNTANT`, `FINANCE_MANAGER`, `PROJECT_MANAGER`, `CONSTRUCTION_MANAGER`, `SITE_ENGINEER`, `INVENTORY_MANAGER`, `HR_MANAGER`, `DOCUMENT_MANAGER`, `CUSTOMER_SUPPORT`, `BROKER`, `CUSTOMER`), granular `module:action` permissions (342 seeded).
- **SaaS admin** — platform-scope organization listing (`SUPER_ADMIN` only).

### Customer portal

- **Web** (`/portal`) — overview, my property, payments & dues schedule, invoices, documents, construction progress, support tickets, notifications & profile.
- **API** (`/portal/*`) — session, overview, properties, booking detail, payment schedule, payments, invoices, documents, construction, tickets (list/create/reply), notifications, profile update. Customer accounts are isolated via `@CustomerAllowed()` guards.

### Mobile app (Expo)

- Login, tabbed workspace (dashboard KPIs, CRM, finance, inventory, more), lead detail, unit detail, AI chat, module launcher with permission-aware tiles, customer portal info screen.

## Services & integrations

### Runtime services

| Service | Details |
| --- | --- |
| **NestJS API** | REST API on `PORT` (default `4010`), global prefix `/api/v1`, binds `0.0.0.0`; Swagger UI at `/docs`; health probe at `GET /api/v1/health` |
| **Next.js web app** | App Router, standalone output for Docker, API proxy rewrite `/api/backend/*` |
| **Expo mobile app** | React Native client using `EXPO_PUBLIC_API_URL` |
| **PostgreSQL 16** | Prisma 6 ORM; local Docker on `5434`, production on Neon Postgres (pooled runtime URL + direct migration URL) |
| **Redis 7** | Provisioned local Docker on `6380`; `ioredis`/`bullmq` available for background jobs (`JOBS_ENABLED`) |
| **JWT auth** | Access token (default `15m`) + refresh token (`30d`, stored hashed); bcrypt password hashing (cost 12) |
| **API hardening** | Helmet, CORS with exact origins + credentials, cookie parser, global exception filter, throttling (300 requests/min) |
| **Reports/PDF** | Invoice PDFs via PDFKit |
| **Swagger/OpenAPI** | Auto-generated docs from controllers and DTO descriptions |

### Configured integrations (environment-driven)

| Integration | Env vars | Status |
| --- | --- | --- |
| **AI / LLM** | `AI_ENABLED`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | Implemented — OpenAI-compatible provider with deterministic offline fallback |
| **Storage** | `STORAGE_DRIVER` (`local`/`s3`/`r2`), `STORAGE_LOCAL_DIR`, `S3_*` | Document metadata/versions implemented; storage driver settings reserved for binary file storage |
| **Email (SMTP)** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Config slots provisioned (invites/notifications) |
| **Payments (Razorpay)** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Config slots provisioned; manual payment recording is implemented |
| **Redis / queues** | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `JOBS_ENABLED` | Config provisioned; BullMQ toolchain available |

## Security & multi-tenancy

- Every request resolves a tenant from the JWT; queries are automatically scoped by `organizationId` at the Prisma layer (`PrismaService` tenant proxy).
- Global guards: `ThrottlerGuard` → `JwtAuthGuard` → `PermissionsGuard`. Public routes opt out with `@Public()` (auth, health); customer routes use `@CustomerAllowed()`; platform routes use `@SaasOnly()`.
- Responses are wrapped as `{ success: true, data: ... }`; errors as `{ success: false, error: { code, message } }`.
- RBAC uses granular `module:action` permission codes; `OWNER`/`ADMIN`/`SUPER_ADMIN` receive `*`.

## API surface

Base URL: `http://localhost:4010/api/v1` · Swagger: `http://localhost:4010/docs`

| Module | Base path | Key operations |
| --- | --- | --- |
| Health | `/health` | Liveness + database probe (public) |
| Auth | `/auth` | Register organization, login (access + refresh tokens) |
| Users | `/users` | CRUD, invite, suspend |
| Roles | `/roles` | CRUD, permission catalog |
| Organization | `/organization` | Profile, settings, branches, departments, financial years, tax rates |
| SaaS admin | `/saas-admin` | List organizations (platform scope) |
| Projects | `/projects` | CRUD, milestones |
| Inventory | `/inventory` | Buildings, floors, units (bulk create, status) |
| Customers | `/customers` | CRUD |
| Leads | `/leads` | CRUD, assign, activities, follow-ups, convert |
| Bookings | `/bookings` | Create, reserve, confirm, cancel, discount approval, status |
| Finance | `/finance` | Payment plans, demands, payments, receipts, refunds, invoices (+PDF), accounts, ledger, expenses, outstanding/collections |
| HR | `/hr` | Employees, attendance, leaves (+decide) |
| Procurement | `/procurement` | Vendors, materials, categories, warehouses, stock, moves, requisitions, purchase orders, GRN |
| Construction | `/construction` | Tasks, site reports, inspections |
| Tickets | `/tickets` | Tickets, messages, handovers |
| Documents | `/documents` | CRUD, versions |
| Workflows | `/workflows` | CRUD, executions, run |
| Notifications | `/notifications` | List, unread count, mark read, delete |
| Reports | `/reports` | Dashboard, sales, leads, inventory, construction |
| AI | `/ai` | Status, insights (leads/finance/projects), report generation, conversations, usage |
| Portal | `/portal` | Customer session, overview, properties, schedule, payments, invoices, documents, construction, tickets, notifications, profile |

## Quick start (local dev)

```bash
pnpm install

# Infrastructure (PostgreSQL on 5434, Redis on 6380)
docker compose up -d postgres redis

# Configure API env
cp .env.example apps/api/.env    # then fill DATABASE_URL / DIRECT_URL / JWT secrets
# DATABASE_URL=postgresql://realestate:realestate@localhost:5434/realestate_erp?schema=public
# DIRECT_URL=same as DATABASE_URL
# REDIS_HOST=localhost  REDIS_PORT=6380

pnpm db:generate    # prisma generate
pnpm db:migrate     # apply migrations
pnpm db:seed        # permissions, plans, platform org + super admin
pnpm --filter @re/api db:seed:demo   # idempotent demo tenant data

# Run API + web together
pnpm dev
# or separately:
pnpm dev:api        # http://localhost:4010/api/v1
pnpm dev:web        # http://localhost:3001
```

### Mobile (Expo)

```bash
cd apps/mobile
pnpm start          # Expo dev server (Metro)
# or: pnpm android / pnpm ios
```

Set `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:4010/api/v1`; use your LAN IP for physical devices).

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Runtime mode |
| `PORT` / `API_PORT` | `4010` | API listen port (`PORT` wins on Render) |
| `API_PREFIX` | `api/v1` | Global route prefix |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated exact allowed origins |
| `DATABASE_URL` | — (required) | PostgreSQL URL (pooled in production) |
| `DIRECT_URL` | — | Direct PostgreSQL URL for Prisma migrations |
| `JWT_ACCESS_SECRET` | — (required, ≥16 chars) | Access token secret |
| `JWT_REFRESH_SECRET` | — (required, ≥16 chars) | Refresh token secret |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `30d` | Token lifetimes |
| `AUTO_APPROVE_ORGS` | `true` | Auto-activate newly registered organizations |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost` / `6380` / — | Redis connection |
| `JOBS_ENABLED` | `true` | Background jobs toggle |
| `STORAGE_DRIVER` / `STORAGE_LOCAL_DIR` | `local` / `./storage/uploads` | File storage |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — / `ap-south-1` / — | S3/R2 storage |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `MAIL_FROM` | — / `587` / — | Email |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | — | Payment gateway |
| `AI_ENABLED` / `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | `false` / HF router / — / `HuggingFaceH4/zephyr-7b-beta` | AI provider |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4010/api/v1` | Web/mobile API base |
| `API_PROXY_URL` | falls back to `NEXT_PUBLIC_API_URL` | Next.js `/api/backend/*` rewrite target |

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run API + web in parallel |
| `pnpm dev:api` / `pnpm dev:web` | Run one app |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm test` | Run workspace tests (where present) |
| `pnpm db:generate` | Prisma client generation |
| `pnpm db:migrate` | Apply migrations in dev |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:seed` | Base seed (permissions, plans, super admin) |
| `pnpm --filter @re/api db:seed:demo` | Demo tenant, projects, inventory, CRM/finance data |
| `pnpm --filter @re/api db:studio` | Prisma Studio |

## Demo data

`pnpm --filter @re/api db:seed:demo` (idempotent) creates the **Test Builders** tenant with two projects, a 12-unit tower, milestones, construction tasks, leads, customers, bookings, demands, payments, invoices, documents, a support ticket and notifications.

Password for all demo users: `Passw0rd1`

| Email | Role |
| --- | --- |
| `john@example.com` | Organization OWNER (full access) |
| `sales@demo.com` | Sales |
| `pm@demo.com` | Project manager |
| `acct@demo.com` | Accounts |
| `asha@demo.com` | **Customer** → customer portal only |

> The demo seed expects the organization to exist (register it via the API or create it in the app first).

## Docker (production-style)

```bash
docker compose up --build   # api :4010, web :3001, postgres :5434, redis :6380
```

## Deployment

### API — Render (Docker)

`render.yaml` defines the `realstate-erp-api` service (Docker, `apps/api/Dockerfile`) with health check `GET /api/v1/health`.

Required dashboard env vars: `DATABASE_URL` (Neon pooled URL), `DIRECT_URL` (Neon direct URL), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS` (exact frontend origin), optional Redis/AI/payment/email vars.

- The container binds `process.env.PORT` on `0.0.0.0`.
- Migrations are **not** run at container startup; apply them from your machine with `pnpm db:deploy` (uses `DIRECT_URL`).
- Keep the health endpoint public — it is also the Render health check.

### Web — Vercel

- **Root Directory**: `apps/web` (framework detection needs the `next` dependency there).
- **Output Directory**: leave blank — `apps/web/vercel.json` sets `.next` and runs the monorepo-aware install/build.
- Env vars: `NEXT_PUBLIC_API_URL` and `API_PROXY_URL` pointing to the Render API (`https://<service>.onrender.com/api/v1`).

### Database — Neon Postgres

- `DATABASE_URL` = pooled connection string (`-pooler` host, `sslmode=require`).
- `DIRECT_URL` = direct connection string, used only for migrations.

## Typecheck / build

```bash
pnpm typecheck
pnpm build
```

## API conventions

- Base URL: `http://localhost:4010/api/v1`
- Success envelope: `{ success: true, data: ... }`; clients unwrap `body?.data ?? body`
- Auth: `Authorization: Bearer <accessToken>` (login returns `data.tokens.accessToken`)
- Login response includes `user.isCustomer` — clients route customers straight to `/portal`
- Errors include a stable `code` (e.g. `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`) and message
