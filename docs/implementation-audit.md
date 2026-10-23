# EstateFlow AI — Implementation Audit

Date: 2026-10-21
Repository: `realstate_erp` (pnpm monorepo)
Audit type: static implementation review plus non-mutating verification commands
Status: **Not production-ready as an ERP/billing system.** Broad CRUD coverage exists, but several advertised integrations, concurrency controls, and account-lifecycle flows are missing or simulated.

---

## 1. Scope and method

Reviewed:

- `apps/api` (NestJS 11 + Prisma 6): modules, guards, tenant proxy, schema, migrations, seed/demo seed.
- `apps/web` (Next.js 15): routing surface, API client, module configuration.
- `apps/mobile` (Expo): route surface and API/auth helpers (untracked directory).
- `packages/shared`: permission catalog, role templates, enums, Zod schemas.
- Deployment/config: `docker-compose.yml`, `render.yaml`, `apps/api/Dockerfile`, `apps/web/vercel.json`, `.env.example`, `apps/api/src/config/configuration.ts`.
- `README.md` claims against actual code.

Not performed:

- No mutating API calls, no database writes, no seed execution, no cloud console inspection.
- No web/mobile production build, no Docker image build, no E2E/browser testing.
- No inspection of the live Neon data, so runtime row state (for example, permissions granted to the existing demo owner) is not verified.
- No secrets were read or reproduced.

Status vocabulary used below:

| Status | Meaning |
| --- | --- |
| Implemented | Endpoint/service logic exists and is wired. |
| Partial | Works for a subset, or has a material correctness/security gap. |
| Simulated | Records intent/history but performs no real external action. |
| Config-only | Env var, enum, model, or UI flag exists with no backing implementation. |
| Missing | No implementation found. |
| Unverified | Could not be validated without runtime/build/cloud access. |

---

## 2. Verification commands

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `pnpm typecheck` | **Passes** — 4 workspace projects (`shared`, `web`, `mobile`, `api`). No test execution. |
| Prisma schema | `pnpm --filter @re/api exec prisma validate` | **Passes** — schema valid. |
| Tests | `pnpm test` (`pnpm -r --if-present test`) | **Passes** — Jest config at `apps/api/jest.config.js`; 5 suites / 18 tests covering permissions, SaaS scope enforcement, booking unit-claim transitions, and payment idempotency/allocation capping. No database-backed integration or E2E coverage yet. |
| Lint | — | No lint script found in root/API package scripts. |
| Build | — | Not run in this audit. |

Migrations present (only three):

- `apps/api/prisma/migrations/20261018112648_init/migration.sql` (1698 lines)
- `apps/api/prisma/migrations/20261018113045_add_password_reset/migration.sql`
- `apps/api/prisma/migrations/20261020033952_add_customer_user_link/migration.sql`
- `migration_lock.toml`

Typechecking cleanly while only a permission-model smoke test exists means compile-time safety remains the primary automated quality gate.

---

## 3. Executive summary

### Highest-severity findings

