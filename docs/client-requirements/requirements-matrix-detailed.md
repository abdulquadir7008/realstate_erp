# GESPL Requirements Matrix — Detailed Status

Total requirements: 232

## Status Legend
- **Implemented** — Feature exists and works end-to-end (cite file paths)
- **Partially Implemented** — Core models/CRUD exist but missing key sub-features or workflows
- **Missing** — No implementation found
- **Config-only** — Env/config slots exist but no backing code
- **Operational** — Requires deployment/process evidence, not code alone


## 4.1 Tendering & Estimation (17 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| TND-001 | Tender Search & Alerts | Capture tenders from GEM, CPPP, utility portals and internal referrals. | Must | **Missing** | ❌ No implementation found |
| TND-002 | Bid register | Maintain a tender / bid register capturing tender reference, client, estimated value, submission deadline and current st... | Must | **Missing** | ❌ No implementation found |
| TND-003 | Qualification Mapping | Map tender qualification criteria against company credentials. | Should | **Missing** | ❌ No implementation found |
| TND-004 | Risk assessment & contingency | Estimate project risks and contingencies. | Should | **Missing** | ❌ No implementation found |
| TND-005 | Go / No-Go Approval | Workflow for management approval before bidding. | Must | **Partial** | Backend implemented 2026-10-23: Generic approval workflows can model bid go/no-go; tender/bid module integration and UI pending. |
| TND-006 | Stage tracking | Track each bid through configurable stages (screening, technical, costing, submission, outcome). | Must | **Missing** | ❌ No implementation found |
| TND-007 | BOQ | Prepare a Bill of Quantities (BOQ) with line items, units, quantities and rates. | Must | **Partial** | Backend implemented 2026-10-23: BOQ/BOQLine models, CRUD/tree/status/recalculate API, Excel import, computed line amount and BOQ total. UI pending. |
| TND-008 | Rate master | Maintain rate masters and reusable item libraries for BOQ preparation. | Must | **Partial** | Backend implemented 2026-10-23: RateMaster/RateVersion models, CRUD, versioning and effective-date applicable rate lookup. UI/library reuse pending. |
| TND-009 | Cost build-up | Build the cost estimate showing direct cost, overheads, contingency and margin as separate components. | Must | **Missing** | ❌ No implementation found |
| TND-010 | Versioning | Support versioning of BOQ / estimate revisions with history. | Must | **Partial** | Backend implemented 2026-10-23: BOQVersion and RateVersion snapshots with history endpoints. UI pending. |
| TND-011 | Doc checklist | Maintain a document checklist per tender and track submission readiness (%). | Must | **Missing** | ❌ No implementation found |
| TND-012 | Win/loss | Capture bid outcome (won / lost) with reason codes for win-loss analysis. | Should | **Missing** | ❌ No implementation found |
| TND-013 | Conversion | Convert a won bid into a project, carrying over BOQ, budget and scope. | Must | **Missing** | ❌ No implementation found |
| TND-014 | Dashboard | Provide a tender pipeline dashboard (value by stage, win rate, upcoming deadlines). | Should | **Missing** | ❌ No implementation found |
| TND-015 | Attachments | Attach tender documents (RFP, drawings, correspondence) to the bid record. | Must | **Missing** | ❌ No implementation found |
| TND-016 | Access | Role-based access to tender/estimation data. | Must | **Missing** | ❌ No implementation found |
| TND-017 | Kick-off / project handover | Transfer estimate, BOQ, assumptions and budget to execution team. | Must | **Missing** | ❌ No implementation found |

## 4.10 Document Control (10 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| DOC-001 | Register | Maintain a version-controlled drawing and document register. | Must | **Partial** |  |
| DOC-002 | Transmittals | Maintain a transmittals log. | Should | **Missing** | ❌ No implementation found |
| DOC-003 | RFI | Maintain an RFI (Request for Information) register. | Should | **Partial** |  |
| DOC-004 | Approval workflow | Provide document approval workflows. | Must | **Partial** | Backend implemented 2026-10-23: Entity-agnostic approval engine can host document approval workflows; document module integration pending. |
| DOC-005 | Access control | Control document access by project and role. | Must | **Partial** |  |
| DOC-006 | Search | Provide document search and retrieval. | Must | **Missing** | ❌ No implementation found |
| DOC-007 | Audit | Maintain an audit trail of document versions and access. | Should | **Missing** | ❌ No implementation found |
| DOC-008 | Deliverables tracking | Track engineering/drawing deliverables planned vs received vs approved. | Must | **Partial** |  |
| DOC-009 | GTP approval | Track GTP/technical document approval status and ageing. | Must | **Missing** | ❌ No implementation found |
| DOC-010 | Deliverable alerts | Alert on delayed engineering deliverables affecting project execution. | Must | **Partial** |  |

