# Phase 0 — Audit & Architecture: Gap Analysis Report

**Generated:** 2026-10-22  
**Repository:** realstate_erp (pnpm monorepo)  
**Stack:** NestJS 11, Prisma 6, PostgreSQL, Next.js 15, Expo SDK 58  
**Total Requirements (from Excel):** 232 (188 Must, 42 Should, 2 Could)

---

## 1. Executive Summary

The current codebase is a **multi-tenant real estate ERP** with solid foundations:
- Tenant isolation via Prisma proxy + AsyncLocalStorage
- RBAC with 38 modules × 9 actions = 342 permissions
- 21 API modules, 30 web UI modules, 8 mobile screens
- Core domains implemented: Projects, Inventory, CRM (Leads/Customers/Bookings), Finance (Payment Plans, Demands, Payments, Invoices, Expenses, Accounts), Procurement (Vendors, Materials, Requisitions, POs, GRN, Stock), Construction (Tasks, Site Reports, Inspections), HR (Employees, Attendance, Leaves), Documents, Tickets/Handovers, Workflows, Notifications, AI Assistant, Reports

**Critical Gaps for GESPL Requirements:**
| Domain | Must Reqs | Implementation Status |
|--------|-----------|----------------------|
| Tendering & Estimation (4.1) | 13 | **0% — Missing entire module** |
| Procurement & Inventory (4.3) | 30 | ~40% — Basic CRUD only; missing RFQ, comparative statements, 3-way match, vendor evaluation, subcontractor material tracking |
| Budget Control & Approvals (4.4) | 23 | ~15% — No budget baseline, no approval engine, no hard stops |
| Subcontractor Management (4.5) | 15 | ~20% — No work orders, RA bills, retention, performance rating |
| Finance & Accounts (4.6) | 28 | ~50% — Missing GST e-invoice, TDS, Tally, BG registers, cash flow forecast |
| Project Implementation (4.2) | 22 | ~30% — Missing WBS/BOQ planning, delay register, MoM, correspondence |
| Reports & Dashboards (4.11) | 17 | ~25% — Basic KPIs only; no EVM, drill-down, configurable builder |
| HR & Workforce (4.7) | 9 | ~30% — Missing payroll, statutory deductions, contract labour, recruitment |
| Field/Mobile (4.8) | 6 | ~20% — No offline sync, no geo-tagged photos, no incident reporting |
| QHSE (4.9) | 4 | ~25% — Basic inspections only; no NCR, incidents, toolbox talks |
| Document Control (4.10) | 7 | ~30% — Metadata only; no binary storage, transmittals, RFI |
| Technical/Security (5&6) | 14 | ~40% — Missing MFA, audit logs, DR evidence, breach notification |

---

## 2. Module-by-Module Gap Analysis

### 2.1 4.1 Tendering & Estimation (13 Must, 4 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| TND-001 | Capture tenders from GEM, CPPP, utility portals, internal referrals | **Missing** | No Tender model, no API module | Entire module missing |
| TND-002 | Tender/bid register with ref, client, est. value, deadline, status | **Missing** | — | Entire module missing |
| TND-003 | Tender qualification mapping, risk/contingency scoring | **Missing** | — | Entire module missing |
| TND-004 | Go/No-Go approval workflow | **Missing** | Generic workflow engine exists but not tender-specific | Needs tender-specific workflow |
| TND-005 | Configurable tender stages | **Missing** | — | Entire module missing |
| TND-006 | BOQ/rate master/cost build-up/versioning | **Missing** | Materials exist but no BOQ structure | Needs BOQ + rate versioning |
| TND-007 | Tender checklist | **Missing** | — | Entire module missing |
| TND-008 | Win/loss analysis | **Missing** | — | Entire module missing |
| TND-009 | Convert awarded tender → project | **Missing** | Projects exist but no tender→project link | Needs conversion workflow |
| TND-010 | Tender dashboard | **Missing** | Reports module exists but no tender KPIs | Needs tender dashboard |
| TND-011 | Tender attachments | **Partial** | Documents module supports attachments | Needs tender-specific doc types |
| TND-012 | Tender permissions | **Missing** | No tender permissions in catalog | Add tender module to permissions |
| TND-013 | Project handover from tender | **Missing** | Handovers exist for bookings only | Extend to project handover |