1. **SaaS admin organization listing was not SaaS-only and is globally unscoped — fixed in the working tree.** The controller previously relied only on `@RequirePermissions('organization:read')` (`saas-admin.controller.ts`), while every tenant `OWNER`/`ADMIN` receives a session wildcard (`auth.service.ts:133`). It now also carries `@SaasOnly()`. `Organization` still has no `organizationId`, so platform queries remain intentionally unscoped and must stay behind the SaaS scope check (`prisma.service.ts:11,87`; `saas-admin.service.ts:8-19`). Covered by controller-metadata and guard tests.
2. **Unit reservation/booking was race-prone — fixed in the working tree.** Availability was read before the transaction, then the unit was updated unconditionally. `reserve`/`create` now claim the unit with an atomic `updateMany` constrained to `status: 'AVAILABLE'`, and `confirm`/`cancel` use conditional status transitions (`bookings.service.ts`). Covered by 5 service tests. Remaining caveat: `generateDemands` still uses a count-then-create pattern.
3. **Payment gateway integration and webhook verification are missing; payment idempotency and allocation locking are fixed in the working tree.** Payments now dedupe by `(organizationId, gateway, gatewayPaymentId)`, including concurrent unique-conflict replay, and demand rows are locked and capped during allocation (`finance.service.ts`). There is still no Razorpay SDK usage, no webhook route/signature verification, and no reconciliation job.
4. **Document management stores metadata only.** Documents/versions persist `fileName`, `mimeType`, `sizeBytes`, and `storageKey` (`documents.service.ts:52-99`), but there is no upload endpoint, no multipart handling, no S3/R2/local writer, no download endpoint, and no signed URLs. The `api_storage` Docker volume is unused by application code.
5. **Organization approval and subscriptions are not enforced.** Registration can leave an organization `PENDING` (`auth.service.ts:39`), but login and guards never check organization status. A `TRIALING` subscription is created (`auth.service.ts:61-75`) and never checked for expiry, status, or plan limits.

### Positive findings

- Tenant scoping is centrally implemented through a Prisma proxy plus `AsyncLocalStorage` request context (`prisma.service.ts:78-124`; `tenant-context.ts`; `tenant-context.interceptor.ts`).
- Most business modules enforce permission decorators; portal endpoints are class-level `@CustomerAllowed()`, and portal queries are scoped to the linked customer (`common/guards/permissions.guard.ts`; `portal.service.ts:12-58`).
- Session building grants a wildcard to `OWNER`, `ADMIN`, and `SUPER_ADMIN` role codes, so newly registered owners do have effective access (`auth.service.ts:125-134`; `roleHasPermission` at `roles.ts:323-325`).
- Input validation is consistently Zod-based, and responses are normalized with a global envelope and Decimal/Date serialization (`response.interceptor.ts`).
- Business numbering uses a race-safe `Counter` upsert with an explicit organization key (`common/utils/sequence.ts`).
- Passwords use bcrypt cost 12; JWTs are verified per request with user-status re-checks (`auth.service.ts`; `jwt-auth.guard.ts:38-66`).
- Health endpoint performs a real database probe (`health.controller.ts:17`).
- Typecheck and Prisma validation pass; migrations and an idempotent demo seed exist.

---

## 4. Feature matrix