## 4.11 Reports, Dashboards & Analytics (22 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| RPT-001 | Role dashboards | Provide role-based dashboards (management, project, procurement, finance, HR). | Must | **Partial** |  |
| RPT-002 | Operational reports | Provide standard operational reports. | Must | **Missing** | ❌ No implementation found |
| RPT-003 | Statutory reports | Provide standard statutory reports. | Must | **Missing** | ❌ No implementation found |
| RPT-004 | Export | Export reports to Excel / PDF. | Must | **Partial** |  |
| RPT-005 | Report builder | Provide a configurable report builder for ad-hoc needs. | Should | **Missing** | ❌ No implementation found |
| RPT-006 | Earned value | Provide earned-value analysis. | Should | **Missing** | ❌ No implementation found |
| RPT-007 | Utilisation | Provide resource-utilisation reporting. | Should | **Missing** | ❌ No implementation found |
| RPT-008 | Cash position | Provide cash-position reporting. | Must | **Missing** | ❌ No implementation found |
| RPT-009 | Profitability | Provide project-profitability analytics. | Must | **Missing** | ❌ No implementation found |
| RPT-010 | Drill-down | Allow drill-down from dashboard to underlying transactions. | Should | **Partial** | Implemented 2026-10-23: budget detail exposes WBS/BOQ-to-commitment/ledger drill-down; dashboard KPI click-through remains. |
| RPT-011 | Cost-control dashboard | Provide Budget vs Commitment vs Actual vs Forecast dashboard. | Must | **Implemented** | Implemented 2026-10-23: budgets dashboard and detail display Budget vs Committed vs Actual vs Forecast with variance and utilisation. |
| RPT-012 | Quantity dashboard | Provide BOQ vs PO vs WO vs GRN vs Consumption vs Execution quantity dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-013 | Supplier dashboard | Provide Supplier-wise quantity and cost control dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-014 | Subcontractor dashboard | Provide Subcontractor-wise quantity and cost control dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-015 | Execution dashboard | Provide Plan vs Actual monthly execution dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-016 | Plan-comparison dashboard | Provide Baseline vs Revised Plan vs Actual dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-017 | Billing dashboard | Provide Execution vs Billing vs Collection dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-018 | Cash-flow dashboard | Provide Project Cash Flow Forecast vs Actual dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-019 | Margin dashboard | Provide Project Margin Forecast dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-020 | Risk dashboard | Provide Project Risk & Issue RAG dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-021 | Delay dashboard | Provide Recovery Plan and Delay Analysis dashboard. | Must | **Missing** | ❌ No implementation found |
| RPT-022 | Guarantee-expiry dashboard | Provide BG, PBG and Insurance expiry dashboard. | Should | **Missing** | ❌ No implementation found |