**Estimated Effort:** 4-6 weeks for full module

---

### 2.2 4.2 Project Implementation & Monitoring (22 Must, 6 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| PRJ-001 | Baseline/revised plans with WBS/BOQ/activity planning | **Partial** | Projects, Buildings, Floors, Units exist; Tasks exist | No WBS hierarchy, no BOQ linking |
| PRJ-002 | Execution quantities capture (planned vs actual) | **Partial** | ConstructionTask has progressPercent | No quantity tracking per activity |
| PRJ-003 | Planned vs actual progress with S-curves | **Partial** | Tasks have progress | No S-curve, no baseline comparison |
| PRJ-004 | Milestone tracking with delay register | **Partial** | ProjectMilestone model exists | No delay register, no escalation |
| PRJ-005 | Delay register with root cause, impact, recovery | **Missing** | — | Entire feature missing |
| PRJ-006 | Escalation matrix | **Missing** | — | Entire feature missing |
| PRJ-007 | Execution vs billing analysis | **Missing** | Bookings & Payments exist but not linked to execution | Needs execution-billing linkage |
| PRJ-008 | Recovery plans | **Missing** | — | Entire feature missing |
| PRJ-009 | Risk/issues with RAG status | **Missing** | — | Entire feature missing |
| PRJ-010 | Productivity/equipment utilization | **Missing** | — | Entire feature missing |
| PRJ-011 | MoM/action items | **Missing** | Tickets exist but not MoM | Needs meeting module |
| PRJ-012 | Client correspondence | **Missing** | — | Entire feature missing |

**Key Missing Models:** WBS, Activity, BOQLine, DelayRegister, RecoveryPlan, RiskIssue, MoM, Correspondence

---

### 2.3 4.3 Procurement & Inventory (30 Must, 6 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| PRC-001 | Indent (Purchase Requisition) | **Implemented** | PurchaseRequisition + Items | Basic CRUD only |
| PRC-002 | Vendor master | **Implemented** | Vendor model + CRUD | Missing compliance expiry tracking |
| PRC-003 | RFQ & comparative statement | **Missing** | — | Entire feature missing |
| PRC-004 | Vendor evaluation/rating | **Missing** | Vendor has rating field but no evaluation workflow | Needs evaluation workflow |
| PRC-005 | Multi-level PO approval | **Partial** | PO has status (DRAFT→ISSUED→PARTIAL→RECEIVED) | No configurable multi-level approval |
| PRC-006 | Budget/rate/BOQ checks on PO | **Missing** | No budget validation on PO creation | Needs budget linkage |
| PRC-007 | GRN quality/quantity checks | **Partial** | GRN has qtyAccepted/qtyRejected | No quality check workflow |
| PRC-008 | PO-GRN-Invoice 3-way match | **Missing** | Invoice model exists but no auto-match | Needs matching engine |
| PRC-009 | Multi-store/site stock & valuation | **Partial** | Warehouse + MaterialStock exist | No valuation methods (FIFO/weighted avg) |
| PRC-010 | Reorder alerts | **Partial** | Material has reorderLevel | No automated alerts |
| PRC-011 | Material issue/consumption | **Partial** | StockMovement supports OUT | No consumption vs BOQ tracking |
| PRC-012 | Reverse auction | **Missing** | — | Entire feature missing |
| PRC-013 | Purchase price history | **Missing** | PO has rate but no history view | Needs price history |
| PRC-014 | Stock transfers | **Partial** | StockMovement supports TRANSFER_IN/OUT | No transfer workflow |
| PRC-015 | Returns/debit notes | **Missing** | — | Entire feature missing |
| PRC-016 | Quantity reconciliation | **Missing** | — | Entire feature missing |
| PRC-017 | Supplier commitment tracking | **Missing** | — | Entire feature missing |
| PRC-018 | Aggregate BOQ controls | **Missing** | — | Entire feature missing |
| PRC-019 | Shortage/wastage controls | **Missing** | — | Entire feature missing |
| PRC-020 | Subcontractor material issue/reconciliation | **Missing** | — | Entire feature missing |

