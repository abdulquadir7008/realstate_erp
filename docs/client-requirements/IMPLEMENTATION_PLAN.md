# Implementation Plan — EstateFlow AI / GESPL Requirements

**Baseline:** Phase 0 complete — 232 requirements classified, gap analysis done  
**Current Sprint:** Phase 1 — Foundations (Sprint 1-4 backend complete; Sprint 5-6 Approval Engine next)

---

## Phase 0 ✅ Complete

| Deliverable | Status | Location |
|-------------|--------|----------|
| Requirements matrix (JSON) | ✅ | `docs/client-requirements/requirements.json` |
| Requirements matrix (CSV) | ✅ | `docs/client-requirements/requirements.csv` |
| Requirements matrix (MD) | ✅ | `docs/client-requirements/requirements-matrix.md` |
| Detailed matrix with status | ✅ | `docs/client-requirements/requirements-matrix-detailed.md` |
| Enhanced JSON with status | ✅ | `docs/client-requirements/requirements-with-status.json` |
| Gap analysis report | ✅ | `docs/client-requirements/PHASE0_GAP_ANALYSIS.md` |
| Baseline test/typecheck/build | ✅ | Recorded in gap analysis |

**Status Summary:**
- **Implemented:** 7 (Employee, Attendance, Leave, Customer, Lead, Project, Unit, Payment, etc. — core CRUD)
- **Partially Implemented:** 89 (Models exist but missing workflows, integrations, validations; includes Site/WBS and BOQ/Rate Master backends added 2026-10-23)
- **Missing:** 132 (Entire modules: Tendering, Approval Engine, Budget Ledger, Subcontractor, GST/TDS, Payroll, QHSE NCR/Incidents, Document Control, Report Builder, etc.)
- **Config-only:** 3 (Storage, India residency, Retention)
- **Operational:** 1 (99.5% uptime)

---

## Phase 1 — Foundations (11 Sprints, ~22 weeks)

### Sprint 1-2: Site/Location & WBS Hierarchy (Weeks 1-4)

**Objective:** Add project site hierarchy and Work Breakdown Structure

**Deliverables:**
- [x] Prisma models: `Site`, `WBS`, `WBSItem`, `WBSVersion`
- [x] API: CRUD + tree operations (create, list, tree, move, versions/baselines) — `site-wbs.service.ts` / `site-wbs.controller.ts`
- [ ] Permissions: `site:*`, `wbs:*` (currently reusing `project:read/create/update/delete`)
- [ ] UI: Tree view in Projects module with drag-drop reorder
- [ ] Tests: Cross-tenant isolation, tree integrity, concurrent moves (manual Docker smoke done)

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           + Site, WBS, WBSItem, WBSVersion models
apps/api/src/modules/projects/           Extend with WBS service/controller
apps/api/src/modules/projects/projects.service.ts
apps/api/src/modules/projects/projects.controller.ts
packages/shared/src/schemas/project.ts   + WBS schemas
packages/shared/src/permissions.ts       + site, wbs modules
apps/web/src/lib/modules.ts              + wbs module config
apps/mobile/app/(tabs)/projects.tsx      + WBS screen
```

**Acceptance Criteria:**
- Create project → sites → WBS hierarchy (3+ levels)
- Move WBS items between parents with integrity
- Version WBS with baseline/comparison
- Tenant A cannot see Tenant B's WBS
- API returns 403 for users without `wbs:read`

---

### Sprint 3-4: BOQ & Rate Item Model (Weeks 5-8)

**Objective:** Bill of Quantities with versioned rates linked to WBS

**Deliverables:**
- [x] Prisma models: `BOQ`, `BOQLine`, `BOQVersion`, `RateMaster`, `RateVersion`
- [x] Linkage: Project → WBS → BOQ → BOQLine → RateMaster (BOQ→WBS, BOQLine→WBSItem, BOQLine→RateMaster)
- [x] Excel import for BOQ (using existing `exceljs` dependency) — `POST /projects/:projectId/boqs/import`
- [x] Rate versioning with effective dates — `GET /rate-masters/:id/applicable-rate`
- [ ] Cost rollup: BOQLine qty × rate → BOQ total done; WBS total → Project total pending
- [ ] UI: BOQ editor, rate master screens, import wizard

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           + BOQ, BOQLine, BOQVersion, RateMaster, RateVersion
apps/api/src/modules/procurement/        New boq service/controller (or projects)
apps/api/src/modules/procurement/boq.service.ts
apps/api/src/modules/procurement/boq.controller.ts
packages/shared/src/schemas/procurement.ts + BOQ schemas
apps/web/src/lib/modules.ts              + boq, rate-master modules
```