| Area | Status | Evidence / notes |
| --- | --- | --- |
| Multi-tenant data isolation (standard Prisma calls) | Implemented | Proxy injects `organizationId` for `create/createMany/find*/count/aggregate/groupBy/update*/delete*/upsert` (`prisma.service.ts:36-76`); ALS context from JWT org (`tenant-context.interceptor.ts`). |
| Tenant isolation for raw SQL | Partial | `$queryRaw` bypasses the proxy (`prisma.service.ts:103`). Existing uses are health `SELECT 1` and sequence SQL with explicit `organizationId` (`health.controller.ts:17`; `sequence.ts:54`), but there is no guardrail for future raw queries. |
| Cross-tenant SaaS administration | Implemented (fixed) | Only `GET /saas-admin/organizations`; now protected by `@SaasOnly()` plus `organization:read`; `Organization` remains globally unscoped by design behind that check. Platforms still lack plan/subscription/billing admin APIs. |
| RBAC catalog and guards | Partial | 38 modules × 9 actions = 342 permissions (`packages/shared/src/permissions.ts`), guard supports wildcard (`roles.ts:323-325`); session building grants `'*'` for `OWNER`/`ADMIN`/`SUPER_ADMIN` (`auth.service.ts:133`), while provisioning stores no wildcard row. |
| Auth: register/login | Implemented | `POST /auth/register`, `POST /auth/login`; organization + system roles + trial subscription creation (`auth.service.ts:17-108`). |
| Auth: refresh/logout | Missing | Refresh tokens are generated and stored hashed (`auth.service.ts:153-165`), but no refresh/logout endpoints exist. Clients store `re_refresh_token` without using it. |
| Auth: password reset | Missing | `PasswordResetToken` model exists and migration `add_password_reset` exists; no endpoint or service uses the model. |
| Auth: invitations | Partial | Invite creates `INVITED` user + `Invitation` rows and returns a raw token (`users.service.ts:116-154`); no email delivery and no accept-invitation endpoint. |
| Organization approval / subscription enforcement | Missing | `PENDING` status is set at registration (`auth.service.ts:39`), but login and guards do not check organization status. `Subscription` is created at registration and never enforced on requests. |
| CRM: leads, activities, follow-ups, conversion | Implemented | `leads.service.ts`; activity/follow-up/assignment and conversion timestamps. |
| Customers + optional portal account | Implemented | CRUD, code generation, optional linked user with password (`customers.service.ts:72-105`). |
| Projects/buildings/floors/units | Implemented | `projects`, `inventory` modules; schema models. |
| Booking lifecycle | Implemented (fixed) | Reserve/create/confirm/cancel/discount/demand generation exist (`bookings.service.ts`). Unit claims and status transitions are now conditional/atomic; demand generation remains count-then-create. |
| Payment plans, demands, payments, receipts, refunds, invoices | Partial | Core ledger-style flows and PDF invoice exist (`finance.service.ts`; PDF at `:441`); gateway payment IDs are idempotent and allocation is row-locked, but there is no gateway client/webhook and no reconciliation job. |
| Expenses, accounts, ledger, reports | Implemented | CRUD plus outstanding/collections reports (`finance.service.ts:470-620`). |
| Procurement: requisitions, POs, GRN, stock moves | Partial | CRUD and stock movement exist; negative stock is allowed. `createStockMove` uses `Math.max(delta,0)` only on create and raw increment on update (`procurement.service.ts:184-200`). |
| Construction: tasks, daily reports, quality inspections | Implemented | `construction.service.ts`; schema models. |
| Documents | Partial / metadata-only | CRUD + version records; no binary storage, upload/download, or signed URLs (`documents.service.ts`). |
| Notifications | Partial / in-app only | `Notification` rows with list/unread count/create (`notifications.service.ts`); no email, SMS, push, or WhatsApp sender. |
| WhatsApp | Config-only | `whatsappEnabled` organization setting (`packages/shared/src/schemas/organization.ts`); no client, sender, templates, or webhook. |
| Email | Config-only | SMTP env keys and `nodemailer` dependency exist; no `nodemailer` usage in `apps/api/src`. |
| Push notifications | Missing | `NotificationChannel` includes `PUSH`; no push provider/token registration. |
| Jobs/queues/schedulers | Missing | `bullmq`/`ioredis` dependencies present; no `BullModule`, worker, cron, or scheduler in `apps/api/src`. |
| Workflow engine | Simulated | Definitions CRUD and manual run; actions are recorded as `SIMULATED` (`workflows.service.ts:71-91`). No trigger listeners for `LEAD_CREATED`, `PAYMENT_RECEIVED`, etc. |
| Webhooks | Missing | `WebhookEvent` model and a `RAZORPAY_WEBHOOK_SECRET` env key exist; no controller/route/verification. |
| AI assistant | Partial | OpenAI-compatible provider with timeout + deterministic offline fallback (`ai.provider.ts`), tenant-scoped tool calls (`ai.service.ts`), 5-iteration cap. All routes are gated on `settings:*`, so sales/project roles cannot use AI (`ai.controller.ts`). |
| Audit trail | Missing | `AuditLog` model is unused; no interceptor writes audit records. |
| Login activity | Missing | `LoginActivity` model is unused. |
| Imports/exports | Missing | `ImportJob` model and `exceljs` dependency are unused. |
| Commissions | Missing | `Commission` model is unused. |
| Document versions | Partial | `DocumentVersion` rows created; no stored binaries. |
| Portal (customer) | Implemented | 15 endpoints under `portal.controller.ts`, all `@CustomerAllowed()`, scoped to linked customer. |
| Web UI | Implemented / broad | 18 `page.tsx` routes including dynamic `dashboard/[module]`; generic module UI driven by `lib/modules.ts` (~54 KB). |
| Mobile app | Partial / unverified | Expo routes exist (dashboard, CRM, finance, inventory, AI, unit, lead, portal info, login), but directory is untracked and not built/tested. |
| Tests | Partial | Jest configured (`apps/api/jest.config.js`); 5 suites / 18 tests pass, including booking and payment service paths. Integration and E2E tests are still missing. |
| Docker/deploy config | Implemented / unverified | Compose (Postgres 5434, Redis 6380, API 4010, web 3001), Render Docker health check, Vercel config. Migrations are not run at container start by design. |