**Key Missing Models:** RFQ, ComparativeStatement, VendorEvaluation, ThreeWayMatch, StockValuation, PriceHistory, StockTransfer, DebitNote, Reconciliation, SupplierCommitment, SubcontractorMaterialIssue

---

### 2.4 4.4 Budget Control, Approvals & Alerts (23 Must, 1 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| BUD-001 | Project/site/WBS/BOQ/cost-head baselines | **Missing** | Project has totalBudget only | No baseline versioning |
| BUD-002 | Committed/actual/forecast/cost-to-complete/variance | **Missing** | — | Entire budget ledger missing |
| BUD-003 | Configurable multi-level approvals | **Missing** | Generic workflow engine only | No approval engine |
| BUD-004 | Delegation/escalation | **Missing** | — | Entire feature missing |
| BUD-005 | Pre-transaction hard stops | **Missing** | No budget checks on PO/expense | Needs approval engine |
| BUD-006 | Threshold configuration | **Missing** | — | Entire feature missing |
| BUD-007 | Approval notifications | **Partial** | Notifications exist but not approval-specific | Needs approval notifications |
| BUD-008 | Audit trail for approvals | **Missing** | AuditLog model unused | Needs audit logging |
| BUD-009 | Approved revisions with immutable baseline | **Missing** | — | Entire feature missing |
| BUD-010 | Quantity × rate budgets | **Missing** | Project has totalBudget only | Needs BOQ-based budgeting |
| BUD-011 | PO/WO commitments and forecast overrun controls | **Missing** | — | Entire feature missing |

**Key Missing Models:** BudgetBaseline, BudgetRevision, BudgetLedger, ApprovalWorkflow, ApprovalStep, ApprovalThreshold

---

### 2.5 4.5 Subcontractor Management (15 Must, 1 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| SUB-001 | Subcontractor master with compliance expiry | **Partial** | Vendor with category=SUBCONTRACTOR | No compliance tracking |
| SUB-002 | Work orders | **Missing** | — | Entire feature missing |
| SUB-003 | RA bills (Running Account bills) | **Missing** | — | Entire feature missing |
| SUB-004 | Retention money | **Missing** | — | Entire feature missing |
| SUB-005 | Rating/performance scorecard | **Partial** | Vendor has rating | No performance tracking |
| SUB-006 | Project/budget links | **Missing** | — | Entire feature missing |
| SUB-007 | Multi-level bill approvals | **Missing** | — | Entire feature missing |
| SUB-008 | BOQ/WO/executed/certified/billed/paid/balance quantities | **Missing** | — | Entire feature missing |
| SUB-009 | Quantity/rate blocking | **Missing** | — | Entire feature missing |
| SUB-010 | Productivity and scorecards | **Missing** | — | Entire feature missing |

**Key Missing Models:** Subcontractor, WorkOrder, RABill, Retention, PerformanceScorecard

---