**Acceptance Criteria:**
- Create BOQ from WBS (auto-generate lines from WBS items)
- Version BOQ (baseline → revision 1 → revision 2)
- Import BOQ from Excel with validation
- Rate master with versioned rates (material/labour/equipment)
- Cost rollup updates automatically on rate/quantity change
- Tenant isolation on all BOQ queries

---

### Sprint 5-6: Configurable Approval Engine (Weeks 9-14) ⭐ **CRITICAL UNBLOCKER**

**Objective:** Generic, reusable approval workflow engine for all domains

**Deliverables:**
- [ ] Prisma models: `ApprovalWorkflow`, `ApprovalStep`, `ApprovalInstance`, `ApprovalHistory`, `ApprovalDelegation`, `ApprovalEscalation`, `ApprovalThreshold`
- [ ] Engine: State machine with conditions (amount, percentage, role, custom expression via JSONLogic or similar)
- [ ] Features: Parallel/serial steps, delegation, SLA/escalation timer, reject/return to previous step
- [ ] Integration hooks: PO, Expense, Leave, WorkOrder, RABill, BudgetRevision, Contract
- [ ] Audit trail on every approval action

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           + ApprovalWorkflow, ApprovalStep, ApprovalInstance, ApprovalHistory, ApprovalDelegation, ApprovalEscalation, ApprovalThreshold
apps/api/src/modules/approval/           New approval module
apps/api/src/modules/approval/approval.service.ts
apps/api/src/modules/approval/approval.controller.ts
apps/api/src/modules/approval/approval.engine.ts    # Core state machine
apps/api/src/modules/approval/approval.hooks.ts     # Integration hooks
apps/api/src/modules/approval/approval.gate.ts      # Pre-transaction guard
packages/shared/src/schemas/approval.ts  + Approval schemas
packages/shared/src/permissions.ts       + approval module
apps/api/src/common/guards/approval.guard.ts        # Hard-stop guard
apps/web/src/lib/modules.ts              + approval-workflow module
```

**Acceptance Criteria:**
- Define workflow: "PO > ₹50L → Manager → Director → CFO" with serial steps
- Define workflow: "Budget revision > 10% → PM → Finance Head" with parallel review
- Delegation: User A delegates to User B for 2 weeks
- Escalation: Step not acted on in 48h → auto-escalate to next level
- Hard stop: `POST /procurement/purchase-orders` returns 403 if approval pending
- Reject returns to previous step with comments; return to initiator allowed
- Full audit trail: who approved/rejected/delegated, when, with comments
- Tenant isolation on all approval data

---

### Sprint 7-8: Budget Baseline/Revision + Commitment Ledger (Weeks 15-18)

**Objective:** Immutable budget baselines with revision workflow and commitment tracking

**Deliverables:**
- [ ] Prisma models: `BudgetBaseline`, `BudgetRevision`, `BudgetLine`, `BudgetLedgerEntry`, `Commitment`
- [ ] Features: 
  - Immutable baseline (created on project approval)
  - Revision workflow (uses approval engine)
  - Commitment tracking: PO/WO/Subcontractor WO create commitments
  - Forecast: Manual + auto from commitments
  - Variance: Baseline vs Revised vs Committed vs Actual vs Forecast
- [ ] Hard stops: Block PO/Expense/WO creation when commitment > budget line (via approval engine)
- [ ] Reports: Budget vs Actual drill-down by WBS/BOQ/cost head

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           + BudgetBaseline, BudgetRevision, BudgetLine, BudgetLedgerEntry, Commitment
apps/api/src/modules/finance/            Extend with budget service
apps/api/src/modules/finance/budget.service.ts
apps/api/src/modules/finance/budget.controller.ts
apps/api/src/modules/procurement/        Hook PO/WO → commitment
apps/api/src/modules/construction/       Hook WO/RA → commitment
apps/api/src/modules/subcontractor/      New subcontractor module (placeholder)
```