---

## 5. Detailed findings

### 5.1 Medium — owner/admin access relies on a session-level wildcard, not persisted permissions

- `ROLE_TEMPLATES.OWNER` and `ADMIN` declare `permissions: ['*']` (`packages/shared/src/roles.ts:37-49`).
- `ensureSystemRoles` filters wildcard entries out (`auth.service.ts:185`) and stores only concrete codes, so these roles can legitimately have zero `RolePermission` rows.
- `buildSession` compensates by adding `'*'` whenever a user has a role code `OWNER`, `ADMIN`, or `SUPER_ADMIN` (`auth.service.ts:133`), and `roleHasPermission` honors it (`roles.ts:323-325`). Authorization therefore works for new tenant owners.
- Residual issue: the role list/detail views report `permissionCount: 0` and an empty permission array for owner/admin (`roles.service.ts:14-52`), which is misleading in the admin UI and any integration that reads persisted permissions instead of the session.
- There is no automated regression test proving that a newly registered owner can call a permission-gated route.

Remediation: keep the session wildcard as an explicit documented rule, or persist a wildcard/expanded set for consistency, and update role read models to display the effective permission set. Add a registration → `dashboard:read`/`project:read` regression test.

### 5.2 Critical — SaaS admin tenant enumeration was mis-authorized (fixed in working tree)

- `@SaasOnly()` is defined (`common/decorators.ts`) and enforced by `PermissionsGuard` (`permissions.guard.ts:16-19,29-31`).
- Before the fix, `SaasAdminController` was guarded only by `@RequirePermissions('organization:read')`; every tenant `OWNER`/`ADMIN` receives the session wildcard and therefore passed.
- The controller now carries `@SaasOnly()` at class level (`saas-admin.controller.ts`), so tenant users are rejected before the permission check.
- `SaasAdminService` extends `TenantService`; both are in `saas-admin.service.ts`. `listOrgs` calls `organization.findMany` and `organization.count` with no tenant filter (`saas-admin.service.ts:8-19`). This remains intentionally unscoped for a SaaS-only route.
- The proxy only scopes models that have an `organizationId` field (`prisma.service.ts:11,36-38`). `Organization` does not, so no filter is injected (`prisma.service.ts:87`); any future platform route must repeat the `@SaasOnly()` protection.
- Also, the SaaS surface is much smaller than the README implies: only a list endpoint; no plan/subscription/invoice administration despite `SaaSInvoice`, `Plan`, and `Subscription` models.

Verification: controller metadata test confirms `@SaasOnly()` and `organization:read`; guard test confirms a TENANT user with `'*'` is rejected while a SAAS user passes (`saas-admin.controller.spec.ts`, `permissions.guard.spec.ts`).

### 5.3 High — booking/reservation concurrency could double-book a unit (fixed in working tree)

Before the fix, `reserve` read `unit.status` outside the transaction and then updated the unit unconditionally; `create` had the same shape, and `confirm`/`cancel` performed unconditional status writes.

Changes in `apps/api/src/modules/bookings/bookings.service.ts`:

- `claimUnit` performs a single atomic `updateMany` with `where: { id, deletedAt: null, status: 'AVAILABLE' }` and requires `count === 1`. `reserve` and `create` call it inside their transactions before creating the booking.
- `create` now rejects any unit whose current status is not `AVAILABLE`, preventing a second booking from being created on an already reserved/booked unit.
- `confirm` transitions the booking with `updateMany` restricted to `DRAFT`/`RESERVED`/`PENDING_APPROVAL`, then claims the unit from `AVAILABLE`/`ON_HOLD`/`RESERVED`. A lost race produces a conflict instead of overwriting state.
- `cancel` transitions with `updateMany` excluding `CANCELLED`/`REFUNDED`/`COMPLETED`, and only releases units in `ON_HOLD`/`RESERVED`/`BOOKED`/`AGREEMENT_PENDING`, so a sold unit is not silently reopened.

Verification: 5 service tests cover successful claims, lost claims for reserve and create, and stale confirm/cancel transitions (`bookings.service.spec.ts`).

Residual caveat: `generateDemands` still checks `paymentDemand.count` and then creates demands, which is not atomic if it is ever invoked concurrently for the same booking. Add a unique constraint or an upsert/idempotency guard when payment scheduling is hardened.

### 5.4 High - payment gateway integration and webhook verification are missing

Payment persistence is now idempotent and allocation-safe in the working tree:

- `Payment` has a composite unique key on `(organizationId, gateway, gatewayPaymentId)`; a repeat call with the same gateway payment ID returns the existing payment/receipt instead of creating another (`finance.service.ts`; migration `20261021120000_payment_gateway_idempotency`).
- Concurrent unique-conflict races are replayed by reading the winning payment (`P2002` handling).
- Allocation now locks each demand row with `SELECT ... FOR UPDATE`, caps applied amounts at both the demand balance and the unallocated payment amount, and updates the balance inside the same transaction.
- Covered by 5 finance service tests for replay, race replay, demand-balance capping, payment-amount capping, and missing/paid demands.

Remaining:

- No Razorpay SDK dependency or usage, no webhook controller, no signature verification. `RAZORPAY_*` exists only in configuration/env.
- Manual payments without a `gatewayPaymentId` are still not idempotent.
- No reconciliation job exists to detect orphaned gateway payments.

Remediation: implement gateway client/webhook routes with signature verification and reconciliation reporting; keep the payment idempotency and allocation path as the persistence layer.

### 5.5 High — documents and storage are metadata-only

`documents.service.ts` creates and versions records with client-supplied `storageKey` and `sizeBytes` (`:52-99`). There is:

- no `POST` multipart upload route,
- no storage driver implementation despite `STORAGE_DRIVER=local|s3|r2` and `S3_*` config,
- no download route, signed URL, or access check,
- no S3 client usage in `apps/api/src`,
- no binary write to the `api_storage` volume.

Impact: the "document vault" is a catalogue, not a document system. A customer-visible document record has no retrievable content. The README/deployment volume implies functionality that does not exist.

### 5.6 High — account lifecycle and revocation gaps

- Only register and login routes exist. `RefreshToken` rows are created (`auth.service.ts:158-164`) but never consumed, rotated, or revoked by a refresh endpoint; there is no logout.
- No forgot/reset password endpoints, despite `PasswordResetToken` and a dedicated migration.
- No invitation acceptance endpoint; invites return a raw token in the API response (`users.service.ts:140-154`) and send no email.
- Access tokens are 15 minutes (`JWT_ACCESS_TTL=15m`), so permission/role changes and suspending a user take up to 15 minutes to apply. `JwtAuthGuard` re-checks `status`/`deletedAt` but not role/permission changes (`jwt-auth.guard.ts:38-66`).
- Refresh tokens never expire in practice at the DB level unless cleaned manually; there is no cleanup job.
- Web stores access/refresh tokens in `localStorage`; mobile stores them in SecureStore. No refresh flow exists in either client.