### 2.6 4.6 Finance & Accounts (28 Must, 1 Should, 1 Could)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| FIN-001 | GL/Chart of Accounts | **Partial** | Account model exists (CASH/BANK/WALLET/OTHER) | No hierarchical COA, no GL posting |
| FIN-002 | AP/AR | **Partial** | Payments, Receipts, Invoices exist | No aging, no aging reports |
| FIN-003 | Bank/cash reconciliation | **Missing** | Account has currentBalance | No reconciliation workflow |
| FIN-004 | Milestone/RA invoicing | **Partial** | Invoice model with milestones | No RA bill invoicing |
| FIN-005 | Ageing reports | **Missing** | — | Entire feature missing |
| FIN-006 | Project P&L / cost ledger | **Missing** | LedgerEntry exists but not project P&L | Needs project cost ledger |
| FIN-007 | Cash flow forecast | **Missing** | — | Entire feature missing |
| FIN-008 | GST compliance (e-invoice IRN/QR, e-way bill) | **Missing** | TaxRate model exists | No e-invoice/e-way bill integration |
| FIN-009 | TDS sections/rules | **Missing** | — | Entire feature missing |
| FIN-010 | Statutory reports | **Missing** | — | Entire feature missing |
| FIN-011 | Tally opening balance/master migration | **Missing** | — | Entire feature missing |
| FIN-012 | Period close/backdating control | **Missing** | FinancialYear exists | No period close |
| FIN-013 | Multi-entity | **Partial** | Organization model supports multiple | No consolidated reporting |
| FIN-014 | Execution-billing-collection lag | **Missing** | — | Entire feature missing |
| FIN-015 | Cash requirements forecast | **Missing** | — | Entire feature missing |
| FIN-016 | Financial securities/BG/PBG/insurance registers | **Missing** | — | Entire feature missing |
| FIN-017 | Expiry/renewal alerts and margin forecasts | **Missing** | — | Entire feature missing |

**Key Missing Models:** GLAccount, GLEntry, BankReconciliation, AgingReport, ProjectPnL, CashFlowForecast, GSTInvoice, EWayBill, TDSEntry, PeriodClose, BankGuarantee, InsurancePolicy

---

### 2.7 4.7 HR & Workforce Management (9 Must, 8 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| HR-001 | Employee master | **Implemented** | Employee model + CRUD | Basic fields only |
| HR-002 | Site/geo-tagged/biometric attendance | **Partial** | Attendance model with status | No geo-tag, no biometric |
| HR-003 | Timesheets | **Missing** | — | Entire feature missing |
| HR-004 | Indian payroll/statutory deductions & payslips | **Missing** | — | Entire feature missing |
| HR-005 | Leave management | **Implemented** | LeaveRequest + approval | Basic only; no leave balance, no carry-forward |
| HR-006 | Skills matrix | **Missing** | — | Entire feature missing |
| HR-007 | Contract labour/wages | **Missing** | — | Entire feature missing |
| HR-008 | Travel expenses/reimbursements | **Missing** | Expenses exist but not travel-specific | Needs travel module |
| HR-009 | Appraisals | **Missing** | — | Entire feature missing |
| HR-010 | Directory | **Partial** | Users + Employees | No org chart |
| HR-011 | Statutory registers | **Missing** | — | Entire feature missing |
| HR-012 | Cost centre/WBS mapping | **Missing** | — | Entire feature missing |
| HR-013 | Manpower planning | **Missing** | — | Entire feature missing |
| HR-014 | Recruitment/onboarding | **Missing** | — | Entire feature missing |

**Key Missing Models:** Timesheet, PayrollRun, Payslip, StatutoryDeduction, Skill, ContractLabour, TravelRequest, Appraisal, Recruitment

---

### 2.8 4.8 Field/Mobile (6 Must, 3 Should, 1 Could)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| FL-001 | Responsive field forms | **Partial** | Expo app with forms | No guided low-entry forms |
| FL-002 | Intermittent/offline mode & conflict-safe sync | **Missing** | — | Entire feature missing |
| FL-003 | Daily reports (manpower/work/material/weather/equipment/hindrances) | **Partial** | DailySiteReport exists | Missing many fields |
| FL-004 | Geo-tagged/time-stamped photos/docs | **Missing** | Document metadata only | No binary upload, no geo-tag |
| FL-005 | Incident reporting | **Missing** | — | Entire feature missing |
| FL-006 | Site-scoped access | **Missing** | Tenant scoping only | No site-level RBAC |
| FL-007 | Cross-module updates | **Missing** | — | Entire feature missing |
| FL-008 | Guided low-entry forms | **Missing** | — | Entire feature missing |
| FL-009 | Optional multilingual support | **Missing** | — | Entire feature missing |