## 4.2 Project Implementation & Monitoring (28 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| PRJ-001 | Project setup | Create projects with code, client, contract value, start/end dates and site/location. | Must | **Partial** |  |
| PRJ-002 | WBS | Define a Work Breakdown Structure (WBS) with activities and sub-activities. | Must | **Partial** | Backend implemented 2026-10-23: Site/WBS/WBSItem/WBSVersion models and API with multi-level tree, move and baselines. UI drag-drop pending. |
| PRJ-003 | Milestones | Define milestones with planned dates and link them to client billing. | Must | **Partial** |  |
| PRJ-004 | Progress | Track physical progress % by activity, rolling up to project level. | Must | **Partial** |  |
| PRJ-005 | S-curve | Produce a planned-vs-actual S-curve and schedule performance indicator. | Must | **Partial** |  |
| PRJ-006 | Daily logs | Capture daily / periodic site progress logs from the field. | Must | **Partial** |  |
| PRJ-007 | Budget baseline | Maintain an approved budget baseline per project and per site, broken by cost head. | Must | **Partial** | Backend implemented 2026-10-23: Project/site budget baselines broken down by cost head via ProjectBudget and ProjectBudgetLine; UI pending. |
| PRJ-008 | Cost-to-complete | Track cost-to-complete and cost variance against budget in real time. | Must | **Implemented** | Backend implemented 2026-10-23: Cost-to-complete (forecast - actual) and cost variance (amount and %) update from commitments and ledger postings. |
| PRJ-009 | Budget revision | Any upward budget revision must trigger an approval workflow before it takes effect (see BUD). | Must | **Implemented** | Backend implemented 2026-10-23: Upward revisions require create→submit→approve on BudgetRevision; approval applies changes and recalculates totals. |
| PRJ-010 | Resource plan | Plan resources, equipment and material against the schedule. | Should | **Missing** | ❌ No implementation found |
| PRJ-011 | Dashboard | Provide a project dashboard showing health (RAG), progress, cost and cash status. | Must | **Missing** | ❌ No implementation found |
| PRJ-012 | Alerts | Alert on schedule slippage and milestone delay. | Should | **Partial** |  |
| PRJ-013 | Multi-project | Provide a consolidated multi-project / multi-site portfolio view. | Must | **Partial** |  |
| PRJ-014 | Attachments | Attach project documents (drawings, approvals) to the project record. | Must | **Partial** |  |
| PRJ-015 | Baseline control | Maintain Baseline Plan, Revised Plan and Actual Execution separately; baseline cannot be overwritten. | Must | **Partial** | Backend implemented 2026-10-23: Budget baseline is locked after activation, revisions retain original snapshot and revised values; full baseline-vs-revised-vs-actual reporting UI pending. |
| PRJ-016 | Execution monitoring | Provide monthly, weekly and daily planned vs actual execution quantity monitoring by project, site, WBS and activity. | Must | **Missing** | ❌ No implementation found |
| PRJ-017 | Slippage & recovery | Alert when actual execution falls behind the approved execution plan and require a recovery plan with responsible person... | Must | **Missing** | ❌ No implementation found |
| PRJ-018 | Quantity tracking | Track planned quantity, actual quantity, variance quantity and achievement % for each activity. | Must | **Partial** |  |
| PRJ-019 | Completion forecast | Track forecast final completion date against contractual and baseline completion dates. | Must | **Missing** | ❌ No implementation found |
| PRJ-020 | Delay register | Maintain a delay register capturing delay reason, responsible party, delay days, impact and recovery action. | Must | **Missing** | ❌ No implementation found |
| PRJ-021 | Milestone escalation | Track milestone delay and escalation to responsible management. | Must | **Partial** |  |
| PRJ-022 | Execution vs billing | Track execution vs billing and alert when billing/certification falls behind physical execution. | Must | **Missing** | ❌ No implementation found |
| PRJ-023 | Recovery monitoring | Provide recovery plan monitoring with original delay, recovery target and actual recovery. | Must | **Missing** | ❌ No implementation found |
| PRJ-024 | Risk & issue register | Provide project risk and issue register with owner, probability, impact, mitigation, due date and RAG status. | Must | **Missing** | ❌ No implementation found |
| PRJ-025 | Productivity | Track resource productivity by manpower, equipment and activity. | Should | **Missing** | ❌ No implementation found |
| PRJ-026 | Equipment utilisation | Track equipment utilisation against planned requirement. | Should | **Missing** | ❌ No implementation found |
| PRJ-027 | Meetings / MoM | Maintain project meeting/MoM records with action item, responsible person, target date, status, delay days and escalatio... | Should | **Missing** | ❌ No implementation found |
| PRJ-028 | Client correspondence | Maintain client correspondence linked to project, subject, reference, date, responsible person, response due date and st... | Should | **Missing** | ❌ No implementation found |