### 5.7 High — subscription/plan and organization approval are not enforced (fixed in working tree)

- Registration creates a `TRIALING` subscription if the default plan exists (`auth.service.ts:61-75`).
- Request paths now check organization status and subscription state: `TenantAccessService` (`common/access/tenant-access.service.ts`) centralizes the logic; `AuthService.login` and `JwtAuthGuard` both invoke it.
- Config flags: `ENFORCE_SUBSCRIPTION` (default `true`), `SUBSCRIPTION_GRACE_DAYS` (default 7). Expired trials, cancelled/expired subscriptions, and past-due beyond the grace window all block access.
- SaaS admin gained `POST /saas-admin/organizations/:id/status` (`organization:manage`) to approve/suspend/reject/cancel orgs, and `GET /saas-admin/organizations/:id` (`organization:read`) to inspect them.
- Plan limits (maxUsers, maxProjects, maxAiRequests) are still not enforced on requests.

### 5.8 Medium — notification channels are unimplemented

`NotificationChannel` includes `IN_APP`, `EMAIL`, `PUSH`, `SMS` (`packages/shared/src/enums.ts:214`), and organization settings include `emailNotifications`, `paymentReminders`, `reminderDaysBefore`, and `whatsappEnabled`. Only in-app rows are created/read (`notifications.service.ts`). `nodemailer` and `ioredis`/`bullmq` are installed but unused.

There is no WhatsApp integration at any layer: no provider client, no template management, no outbound sender, no inbound webhook. The organization toggle is cosmetic.

### 5.9 Medium — workflow engine only simulates actions

`workflows.service.ts:71-91` records an execution with each action marked `SIMULATED`. No code subscribes to domain events such as booking confirmation, payment receipt, or demand overdue. `WorkflowTrigger` values exist only as enum/definition metadata.

Impact: automations shown in the product do not run. Manual "run" gives a false impression of execution.

### 5.10 Medium — procurement can drive stock negative

`createStockMove` validates that the material exists but not that sufficient stock is on hand (`procurement.service.ts:184-200`). For outbound moves, `materialStock.upsert` increments by a negative delta without a floor check, and on first create clamps to zero, silently discarding the deficit. This corrupts inventory valuation and availability.

### 5.11 Medium — audit/compliance data is not recorded

`AuditLog`, `LoginActivity`, `ImportJob`, `Commission`, `PaymentPlanMilestone`, `SaaSInvoice`, and `WebhookEvent` are unused in `apps/api/src` (zero references). This means no durable audit trail for financial or permission changes, no login history, no commission calculation, and no import pipeline.

### 5.12 Medium — AI authorization and scope

- Every AI route requires `settings:read`, `settings:create`, or `settings:manage` (`ai.controller.ts:19-79`). Sales, CRM, and project roles typically lack `settings:*`, so the assistant is unusable for the roles that would benefit most.
- AI tools execute through the tenant-proxied Prisma client, which provides organization scoping, but there are no per-tool permission checks. A user with settings read access can ask the assistant for data they may not otherwise be allowed to query through normal endpoints.
- Provider behavior is safer than it appears: 30-second abort timeout and deterministic offline fallback (`ai.provider.ts`), and tool iterations are capped at 5.
- `AI_ENABLED` and organization `aiEnabled` exist; confirm both are actually enforced by `AiService.status()` before relying on them.

### 5.13 Medium — tenant proxy edge cases

The proxy is a good baseline but not a complete isolation boundary:

- Raw SQL (`$queryRaw`, `$executeRaw`) bypasses injection; only two current call sites, both safe by construction.
- Nested writes are not recursively injected. Only top-level `data` receives `organizationId` (`prisma.service.ts:40-51`); code that creates nested rows must set `organizationId` manually.
- Global/platform models without `organizationId` are not scoped by design (`Organization`, `Plan`, `Permission`); any route exposing them must perform its own authorization.
- `withTenant` exists (`prisma.service.ts:147-153`) but no module uses it; background jobs would need it once queues are added.
- The proxy is attached in the constructor and also exposed as `db`; services receive the proxy, but a future direct `new PrismaClient()` or a raw connection would silently bypass scoping.