---

### 2.9 4.9 QHSE (4 Must, 3 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| QHS-001 | Inspections/checklists | **Implemented** | QualityInspection model + CRUD | No checklists |
| QHS-002 | NCR (Non-Conformance Report) & closure | **Missing** | — | Entire feature missing |
| QHS-003 | Incidents/near misses/investigations | **Missing** | — | Entire feature missing |
| QHS-004 | Toolbox talks | **Missing** | — | Entire feature missing |
| QHS-005 | Safety observations | **Missing** | — | Entire feature missing |
| QHS-006 | LTI/open-NCR/inspection dashboards | **Missing** | Reports module basic | Needs QHSE dashboards |

**Key Missing Models:** NCR, Incident, ToolboxTalk, SafetyObservation, QHSEDashboard

---

### 2.10 4.10 Document Control (7 Must, 3 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| DOC-001 | Versioned drawing/document register | **Partial** | Document + DocumentVersion exist | Metadata only; no binary storage |
| DOC-002 | Transmittals | **Missing** | — | Entire feature missing |
| DOC-003 | RFI (Request for Information) | **Missing** | — | Entire feature missing |
| DOC-004 | Approval workflows | **Missing** | Generic workflow only | No doc-specific workflow |
| DOC-005 | Project/role access | **Partial** | Document has visibility (INTERNAL/CUSTOMER) | No project/role ACL |
| DOC-006 | Search, audit | **Missing** | — | Entire feature missing |
| DOC-007 | Planned/received/approved deliverables | **Missing** | — | Entire feature missing |
| DOC-008 | GTP/technical approvals/ageing/delay alerts | **Missing** | — | Entire feature missing |

**Key Missing Models:** Transmittal, RFI, DocumentAccess, Deliverable, TechnicalApproval

---

### 2.11 4.11 Reports, Dashboards & Analytics (17 Must, 5 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| RPT-001 | Role-based dashboards | **Partial** | Reports module with /dashboard | Hardcoded KPIs only |
| RPT-002 | Operational/statutory reports | **Missing** | — | Entire feature missing |
| RPT-003 | Excel/PDF exports | **Partial** | PDFKit for invoices only | No generic export |
| RPT-004 | Configurable report builder | **Missing** | — | Entire feature missing |
| RPT-005 | Earned value management | **Missing** | — | Entire feature missing |
| RPT-006 | Utilization reports | **Missing** | — | Entire feature missing |
| RPT-007 | Cash/profitability reports | **Missing** | — | Entire feature missing |
| RPT-008 | Drill-down capability | **Missing** | — | Entire feature missing |
| RPT-009 | Budget/commitment/actual/forecast | **Missing** | — | Entire feature missing |
| RPT-010 | BOQ/PO/WO/GRN/consumption/execution quantities | **Missing** | — | Entire feature missing |
| RPT-011 | Supplier/subcontractor controls | **Missing** | — | Entire feature missing |
| RPT-012 | Plan vs actual, baseline vs revised vs actual | **Missing** | — | Entire feature missing |
| RPT-013 | Execution vs billing vs collections | **Missing** | — | Entire feature missing |
| RPT-014 | Cash flow reports | **Missing** | — | Entire feature missing |
| RPT-015 | Margin reports | **Missing** | — | Entire feature missing |
| RPT-016 | Risk RAG | **Missing** | — | Entire feature missing |
| RPT-017 | Delay/recovery reports | **Missing** | — | Entire feature missing |
| RPT-018 | Guarantee expiry | **Missing** | — | Entire feature missing |

---

### 2.12 5&6 Technical, Security & Non-Functional (14 Must, 1 Should)