## 4.3 Procurement & Inventory (36 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| PRC-001 | Indent | Raise material requisition (indent) from project plans or from the field / mobile. | Must | **Implemented** | ✅ Core models + CRUD + API + UI |
| PRC-002 | Vendor master | Maintain a vendor master with category, GSTIN, contacts and rating. | Must | **Implemented** | ✅ Core models + CRUD + API + UI |
| PRC-003 | RFQ | Issue RFQ to multiple vendors and capture their quotations. | Must | **Missing** | ❌ No implementation found |
| PRC-004 | Comparative statement | Generate a comparative statement (CS) across received quotations. | Must | **Missing** | ❌ No implementation found |
| PRC-005 | Vendor evaluation | Evaluate and score vendors on defined criteria. | Should | **Partial** |  |
| PRC-006 | PO approval | Create a Purchase Order with multi-level, value-based approval workflow. | Must | **Partial** | Backend implemented 2026-10-23: Approval engine supports PURCHASE_ORDER workflows and value thresholds; PO creation still needs automatic approval-instance start and hard-stop gate. |
| PRC-007 | Budget check | At PO stage, block and route for approval any purchase that would exceed the project/site budget (see BUD). | Must | **Partial** | Backend implemented 2026-10-23: POST /budgets/check and PO→commitment hooks enforce available budget when hard stops are configured; PO creation itself is not yet blocked/routed. |
| PRC-008 | Price-escalation check | At PO stage, alert the purchase manager if the rate exceeds the estimated / last-purchased price beyond a configurable t... | Must | **Partial** |  |
| PRC-009 | GRN | Record Goods Receipt Note (GRN) against a PO with quantity and quality check. | Must | **Partial** |  |
| PRC-010 | 3-way match | Perform 3-way match (PO-GRN-invoice) before payment. | Must | **Missing** | ❌ No implementation found |
| PRC-011 | Inventory | Maintain multi-store / multi-site inventory with real-time stock levels and valuation. | Must | **Partial** |  |
| PRC-012 | Re-order alert | Raise re-order-level alerts when stock falls below threshold. | Should | **Partial** |  |
| PRC-013 | Material issue | Issue material to site and track consumption against the project. | Must | **Partial** |  |
| PRC-014 | Reverse auction | Provide a reverse-auction facility for critical / high-value materials, invoked after CS finalisation but before PO issu... | Should | **Partial** |  |
| PRC-015 | Price history | Provide material-wise historical / previous purchase price data for a selectable period for benchmarking. | Must | **Partial** |  |
| PRC-016 | Stock transfer | Support stock transfer between stores / sites. | Should | **Partial** |  |
| PRC-017 | Returns | Support purchase returns / debit notes. | Should | **Missing** | ❌ No implementation found |
| PRC-018 | BOQ quantity control | At PO stage, compare PO quantity against approved BOQ quantity and block/route for approval when PO quantity exceeds ava... | Must | **Partial** |  |
| PRC-019 | Quantity reconciliation | Track BOQ Qty - PR Qty - PO Qty - GRN Qty - Issue Qty - Consumption Qty - Balance Qty. | Must | **Partial** |  |
| PRC-020 | Supplier commitment | Maintain supplier-wise quantity and value commitment against BOQ/PO. | Must | **Partial** |  |
| PRC-021 | GRN control | Prevent supplier/GRN quantity from exceeding the corresponding approved PO quantity without approval. | Must | **Partial** |  |
| PRC-022 | Aggregate BOQ control | Track BOQ quantity vs total supplier PO quantity and alert/block when aggregate commitment exceeds BOQ. | Must | **Partial** |  |
| PRC-023 | Budget check (value) | Compare PO value against approved project/site/WBS budget and block + approval when budget is exceeded. | Must | **Partial** | Backend implemented 2026-10-23: PO totals are compared to active project budget through commitment creation and threshold alerts; pre-creation blocking/approval pending. |
| PRC-024 | Rate check | Compare purchase rate against budget/estimated/previous purchase rate and trigger configurable alert + approval. | Must | **Partial** |  |
| PRC-025 | Material budget | Maintain material-wise budget quantity, budget rate and budget amount and compare with procurement commitment and actual... | Must | **Partial** | Backend implemented 2026-10-23: Budget lines track quantity/rate/amount and commitments/actuals post against them; material-wise reconciliation pending. |
| PRC-026 | Shortage alert | Provide material shortage alerts based on planned execution requirement, available stock and incoming supply. | Must | **Missing** | ❌ No implementation found |
| PRC-027 | Wastage control | Track excess material consumption/wastage against approved norms or BOQ quantity. | Must | **Partial** |  |
| PRC-028 | Inventory visibility | Provide site-wise and project-wise inventory visibility. | Must | **Partial** |  |
| PRC-029 | Procurement planning | Provide material availability against the next execution plan and generate procurement/indent requirement. | Must | **Implemented** | ✅ Core models + CRUD + API + UI |
| PRC-030 | Inventory ageing | Provide inventory ageing, slow-moving and non-moving material reports. | Should | **Partial** |  |
| PRC-031 | Subcontractor material issue | Material Issue to Subcontractor vs Consumption vs Stock Control – Track material issued to each subcontractor against pr... | Must | **Partial** |  |
| PRC-032 | Subcontractor reconciliation | Subcontractor Material Reconciliation – Track material issued to subcontractor vs material consumed vs balance material ... | Must | **Partial** |  |
| PRC-033 | Subcontractor material ageing | Subcontractor Material Ageing – Maintain ageing of material lying with each subcontractor from the date of issue. | Must | **Missing** | ❌ No implementation found |
| PRC-034 | Excess material alert | Excess/Unconsumed Material Alert – Compare material issued to subcontractor against certified/executed consumption. | Must | **Partial** |  |
| PRC-035 | Material return | Material Return from Subcontractor – Record unused/excess material returned to project/site store. | Must | **Missing** | ❌ No implementation found |
| PRC-036 | Subcontractor material statement | Subcontractor-wise Material Statement – Provide material issued, consumed, returned and balance for each subcontractor. | Must | **Partial** |  |