### 5.14 Medium — test coverage is minimal

- Jest is configured (`apps/api/jest.config.js`) with `ts-jest`, Node environment, `@re/shared` path mapping, and a `src/**/*.spec.ts` pattern.
- Five suites exist (18 tests): permission catalog/wildcard matching, SaaS controller authorization metadata, guard SaaS-scope enforcement, booking unit-claim/transition behavior, and payment idempotency/allocation capping.
- No database-backed integration or E2E tests exist; `pnpm test` passes but does not exercise a real Postgres transaction, tenant proxy, row locks, or webhook flow.
- Highest-risk untested paths: real Postgres row-lock/unique-conflict behavior, tenant proxy behavior, portal customer scoping, and concurrency against a live database.

### 5.15 Low/medium — unused dependencies and configuration

Dependencies present but unused in `apps/api/src`:

- `bullmq`, `ioredis` (no queues)
- `@aws-sdk/client-s3` (no storage)
- `nodemailer` (no email)
- `exceljs` (no import/export)

Config declared with no implementation behind it:

- `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR`, `S3_*`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_*`, `MAIL_FROM`
- `JOBS_ENABLED`
- `AI_ENABLED`
- `AUTO_APPROVE_ORGS` is used at registration (`auth.service.ts:39`), but organization approval has no management workflow.
- Organization settings `whatsappEnabled`, `emailNotifications`, `paymentReminders` have no senders.

### 5.16 Low — duplicated global registration

`app.module.ts` registers `APP_GUARD`/`APP_INTERCEPTOR`/`APP_FILTER`, while `main.ts` also calls `useGlobalGuards`/`useGlobalFilters`. Exact duplication depends on bootstrap details, but having two registration paths invites inconsistent behavior and makes guard ordering harder to reason about. Consolidate to one mechanism.

### 5.17 Low — demo seed encoding artifacts

`demo-seed.ts` contains mojibake in task names (for example `Foundation pour �?" Tower B`). This is cosmetic but will surface in the UI and reports.

---

## 6. README claims vs implementation

| README/product claim | Actual |
| --- | --- |
| Refresh tokens (30-day) | Tokens are issued and stored, but no refresh endpoint exists; clients never use them. |
| Platform routes protected by `@SaasOnly()` | Decorator is defined but unused. SaaS route uses `organization:read` and is globally unscoped. |
| Document vault with versions | Metadata/version rows only; no binaries, upload/download, or signed URLs. |
| Workflow automation with triggers/actions | Definitions and simulated execution history only; triggers are not wired. |
| Email/WhatsApp notifications | In-app rows only; no email or WhatsApp provider. |
| Payment gateway integration | No gateway SDK, route, webhook, or reconciliation. Gateway payment IDs are idempotent and allocation is row-locked; config keys only for the provider. |
| Subscription/billing management | Trial subscription auto-created; enforcement added in login/guard via `TenantAccessService`; SaaS admin can approve/suspend orgs; SaaS billing UI/API still minimal. |
| Audit trail / login activity | Models exist; no writes anywhere. |
| Imports (Excel) | `exceljs` installed; `ImportJob` unused; no import endpoints. |
| Commissions | Model exists; no calculation or payout flow. |
| Tests / CI quality gate | Jest configured with 4 permission-model smoke tests; no business-logic, integration, or E2E coverage. |

---

## 7. Configuration and deployment notes