| Req ID | Requirement | Current Status | Evidence | Gap |
|--------|-------------|----------------|----------|-----|
| TECH-001 | Cloud web/mobile access | **Implemented** | Docker, Render, Vercel configs | Works |
| TECH-002 | APIs/integrations | **Partial** | REST API + AI | No webhook framework |
| TECH-003 | India data residency & backups | **Config-only** | Render.yaml, Neon DB | No backup/restore test evidence |
| TECH-004 | Configurable workflows | **Partial** | Workflow engine exists | Actions are SIMULATED |
| TECH-005 | Encryption at rest/in transit | **Partial** | HTTPS, bcrypt passwords | No field-level encryption |
| TECH-006 | MFA for privileged roles | **Missing** | User.mfaEnabled exists but unused | No MFA implementation |
| TECH-007 | Audit logs | **Missing** | AuditLog model unused | No audit trail |
| TECH-008 | Tested backup/restore/DR | **Missing** | — | No DR evidence |
| TECH-009 | 99.5% uptime target | **Operational** | — | Requires monitoring/SLA |
| TECH-010 | Storage capacity/pricing/retention | **Config-only** | STORAGE_* env vars | No implementation |
| TECH-011 | Scale | **Partial** | Stateless API, Redis | No load test evidence |
| TECH-012 | Breach notification | **Missing** | — | Entire feature missing |
| TECH-013 | Customer data ownership/export/deletion | **Missing** | — | Entire feature missing |

---

## 3. Domain Dependency Map

```
Phase 1 Foundations (Unblocks All)
├── Site/Location & WBS Hierarchy
├── BOQ & Rate Item Model
├── Configurable Approval Engine
├── Budget Baseline/Revision + Commitment Ledger
├── Shared Audit Log
├── Notification Delivery Abstraction
├── Document Storage Abstraction (Upload/Download/Auth)
└── Cross-Module Reference Conventions

Phase 2 Delivery (Dependent on Phase 1)
├── A. Tendering & Estimation
│   └── Requires: BOQ, Approval Engine, Document Storage
├── B. Project Implementation & Monitoring
│   └── Requires: WBS, BOQ, Approval Engine, Budget, Document Storage
├── C. Procurement Controls & Inventory Reconciliation
│   └── Requires: Approval Engine, Budget, 3-Way Match Engine
├── D. Budget/Approval Engine + Subcontractor/WO/RA
│   └── Requires: Approval Engine, Budget, Budget Ledger
├── E. Finance & Statutory/Payment Integrations
│   └── Requires: GL, Approval Engine, Payment Adapter
├── F. Workforce/HR/Payroll
│   └── Requires: Approval Engine, Cost Centre Mapping
├── G. Field/Mobile/Offline + QHSE
│   └── Requires: Offline Sync Engine, Document Storage
├── H. Document Control
│   └── Requires: Document Storage, Approval Engine
├── I. Role Dashboards & Drill-Down Reports
│   └── Requires: Report Builder, Budget Ledger, All Domain Data
└── J. Security/Operations/Non-Functional Evidence
    └── Requires: Audit Log, MFA, Backup/DR, Monitoring
```

---

## 4. Current-State Evidence Summary

### Models Implemented (49)
| Domain | Models |
|--------|--------|
| Core | Organization, User, Role, Permission, Branch, Department, Counter |
| CRM | Lead, LeadActivity, FollowUp, Customer, Booking, BookingStatusHistory, PaymentDemand, PaymentPlan, PaymentPlanMilestone |
| Projects | Project, ProjectMilestone, Building, Floor, Unit |
| Finance | Account, Expense, ExpenseCategory, Invoice, LedgerEntry, Payment, PaymentAllocation, Receipt, Refund, TaxRate, FinancialYear |
| Procurement | Vendor, Material, MaterialCategory, Warehouse, MaterialStock, StockMovement, PurchaseRequisition, PurchaseRequisitionItem, PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GrnItem |
| Construction | ConstructionTask, DailySiteReport, QualityInspection |
| HR | Employee, Attendance, LeaveRequest |
| Docs/Comm | Document, DocumentVersion, SupportTicket, TicketMessage, Handover, Notification, Invitation |
| Automation | WorkflowDefinition, WorkflowExecution, AiConversation, AiMessage, AiUsage |
| System | AuditLog, LoginActivity, PasswordResetToken, RefreshToken, ImportJob, Commission, SaaSInvoice, Subscription, Plan, WebhookEvent, Counter |