**Acceptance Criteria:**
- Create project → auto-create baseline from BOQ
- Request revision → approval workflow → new revision immutable
- Create PO → commitment reserved on budget line
- Attempt PO over budget → 403 with "Budget exceeded" (unless approval overrides)
- Drill-down: Project → WBS → BOQ Line → Commitments (PO/WO) → Actuals
- Variance report: Baseline | Revised | Committed | Actual | Forecast | Variance%

---

### Sprint 9: Shared Audit Log (Weeks 19-20)

**Objective:** Comprehensive audit trail for all mutating operations

**Deliverables:**
- [ ] Interceptor-based audit writer (async, non-blocking)
- [ ] Capture: actor, action, resourceType, resourceId, before, after, timestamp, correlationId, ip, userAgent
- [ ] Query API: filter by tenant, user, resource, date range, action
- [ ] Retention policy (configurable, default 7 years)
- [ ] Integration: All controllers use `AuditLogInterceptor` or service calls

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           # AuditLog already exists - ensure fields
apps/api/src/common/interceptors/audit-log.interceptor.ts
apps/api/src/modules/audit/              New audit module
apps/api/src/modules/audit/audit.service.ts
apps/api/src/modules/audit/audit.controller.ts
apps/api/src/common/decorators.ts        + @Audited(action?) decorator
```

**Acceptance Criteria:**
- Every POST/PATCH/DELETE on tenant resources creates audit entry
- Audit entry includes before/after JSON diff
- Query: `GET /audit?resourceType=PurchaseOrder&userId=xxx&from=...`
- Tenant A cannot query Tenant B's audit logs
- Performance: <50ms overhead per request (async write)

---

### Sprint 10: Notification Delivery Abstraction (Weeks 21-22)

**Objective:** Unified notification system with provider adapters

**Deliverables:**
- [ ] Adapter pattern: `InAppAdapter`, `EmailAdapter` (Nodemailer), `PushAdapter`, `WhatsAppAdapter`, `SMSAdapter`
- [ ] Status tracking: Queued → Sent → Delivered/Failed/Read with retry/backoff
- [ ] Templates: Handlebars for email; variable substitution for all channels
- [ ] Preferences: Per-user channel enable/disable, digest options
- [ ] Dead letter queue for failed deliveries

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           # Notification already exists - extend
apps/api/src/modules/notifications/      Extend with adapters
apps/api/src/modules/notifications/adapters/
apps/api/src/modules/notifications/notification.engine.ts
apps/api/src/modules/notifications/notification.templates.ts
apps/api/src/modules/notifications/notification.preferences.service.ts
```

**Acceptance Criteria:**
- `NotificationService.send({ to, template, data, channels: ['EMAIL', 'IN_APP'] })`
- Email sent via Nodemailer with template rendering
- In-app notification created immediately
- Failed email retries 3x with exponential backoff
- User preferences respected (email off → no email sent)
- Template variables: `{{user.name}}`, `{{po.number}}`, `{{amount}}`

---

### Sprint 11: Document Storage Abstraction (Weeks 23-24)

**Objective:** Actual binary file storage with authorized access

**Deliverables:**
- [ ] Upload endpoint: `POST /documents/upload` (multipart) → driver → return storageKey + signed URL
- [ ] Download: `GET /documents/:id/download` with authorization check
- [ ] Drivers: Local (disk), S3, R2 (configurable via `STORAGE_DRIVER`)
- [ ] Features: Size/type limits, malware scan hook, versioning, soft delete, signed URLs (expiry)
- [ ] Integration: Documents module uses storage abstraction

**Files to Create/Modify:**
```
apps/api/prisma/schema.prisma           # Document, DocumentVersion - ensure fields
apps/api/src/modules/documents/          Extend with storage
apps/api/src/modules/documents/storage/
apps/api/src/modules/documents/storage/driver.interface.ts
apps/api/src/modules/documents/storage/local.driver.ts
apps/api/src/modules/documents/storage/s3.driver.ts
apps/api/src/modules/documents/storage/r2.driver.ts
apps/api/src/modules/documents/documents.upload.service.ts
apps/api/src/modules/documents/documents.download.service.ts
apps/api/src/modules/documents/documents.controller.ts     # Add upload/download endpoints
```

**Acceptance Criteria:**
- Upload 10MB PDF → returns storageKey, creates Document + DocumentVersion
- Download checks: user has `document:read` + document.visibility allows access
- Signed URL expires in 1 hour
- Local driver writes to `STORAGE_LOCAL_DIR`; S3/R2 use env config
- File type validation: only allowed MIME types
- Malware scan hook point (ClamAV integration stub)