- Monorepo: pnpm workspaces for `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`.
- API: NestJS, global prefix `api/v1`, CORS from `CORS_ORIGINS`, Swagger at `/docs`, Throttler + JWT + Permissions guards, global exception filter and response envelope.
- Web: Next.js 15 with dynamic dashboard module routing; API client in `apps/web/src/lib/api.ts`; Vercel config in `apps/web/vercel.json`.
- Mobile: Expo app under untracked `apps/mobile`; API base from `EXPO_PUBLIC_API_URL` (defaults to localhost); SecureStore token storage.
- Docker Compose: Postgres 5434, Redis 6380, API built from `apps/api/Dockerfile` on 4010, web on 3001, `api_storage` volume.
- Render: Docker deploy with `healthCheckPath` for `GET /api/v1/health`; migrations are intentionally run manually (`pnpm db:deploy`), never at container start.
- Database: Neon Postgres with pooled `DATABASE_URL` and direct `DIRECT_URL`; three migrations only.
- Redis is provisioned but unused by application code today.

---

## 8. Remediation roadmap (suggested order)

### P0 — before any real tenant onboarding

1. ~~Protect SaaS admin with `@SaasOnly()`~~ — **done**; controller metadata and guard tests added.
2. ~~Make reservation/booking writes conditional~~ — **done**; atomic unit claims and conditional confirm/cancel transitions added with service tests. Optional follow-up: add a partial unique index for active bookings per unit.
3. ~~Add payment idempotency, unique gateway identifiers, and allocation locking~~ - **done**; composite unique gateway ID, replay handling, and row-locked capped allocation added with finance service tests. Webhook signature verification and reconciliation remain open.
4. ~~Enforce organization status and subscription/trial state in authentication/guards.~~ — **done**; `TenantAccessService` evaluates org status and subscription/trial state; login and `JwtAuthGuard` both call it; SaaS admin can now approve/suspend orgs via `POST /saas-admin/organizations/:id/status`.
5. Add integration tests against a disposable Postgres database for tenant isolation, registration/permission bootstrapping, and booking/payment concurrency.

### P1 — core product integrity

6. Implement binary document storage with authenticated download/signed URLs.
7. Implement refresh/logout/password-reset/invite-accept flows; add token rotation and cleanup.
8. Add outbound notification providers or remove the corresponding settings/claims.
9. Prevent negative stock and add stock reconciliation checks.
10. Implement workflow trigger execution or label the feature as simulation-only.
11. Add audit logging for auth, permissions, bookings, payments, refunds, and document access.

### P2 — operational quality

12. Add Jest unit/integration tests and tenant-isolation/E2E tests; wire CI.
13. Add queue/scheduler infrastructure with tenant context if reminders, reconciliation, or async notifications are required.
14. Remove or wire unused dependencies/config; document each integration flag's true state.
15. Add linting and a reliable build check to CI.
16. Track and migrate the mobile app; validate Expo builds and token handling.

---

## 9. Open questions / unknowns

- Do owner/admin role detail views need to show the effective wildcard, or should those roles be seeded with concrete permission rows for UI consistency?
- Are any Redis-backed or storage integrations expected to be implemented externally (for example, a separate service)?
- Has the web/mobile build been validated against the current API contract? Not in this audit.
- Is Neon schema in sync with the three local migrations (`prisma migrate status` not run)?
- Are Razorpay/SMTP/WhatsApp accounts configured in the deployment environment? Code does not use them regardless.

---

## 10. Audit conclusion

The repository contains a substantial, well-structured multi-tenant CRUD application with a solid schema, consistent validation, and a thoughtful Prisma tenant proxy. **P0 authorization and concurrency defects (items 1–4) are now fixed in the working tree.** However, the implementation is **not yet a production ERP**:

- core financial and inventory invariants are unprotected under concurrency (procurement negative stock, demand generation),
- several advertised integrations are only configuration or simulation (documents, notifications, workflows, webhooks, email/WhatsApp),
- SaaS administration is now scope-protected with org approval/suspension, but platform management features remain minimal,
- account lifecycle (refresh/logout/password-reset/invite-accept), auditability, and automated integration/E2E tests are missing.

The next step should be P1 core product integrity items before adding features or onboarding real customers.