### Models Missing (Critical for GESPL)
- **Tendering:** Tender, TenderStage, TenderQualification, TenderChecklist, TenderBOQ, TenderRateVersion, TenderAttachment
- **WBS/BOQ:** WBS, WBSItem, BOQ, BOQLine, BOQVersion, RateMaster, RateVersion
- **Budget:** BudgetBaseline, BudgetRevision, BudgetLedger, BudgetThreshold
- **Approval:** ApprovalWorkflow, ApprovalStep, ApprovalDelegation, ApprovalEscalation, ApprovalHistory
- **Subcontractor:** Subcontractor, WorkOrder, RABill, Retention, SubcontractorPerformance
- **Procurement Advanced:** RFQ, ComparativeStatement, VendorEvaluation, ThreeWayMatch, StockValuation, PriceHistory, StockTransfer, DebitNote, Reconciliation, SupplierCommitment, SubcontractorMaterialIssue
- **Finance Advanced:** GLAccount, GLEntry, BankReconciliation, AgingReport, ProjectPnL, CashFlowForecast, GSTInvoice, EWayBill, TDSEntry, PeriodClose, BankGuarantee, InsurancePolicy
- **HR Advanced:** Timesheet, PayrollRun, Payslip, StatutoryDeduction, Skill, ContractLabour, TravelRequest, Appraisal, Recruitment
- **QHSE:** NCR, Incident, ToolboxTalk, SafetyObservation, QHSEDashboard
- **Document Control:** Transmittal, RFI, DocumentAccess, Deliverable, TechnicalApproval
- **Reports:** ReportDefinition, ReportSchedule, EVMData
- **Mobile/Field:** OfflineQueue, SyncStatus, GeoTaggedMedia, FieldFormTemplate

---

## 5. Implementation Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Approval engine complexity | High | High | Start with simple state machine; extend incrementally |
| Budget ledger concurrency | High | High | Use row-level locking + optimistic concurrency |
| Multi-tenant data migration | High | Medium | Phase migrations; use Prisma migrate deploy |
| GST/TDS integration external deps | High | Medium | Build adapters with mock/sandbox modes first |
| Offline sync conflict resolution | Medium | High | Use idempotency keys + last-write-wins with manual resolution |
| Report builder performance | Medium | Medium | Pre-aggregate materialized views; paginate |
| Mobile geo/photo binary storage | Medium | Medium | Use existing storage abstraction; add upload endpoint |
| Existing data preservation | High | High | Never destructive migrations; seed idempotent |

---

## 6. Phase 1 Implementation Plan (Foundations)

### Sprint 1-2: Site/Location & WBS Hierarchy
- **Models:** Site, WBS, WBSItem, WBSVersion
- **API:** CRUD + tree operations (move, copy, flatten)
- **Permissions:** site:*, wbs:*
- **UI:** Tree view in Projects module
- **Tests:** Cross-tenant isolation, tree integrity

### Sprint 3-4: BOQ & Rate Item Model
- **Models:** BOQ, BOQLine, BOQVersion, RateMaster, RateVersion
- **Linkage:** Project → WBS → BOQ → BOQLine → RateMaster
- **Import:** Excel import for BOQ (using exceljs)
- **Tests:** Versioning, rate lookup, cost rollup

### Sprint 5-6: Configurable Approval Engine
- **Models:** ApprovalWorkflow, ApprovalStep, ApprovalInstance, ApprovalHistory, ApprovalDelegation, ApprovalEscalation
- **Engine:** State machine with conditions (amount, percentage, role, custom expression)
- **Features:** Parallel/serial steps, delegation, SLA, escalation, reject/return
- **Integration:** Hook into PO, Expense, Leave, WO, RA Bill, Budget Revision
- **Tests:** Threshold blocking, delegation, escalation, audit trail

