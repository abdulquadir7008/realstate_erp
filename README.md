# EstateFlow AI — Multi-Tenant Real Estate ERP SaaS

A full-stack real estate ERP with CRM, inventory, finance, construction, procurement, HR, AI command center, and customer self-service portal. Monorepo managed with **pnpm 9** and **Node 20+**.

## Monorepo layout

| Package | Stack | Port |
| --- | --- | --- |
| `apps/api` (`@re/api`) | NestJS 11 + Prisma 6 + PostgreSQL + Redis/BullMQ + Socket.IO | **4010** |
| `apps/web` (`@re/web`) | Next.js 15 App Router + React 19 + Tailwind 3 + TanStack Query | **3001** |
| `apps/mobile` (`@re/mobile`) | Expo SDK 58 + expo-router + React Query + SecureStore | Expo dev server |
| `packages/shared` (`@re/shared`) | Shared types + validation (zod) | — |

## Quick start (local dev)

```bash
pnpm install

# Infrastructure (PostgreSQL on 5434, Redis on 6380)
docker compose up -d postgres redis

# Configure API env
cp apps/api/.env.example apps/api/.env   # if present; otherwise set DATABASE_URL/REDIS_* manually
# DATABASE_URL=postgresql://realestate:realestate@localhost:5434/realestate_erp?schema=public
# DIRECT_URL=same as DATABASE_URL
# REDIS_HOST=localhost  REDIS_PORT=6380

pnpm db:generate    # prisma generate
pnpm db:migrate     # apply migrations
pnpm db:seed        # base seed (admin org + users)
pnpm --filter @re/api exec tsx prisma/demo-seed.ts   # idempotent demo data

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

Set the API base URL with `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:4010/api/v1` for simulators; use your LAN IP for physical devices, e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.5:4010/api/v1`).

## Demo credentials

Password for all demo users: `Passw0rd1`

| Email | Role |
| --- | --- |
| `john@example.com` | Organization OWNER (full access, tenant "Test Builders") |
| `sales@demo.com` | Sales |
| `pm@demo.com` | Project manager |
| `acct@demo.com` | Accounts |
| `asha@demo.com` | **Customer** → logs into the customer portal only |

## Docker (production-style)

```bash
docker compose up --build   # api :4010, web :3001, postgres :5434, redis :6380
```

## Key features

- **Multi-tenant isolation** — every query scoped by `organizationId` from the JWT; enforced at the Prisma layer.
- **Role-based access** — granular `RequirePermissions('module:action')` guards; customers get a separate `@CustomerAllowed()` portal surface.
- **AI Command Center** (`/dashboard/ai`) — business assistant chat, lead scoring insights, finance collection insights, project health insights, and AI report generation. Runs offline in deterministic statistical mode when no LLM key is configured (`AI_ENABLED=false`); upgrades to live LLM with a key. Never fabricates numbers.
- **CRM Kanban** — drag-and-drop lead pipeline (NEW → CONVERTED) with follow-ups and activity timeline.
- **Inventory explorer** — buildings/floors/units with status filters and unit reservation.
- **Customer portal** (`/portal` on web, customer screen on mobile) — bookings, payment schedule, invoices, documents, construction progress, support tickets, profile.
- **Mobile app** — dashboard KPIs, CRM, inventory, finance, AI chat, and a module launcher with permission-aware tiles.

## Typecheck / build

```bash
pnpm typecheck      # all packages
pnpm build          # all packages
```

## API conventions

- Base URL: `http://localhost:4010/api/v1`
- Responses wrapped as `{ success: true, data: ... }`; clients unwrap `body?.data ?? body`
- Auth: `Authorization: Bearer <accessToken>` (login returns `data.tokens.accessToken`)
- Login response includes `user.isCustomer` — clients route customers straight to the portal