---

## Phase 2 — Domain Delivery (Priority Order)

### 2A. Tendering & Estimation (Must: 13)
- Depends on: BOQ, Approval Engine, Document Storage
- Sprint: After Phase 1 complete

### 2B. Project Implementation & Monitoring (Must: 22)
- Depends on: WBS, BOQ, Approval Engine, Budget, Document Storage
- Sprint: Parallel with 2A

### 2C. Procurement Controls & Reconciliation (Must: 30)
- Depends on: Approval Engine, Budget, 3-Way Match Engine
- Sprint: After 2A/2B

### 2D. Budget/Approval + Subcontractor/WO/RA (Must: 15+23)
- Depends on: Approval Engine, Budget Ledger
- Sprint: Core of Phase 1 outputs

### 2E. Finance & Statutory/Payment (Must: 28)
- Depends on: GL, Approval Engine, Payment Adapter, Audit Log
- Sprint: After 2D

### 2F. Workforce/HR/Payroll (Must: 9)
- Depends on: Approval Engine, Cost Centre Mapping
- Sprint: Independent

### 2G. Field/Mobile Offline + QHSE (Must: 6+4)
- Depends on: Offline Sync Engine, Document Storage
- Sprint: Mobile team parallel

### 2H. Document Control (Must: 7)
- Depends on: Document Storage, Approval Engine
- Sprint: After Sprint 11

### 2I. Role Dashboards & Reports (Must: 17)
- Depends on: Report Builder, Budget Ledger, All Domain Data
- Sprint: Final phase

### 2J. Security/Operations Evidence (Must: 14)
- Depends on: Audit Log, MFA, Backup/DR, Monitoring
- Sprint: Ongoing

---

## Risk Mitigation

| Risk | Phase | Mitigation |
|------|-------|------------|
| Approval engine complexity | 1 (Sprint 5-6) | Start minimal: serial steps only; add parallel/delegation/escalation incrementally |
| Budget concurrency | 1 (Sprint 7-8) | Use Prisma row-level locking (`SELECT FOR UPDATE`) + optimistic concurrency tokens |
| GST/TDS external deps | 2E | Build adapters with mock/sandbox modes; clearly label external blockers |
| Offline sync conflicts | 2G | Idempotency keys + last-write-wins + manual resolution UI |
| Report performance | 2I | Pre-aggregate materialized views; cursor pagination; Redis cache |
| Data migration safety | All | Never destructive migrations; `prisma migrate deploy` only additive; seed idempotent |

---

## Test Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit | Jest | 80% on services, engines, utilities |
| Integration | Jest + Testcontainers (PostgreSQL) | All API endpoints, tenant isolation, approval flows |
| E2E | Playwright (web) + Detox (mobile) | Critical journeys: PO approval, budget revision, tender→project |
| Contract | Pact | Provider adapters (email, storage, payment) |

**CI Pipeline:**
```yaml
# .github/workflows/ci.yml
- pnpm typecheck
- pnpm test --coverage
- pnpm --filter @re/api build
- pnpm --filter @re/web build (Linux runner)
- docker-compose up -d && integration tests
```

---

## Definition of Done per Requirement

A requirement is **Implemented** only when:
1. ✅ Prisma migration applied (additive, non-destructive)
2. ✅ API endpoints exist with Zod validation, permission guards, tenant isolation
3. ✅ UI module configured in `modules.ts` with list/create/edit/detail
4. ✅ Mobile screen exists (if applicable)
5. ✅ Unit tests for service logic
6. ✅ Integration tests for API + tenant isolation + permissions
7. ✅ Seed data demonstrates feature
8. ✅ Documentation updated (README, API docs, user guide)
9. ✅ Acceptance criteria from Excel verified manually or via E2E test

---

## Next Immediate Actions (This Week)

1. **Sprint 1 Day 1-2:** Create `Site`, `WBS`, `WBSItem`, `WBSVersion` models + migration
2. **Sprint 1 Day 3-4:** Projects service → WBS CRUD + tree operations
3. **Sprint 1 Day 5:** API tests + permission guards + web UI tree view
4. **Parallel:** Update `docs/client-requirements/requirements-with-status.json` as items complete

---

*Document version: 1.0 | Updated: 2026-10-22*