## 4.4 Budget Control, Approvals & Alerts (24 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| BUD-001 | Baseline | Maintain an approved budget baseline at project and site level. | Must | **Partial** | Backend implemented 2026-10-23: ProjectBudget with project/site dimensions, activate→lock lifecycle and baselineDate; approved budgets become read-only. UI pending. |
| BUD-002 | Cost heads | Break the budget by cost head (material, labour, subcontract, overhead). | Must | **Implemented** | Backend implemented 2026-10-23: CostHead master plus ProjectBudgetLine grouped by cost head; summary rolls up planned/committed/actual/forecast/variance per cost head. |
| BUD-003 | Tracking | Track committed and actual spend against budget in real time. | Must | **Implemented** | Backend implemented 2026-10-23: Committed and actual spend update from commitments and ProjectCostLedger; /budgets/:id/summary and /budgets/dashboard expose live totals. |
| BUD-004 | Workflow | Provide configurable approval workflows with multiple levels and value-based routing (e.g. Site Engineer to PM to Financ... | Must | **Implemented** | Backend implemented 2026-10-23: ApprovalWorkflow/ApprovalStep with serial+parallel steps, ALL/ANY groups, role/permission/user approvers and value-based ApprovalThreshold routing. |
| BUD-005 | Delegation | Support delegation of approval authority and escalation on delay. | Must | **Implemented** | Backend implemented 2026-10-23: ApprovalDelegation (date-bounded) and ApprovalEscalationRule with NOTIFY/REASSIGN plus POST /approvals/escalations/run. |
| BUD-006 | Blocking trigger | Block a transaction and route it for approval when a defined threshold is breached (not merely warn). | Must | **Implemented** | Implemented 2026-10-23: over-budget commitments are persisted as PENDING and routed to a BUDGET_COMMITMENT approval instance; approval marks COMMITTED, rejection cancels. |
| BUD-007 | Configurable thresholds | Thresholds must be configurable (absolute value and/or percentage) per project, site and cost head. | Must | **Partial** | Backend implemented 2026-10-23: BudgetThreshold per project/site/cost head/budget with warning, critical and hard-stop percentages and hard-stop toggle; absolute-value thresholds pending. |
| BUD-008 | Alerts | Send real-time alerts (in-app, email, mobile/WhatsApp) when a budget or price threshold is approached or breached. | Must | **Implemented** | Implemented 2026-10-23: threshold alerts create in-app notifications for budget:approve users and send SMTP email when configured (WhatsApp not included). |
| BUD-009 | Audit trail | Maintain a full audit trail of budget revisions and approvals (requester, original vs revised, justification, approver, ... | Must | **Implemented** | Backend implemented 2026-10-23: BudgetRevision stores requester, reason, justification, before/after totals, delta, snapshot, changes JSON, approver/rejecter and timestamps. |
| BUD-010 | Scenario A | Budget increase: a revision to a project/site budget takes effect only after the designated authority approves it. | Must | **Implemented** | Backend implemented 2026-10-23: Budget increases require a revision; approval endpoint applies changes and bumps totals, direct edits allowed only in DRAFT. |
| BUD-011 | Scenario B | Procurement cost increase: if a rate rises above the estimated/previous price beyond the threshold, or spend would excee... | Must | **Partial** | Backend implemented 2026-10-23: PO creation reserves a BudgetCommitment and raises threshold alerts; rate-vs-estimate comparison and automatic approval routing pending. |
| BUD-012 | Approvals dashboard | Provide a pending-approvals dashboard per user with approval history. | Should | **Implemented** | Backend implemented 2026-10-23: GET /approvals/inbox, /approvals/my-requests, /approvals/dashboard and per-instance history provide pending approvals and audit trail. |
| BUD-013 | Budget hierarchy | Maintain budget at Project - Site - WBS - BOQ - Cost Head level. | Must | **Partial** | Backend implemented 2026-10-23: Budget lines carry project, site, WBS, WBS item, BOQ, BOQ line and cost head references; hierarchy validation and drill-down UI pending. |
| BUD-014 | Cost control | Track Budget - Commitment - Actual - Forecast - Cost to Complete - Variance in real time. | Must | **Implemented** | Backend implemented 2026-10-23: Planned, committed, actual, forecast, cost-to-complete and variance computed on every commitment/ledger post and exposed in budget summary. |
| BUD-015 | WO budget control | Block and route for approval when WO value exceeds approved budget. | Must | **Missing** | Work-order module integration is not implemented yet. |
| BUD-016 | Committed-cost control | Block and route for approval when supplier/subcontractor committed cost exceeds budget. | Must | **Implemented** | Implemented 2026-10-23: commitments breaching the configured hard stop are blocked and routed for approval before counting as committed cost. |
| BUD-017 | Quantity budgeting | Track budgeted quantity × budgeted rate = budgeted amount for controlled BOQ/cost items. | Must | **Implemented** | Backend implemented 2026-10-23: Budget lines store quantity × planned rate with computed planned amount and forecast amount. |
| BUD-018 | Budget vs commitment | Compare budgeted cost vs PO/WO cost by project, WBS, BOQ, supplier and subcontractor. | Must | **Partial** | Backend implemented 2026-10-23: Commitments store vendor, project and budget line; budget-vs-commitment comparison exists per project/line, WBS/BOQ/subcontractor rollups pending. |
| BUD-019 | Forecast control | Alert and route for approval when Forecast Cost > Approved Budget. | Must | **Partial** | Backend implemented 2026-10-23: Threshold alerts fire when projected utilisation breaches warning/critical/hard-stop; automatic forecast>budget approval routing pending. |
| BUD-020 | Variance | Provide budget variance by amount and percentage. | Must | **Implemented** | Backend implemented 2026-10-23: Budget summary and dashboard expose variance amount and variance percentage along with utilisation. |
| BUD-021 | Revision history | Maintain full history of Original Budget - Approved Revision - Current Budget. | Must | **Implemented** | Backend implemented 2026-10-23: BudgetRevision keeps revision number plus original/revised totals, per-line before/after and snapshot; list endpoint returns full history. |
| BUD-022 | Baseline lock | Prevent direct modification of approved budget baseline; revisions require approval. | Must | **Implemented** | Backend implemented 2026-10-23: Only DRAFT budgets can be edited; activate/lock lifecycle plus revision approval prevents direct changes to an approved baseline. |
| BUD-023 | Hard-stop controls | Provide configurable hard-stop controls for quantity/value threshold breaches. | Must | **Partial** | Backend implemented 2026-10-23: Configurable hard-stop percentages/toggle per project/site/cost head/budget block commitments; quantity-based hard stops pending. |
| BUD-024 | Audit trail | Maintain transaction-level audit trail including delay analysis/reason for variance. | Must | **Partial** | Implemented 2026-10-23: shared audit log captures actor, action, before/after and correlation id for every mutation; explicit delay-analysis/reason-for-variance capture remains. |

## 4.5 Subcontractor Management (16 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| SUB-001 | Master | Maintain a subcontractor master with compliance documents (licences, insurance, statutory). | Must | **Partial** |  |
| SUB-002 | Compliance alerts | Raise compliance-document expiry alerts. | Must | **Missing** | ❌ No implementation found |
| SUB-003 | Work orders | Maintain a subcontract / work-order register with scope, rates and value. | Must | **Missing** | ❌ No implementation found |
| SUB-004 | RA billing | Support progress-based billing / running-account (RA) bills. | Must | **Missing** | ❌ No implementation found |
| SUB-005 | Retention | Track retention (percentage, amount held, amount released). | Must | **Missing** | ❌ No implementation found |
| SUB-006 | Rating | Record subcontractor performance rating. | Should | **Partial** |  |
| SUB-007 | Cost link | Link subcontract cost to project cost and budget. | Must | **Missing** | ❌ No implementation found |
| SUB-008 | Bill approval | Route subcontractor bills through multi-level approval. | Must | **Partial** | Backend implemented 2026-10-23: Approval engine supports multi-level workflows for subcontractor bills; subcontractor module and bill hook pending. |
| SUB-009 | Quantity tracking | Track BOQ Qty - WO Qty - Executed Qty - Certified Qty - Billed Qty - Paid Qty - Balance Qty. | Must | **Missing** | ❌ No implementation found |
| SUB-010 | WO quantity control | Block subcontractor WO quantity when WO Qty > available BOQ Qty, subject to approval. | Must | **Missing** | ❌ No implementation found |
| SUB-011 | Execution control | Block subcontractor execution/billing when Executed/Certified Qty > WO Qty, subject to configured control. | Must | **Missing** | ❌ No implementation found |
| SUB-012 | Subcontractor vs BOQ | Track subcontractor-wise quantity and value against project BOQ. | Must | **Missing** | ❌ No implementation found |
| SUB-013 | Rate control | Compare WO rate/value against budgeted rate/value and alert/block when exceeded. | Must | **Missing** | ❌ No implementation found |
| SUB-014 | Productivity | Track subcontractor planned vs actual execution and productivity. | Must | **Missing** | ❌ No implementation found |
| SUB-015 | Performance | Track subcontractor performance including quality, schedule, quantity, cost and compliance. | Must | **Partial** |  |
| SUB-016 | Compliance alerts | Provide subcontractor compliance expiry alerts for insurance, licences, statutory documents and other mandatory document... | Must | **Partial** |  |

## 4.6 Finance & Accounts (30 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| FIN-001 | GL | Provide a general ledger with a configurable chart of accounts. | Must | **Partial** |  |
| FIN-002 | AP | Manage accounts payable (vendor bills and payments). | Must | **Partial** |  |
| FIN-003 | AR | Manage accounts receivable (client invoices and collections). | Must | **Partial** |  |
| FIN-004 | Bank | Provide bank & cash management with bank reconciliation. | Must | **Missing** | ❌ No implementation found |
| FIN-005 | Milestone invoicing | Raise client invoices linked to milestones / RA bills. | Must | **Partial** |  |
| FIN-006 | Collections | Track collections and receivables ageing. | Must | **Partial** |  |
| FIN-007 | Project P&L | Provide project-wise profitability, cost ledgers and P&L. | Must | **Missing** | ❌ No implementation found |
| FIN-008 | Cash flow | Provide cash-flow tracking and forecasting. | Should | **Partial** |  |
| FIN-009 | GST | Compute GST (CGST/SGST/IGST) on transactions. | Must | **Missing** | ❌ No implementation found |
| FIN-010 | e-Invoice | Generate GST e-invoices (IRN / QR). | Must | **Missing** | ❌ No implementation found |
| FIN-011 | e-Way bill | Generate e-way bills. | Must | **Missing** | ❌ No implementation found |
| FIN-012 | TDS | Compute and deduct TDS (Sections 194C / 194J / 194I and others). | Must | **Missing** | ❌ No implementation found |
| FIN-013 | Statutory reports | Produce statutory reports/data for GST and TDS filing. | Must | **Missing** | ❌ No implementation found |
| FIN-014 | Migration | Migrate opening balances and masters from the existing tool (e.g. Tally). | Must | **Missing** | ❌ No implementation found |
| FIN-015 | Period close | Provide financial period close controls and back-dated-entry control. | Must | **Missing** | ❌ No implementation found |
| FIN-016 | Multi-entity | Support multiple companies / entities if required. | Could | **Partial** |  |
| FIN-017 | Execution vs billing | Provide execution vs billing vs collection monitoring at project/site level. | Must | **Partial** |  |
| FIN-018 | Billing-lag alert | Alert when billing/certification falls behind physical execution beyond configured threshold. | Must | **Partial** |  |
| FIN-019 | Collection escalation | Provide collection overdue escalation based on invoice due date and ageing. | Must | **Partial** |  |
| FIN-020 | Cash-flow forecast | Provide monthly project cash-flow forecast vs actual. | Must | **Partial** |  |
| FIN-021 | Cash requirement | Track project cash requirement based on planned execution, procurement, subcontract and expected collections. | Must | **Missing** | ❌ No implementation found |
| FIN-022 | Financial securities | Track advance, retention, PBG and other financial securities project-wise. | Must | **Missing** | ❌ No implementation found |
| FIN-023 | Margin forecast | Provide forecast revenue, forecast cost and forecast project margin. | Must | **Partial** |  |
| FIN-024 | Margin alert | Alert management when project margin falls below configured threshold. | Must | **Partial** |  |
| FIN-025 | Negative-margin alert | Alert management on negative forecast project margin. | Must | **Partial** |  |
| FIN-026 | Receivable ageing | Provide receivable ageing and collection action tracking. | Must | **Partial** |  |
| FIN-027 | Guarantee register | Maintain project-wise BG/PBG/Advance Guarantee/Insurance register. | Must | **Missing** | ❌ No implementation found |
| FIN-028 | Guarantee details | Track issue date, expiry date, amount, beneficiary, issuing bank/insurer and status. | Must | **Partial** |  |
| FIN-029 | Expiry alerts | Generate configurable alerts before BG/PBG/Insurance expiry. | Must | **Missing** | ❌ No implementation found |
| FIN-030 | Renewal tracking | Track renewal/release status and responsible person. | Must | **Partial** |  |

## 4.7 HR & Workforce Management (17 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| HR-001 | Employee master | Maintain an employee master with documents and organisation structure. | Must | **Implemented** | ✅ Core models + CRUD + API + UI |
| HR-002 | Attendance | Capture site-wise attendance (mobile / geo-tagged / biometric integration). | Must | **Partial** |  |
| HR-003 | Timesheet | Record timesheets by project and activity for costing. | Must | **Missing** | ❌ No implementation found |
| HR-004 | Payroll | Run payroll with Indian statutory deductions (EPF, ESI, PT, TDS). | Must | **Missing** | ❌ No implementation found |
| HR-005 | Payslip | Generate payslips. | Must | **Missing** | ❌ No implementation found |
| HR-006 | Leave | Manage leave (types, balances, approvals). | Must | **Implemented** | ✅ Core models + CRUD + API + UI |
| HR-007 | Skills register | Maintain a skills / trade register. | Should | **Missing** | ❌ No implementation found |
| HR-008 | Contract labour | Handle contract / daily-wage labour distinctly from payroll staff, including wage computation. | Must | **Missing** | ❌ No implementation found |
| HR-009 | Travel | Provide a travel request and approval workflow. | Should | **Missing** | ❌ No implementation found |
| HR-010 | Expense claims | Support expense claims and reimbursement processing. | Must | **Missing** | ❌ No implementation found |
| HR-011 | Performance | Support performance management (goals, appraisals, reviews). | Should | **Missing** | ❌ No implementation found |
| HR-012 | Directory | Provide a searchable people / employee directory. | Should | **Partial** |  |
| HR-013 | Statutory registers | Produce statutory registers/reports (EPF, ESI, PT). | Must | **Missing** | ❌ No implementation found |
| HR-014 | Cost mapping | Map employee cost to cost centre / profit centre / WBS for project costing. | Should | **Missing** | ❌ No implementation found |
| HR-015 | Manpower planning | Allow annual and project-wise manpower planning. | Should | **Missing** | ❌ No implementation found |
| HR-016 | Recruitment | Provide a complete recruitment workflow from requisition to offer/onboarding. | Should | **Missing** | ❌ No implementation found |
| HR-017 | Onboarding | Provide a joining/onboarding checklist that tracks to 100% completion status. | Should | **Missing** | ❌ No implementation found |

## 4.8 Field Data Entry (Mobile, Real-Time) (10 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| FLD-001 | Responsive | Provide a mobile-friendly / responsive interface usable on low-cost devices. | Must | **Partial** |  |
| FLD-002 | Connectivity | Function on intermittent connectivity; offline capture with later sync (desirable). | Should | **Missing** | ❌ No implementation found |
| FLD-003 | Daily report | Capture a daily site report: manpower deployed, work executed, material consumed, weather, equipment and any hindrances ... | Must | **Partial** |  |
| FLD-004 | Photo capture | Capture photos / documents with geo-tag and timestamp. | Must | **Partial** |  |
| FLD-005 | Incident report | Allow safety / incident reporting from the field. | Must | **Missing** | ❌ No implementation found |
| FLD-006 | Role access | Restrict field users to their own site and permitted forms. | Must | **Partial** |  |
| FLD-007 | Cross-module update | Field entries automatically update project progress, inventory consumption, HR attendance, cost ledgers and QHSE records... | Must | **Partial** |  |
| FLD-008 | Offline queue | Queue offline entries and handle conflicts on sync. | Should | **Missing** | ❌ No implementation found |
| FLD-009 | Multi-language | Support multiple languages for site staff (desirable). | Could | **Partial** |  |
| FLD-010 | Guided forms | Provide guided, minimal-entry forms for supervisors. | Should | **Missing** | ❌ No implementation found |

## 4.9 QHSE (Quality, Health, Safety & Environment) (7 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| QHS-001 | Inspections | Provide inspection checklists and quality records. | Must | **Implemented** | ✅ Core models + CRUD + API + UI |
| QHS-002 | NCR | Maintain an NCR register with a closure workflow. | Must | **Missing** | ❌ No implementation found |
| QHS-003 | Incident | Support incident / near-miss reporting and investigation tracking. | Must | **Missing** | ❌ No implementation found |
| QHS-004 | Toolbox talk | Record toolbox talk records. | Should | **Missing** | ❌ No implementation found |
| QHS-005 | Safety observation | Record safety-observation records. | Should | **Partial** |  |
| QHS-006 | Dashboard | Provide QHSE dashboards (days without LTI, open NCRs, inspections done). | Should | **Implemented** | ✅ Core models + CRUD + API + UI |
| QHS-007 | Linkage | Link QHSE records to project / site. | Must | **Partial** |  |

## 5 & 6. Technical, Security & Non-Functional (15 requirements)

| Req ID | Category | Requirement | Priority | Status | Evidence |
|--------|----------|-------------|----------|--------|----------|
| TEC-001 | Cloud | Provide a cloud-based solution accessible via web browser and mobile. | Must | **Partial** |  |
| TEC-002 | Mobile app | Provide responsive mobile access or a native app for field entry. | Must | **Partial** |  |
| TEC-003 | RBAC | Provide role-based access control and configurable approval workflows. | Must | **Partial** |  |
| TEC-004 | APIs | Provide open, documented APIs / integration capability (payment gateway, banking, biometric, WhatsApp/SMS/email). | Must | **Partial** |  |
| TEC-005 | Data residency | Host data (and backups) in India, in line with prevailing data-protection regulations. | Must | **Config-only** | ⚙️ Env vars/config only |
| TEC-006 | Low-code | Be configurable without heavy custom coding wherever possible; low-code extensibility preferred. | Should | **Partial** |  |
| TEC-007 | Encryption | Encrypt data in transit and at rest (database and file storage). | Must | **Partial** |  |
| TEC-008 | MFA | Provide multi-factor authentication, enforceable for privileged roles. | Must | **Missing** | ❌ No implementation found |
| TEC-009 | Audit logs | Maintain audit trails on financial and approval actions. | Must | **Implemented** | Implemented 2026-10-23: global audit interceptor plus /audit query API cover financial and approval mutations with configurable retention pruning. |
| TEC-010 | Backup/DR | Provide data backup and disaster-recovery provisions with a tested restore. | Must | **Config-only** | ⚙️ Env vars/config only |
| TEC-011 | Availability | Meet a target uptime of 99.5% or better with defined maintenance windows. | Must | **Operational** | ☁️ Deployment/process evidence needed |
| TEC-012 | Storage | State included cloud-storage capacity, additional-storage cost/slab, scalability and retention. | Must | **Config-only** | ⚙️ Env vars/config only |
| TEC-013 | Scalability | Scale to support growth in users, projects and transaction volume to the target turnover without re-platforming. | Must | **Partial** |  |
| TEC-014 | Breach notice | Notify GESPL of a security incident/breach within a defined window. | Must | **Partial** |  |
| TEC-015 | Data ownership | Ensure GESPL owns all data with export and secure deletion on exit. | Must | **Missing** | ❌ No implementation found |