### Sprint 7-8: Budget Baseline/Revision + Commitment Ledger
- **Models:** BudgetBaseline, BudgetRevision, BudgetLine, BudgetLedgerEntry, Commitment
- **Features:** Immutable baseline, revision workflow, commitment tracking (PO/WO), forecast, variance
- **Hard Stops:** Block PO/Expense/WO creation when budget exceeded (via approval engine)
- **Tests:** Concurrent commitment race conditions, baseline immutability

### Sprint 9: Shared Audit Log
- **Implementation:** Interceptor + async writer for all mutating endpoints
- **Capture:** Actor, action, resource, before/after, timestamp, correlationId
- **Query:** Filterable by tenant, user, resource, date range
- **Tests:** Coverage on all mutating endpoints

### Sprint 10: Notification Delivery Abstraction
- **Adapter Pattern:** InAppAdapter, EmailAdapter (Nodemailer), PushAdapter, WhatsAppAdapter, SMSAdapter
- **Status Tracking:** Sent/Delivered/Failed/Read with retry/backoff
- **Templates:** Handlebars/MJML for email; variable substitution
- **Tests:** Adapter swap, retry logic, template rendering

### Sprint 11: Document Storage Abstraction
- **Upload Endpoint:** Multipart → driver (local/S3/R2) → return storageKey + signed URL
- **Download:** Authenticated GET with authorization check
- **Features:** Size/type limits, malware scan hook, versioning, soft delete
- **Tests:** AuthZ on download, version history, driver swap

---

## 7. Baseline Commands Record

```bash
# Typecheck - PASS
pnpm typecheck
# Output: All 4 workspaces pass

# Tests - PASS (37 tests, 8 suites)
pnpm test
# Output: apps/api - 37 passed

# API Build - PASS
pnpm --filter @re/api build
# Output: nest build successful

# Web Build - FAIL (Windows symlink issue with Next.js standalone)
pnpm --filter @re/web build
# Error: EPERM symlink errors in .next/standalone
# Workaround: Use `next build` without standalone or run in Docker/Linux

# Prisma Validate - PASS
pnpm --filter @re/api exec prisma validate

# Prisma Migrate Status
pnpm --filter @re/api exec prisma migrate status
# 2 pending migrations (payment gateway idempotency, org status reason)
```

---

## 8. Next Steps

1. **✅ Complete** - Phase 0: Requirements matrix (JSON/CSV/MD), gap analysis, dependency map
2. **🔄 In Progress** - Phase 1 Sprint 1: Site/Location & WBS Hierarchy
3. **⏳ Planned** - Phase 1 Sprint 2: BOQ & Rate Item Model
4. **⏳ Planned** - Phase 1 Sprint 3-4: Approval Engine (core unblocker)
5. **⏳ Planned** - Phase 1 Sprint 5-6: Budget Baseline + Commitment Ledger
6. **⏳ Planned** - Phase 1 Sprint 7: Audit Log + Notification Abstraction + Document Storage
7. **⏳ Planned** - Phase 2A: Tendering & Estimation (Must requirements first)
8. **⏳ Planned** - Phase 2B: Project Implementation (WBS/BOQ/Execution)
9. **⏳ Planned** - Phase 2C: Procurement (RFQ/3-way match/Reconciliation)
10. **⏳ Planned** - Phase 2D: Subcontractor + Budget Controls
11. **⏳ Planned** - Phase 2E: Finance (GST/TDS/Tally/BG)
12. **⏳ Planned** - Phase 2F: HR (Payroll/Contract Labour/Recruitment)
13. **⏳ Planned** - Phase 2G: Field/Mobile Offline + QHSE
14. **⏳ Planned** - Phase 2H: Document Control
15. **⏳ Planned** - Phase 2I: Reports/Dashboards
16. **⏳ Planned** - Phase 2J: Security/Operations Evidence

---

*End of Phase 0 Report*