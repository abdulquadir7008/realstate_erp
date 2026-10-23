# Requirements by Module

## 4.1 Tendering & Estimation (17 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| TND-001 | Tender Search & Alerts | Capture tenders from GEM, CPPP, utility portals and internal referrals.... | Must | Tender opportunities recorded and tracked.... |
| TND-002 | Bid register | Maintain a tender / bid register capturing tender reference, client, estimated value, submission deadline and current st... | Must | New tender can be created and listed; all fields searchable/filterable.... |
| TND-003 | Qualification Mapping | Map tender qualification criteria against company credentials.... | Should | Compliance report generated automatically... |
| TND-004 | Risk assessment & contingency | Estimate project risks and contingencies.... | Should | Risk provisions included in estimate.... |
| TND-005 | Go / No-Go Approval | Workflow for management approval before bidding.... | Must | Bid cannot progress without approval.... |
| TND-006 | Stage tracking | Track each bid through configurable stages (screening, technical, costing, submission, outcome).... | Must | Stages configurable; a bid can be moved through stages with date stamps.... |
| TND-007 | BOQ | Prepare a Bill of Quantities (BOQ) with line items, units, quantities and rates.... | Must | BOQ created with computed line and total amounts.... |
| TND-008 | Rate master | Maintain rate masters and reusable item libraries for BOQ preparation.... | Must | Items pulled from a library; rates centrally maintained and updatable.... |
| TND-009 | Cost build-up | Build the cost estimate showing direct cost, overheads, contingency and margin as separate components.... | Must | Each component visible and adjustable; total price derived.... |
| TND-010 | Versioning | Support versioning of BOQ / estimate revisions with history.... | Must | Prior versions retained and viewable.... |
| TND-011 | Doc checklist | Maintain a document checklist per tender and track submission readiness (%).... | Must | Checklist items marked complete; readiness % shown.... |
| TND-012 | Win/loss | Capture bid outcome (won / lost) with reason codes for win-loss analysis.... | Should | Outcome recorded; win-rate reportable.... |
| TND-013 | Conversion | Convert a won bid into a project, carrying over BOQ, budget and scope.... | Must | One action creates a project pre-populated from the bid.... |
| TND-014 | Dashboard | Provide a tender pipeline dashboard (value by stage, win rate, upcoming deadlines).... | Should | Live dashboard reflecting register data.... |
| TND-015 | Attachments | Attach tender documents (RFP, drawings, correspondence) to the bid record.... | Must | Files attached and retrievable per tender.... |
| TND-016 | Access | Role-based access to tender/estimation data.... | Must | Only authorised roles can view/edit tenders.... |
| TND-017 | Kick-off / project handover | Transfer estimate, BOQ, assumptions and budget to execution team.... | Must | Approved  Tender baseline budget.... |

## 4.10 Document Control (10 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| DOC-001 | Register | Maintain a version-controlled drawing and document register.... | Must | Documents versioned; latest clearly identified.... |
| DOC-002 | Transmittals | Maintain a transmittals log.... | Should | Transmittals recorded with recipients/date.... |
| DOC-003 | RFI | Maintain an RFI (Request for Information) register.... | Should | RFIs raised, tracked and closed.... |
| DOC-004 | Approval workflow | Provide document approval workflows.... | Must | Documents routed for approval before issue.... |
| DOC-005 | Access control | Control document access by project and role.... | Must | Only authorised roles access documents.... |
| DOC-006 | Search | Provide document search and retrieval.... | Must | Documents found by metadata/keyword.... |
| DOC-007 | Audit | Maintain an audit trail of document versions and access.... | Should | Version/access history retained.... |
| DOC-008 | Deliverables tracking | Track engineering/drawing deliverables planned vs received vs approved.... | Must | Engineering/drawing deliverables tracked planned vs received vs approved.... |
| DOC-009 | GTP approval | Track GTP/technical document approval status and ageing.... | Must | GTP/technical document approval status and ageing tracked.... |
| DOC-010 | Deliverable alerts | Alert on delayed engineering deliverables affecting project execution.... | Must | Alerts raised on delayed engineering deliverables affecting execution.... |

## 4.11 Reports, Dashboards & Analytics (22 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| RPT-001 | Role dashboards | Provide role-based dashboards (management, project, procurement, finance, HR).... | Must | Each role sees a relevant dashboard.... |
| RPT-002 | Operational reports | Provide standard operational reports.... | Must | Standard reports available out of the box.... |
| RPT-003 | Statutory reports | Provide standard statutory reports.... | Must | GST/TDS/payroll statutory outputs available.... |
| RPT-004 | Export | Export reports to Excel / PDF.... | Must | Any report exportable to Excel and PDF.... |
| RPT-005 | Report builder | Provide a configurable report builder for ad-hoc needs.... | Should | Users build custom reports without code.... |
| RPT-006 | Earned value | Provide earned-value analysis.... | Should | EV metrics (PV/EV/AC, CPI/SPI) reportable.... |
| RPT-007 | Utilisation | Provide resource-utilisation reporting.... | Should | Utilisation by resource/period.... |
| RPT-008 | Cash position | Provide cash-position reporting.... | Must | Live cash position across accounts.... |
| RPT-009 | Profitability | Provide project-profitability analytics.... | Must | Profitability by project and portfolio.... |
| RPT-010 | Drill-down | Allow drill-down from dashboard to underlying transactions.... | Should | Click-through from KPI to records.... |
| RPT-011 | Cost-control dashboard | Provide Budget vs Commitment vs Actual vs Forecast dashboard.... | Must | Budget vs commitment vs actual vs forecast displayed.... |
| RPT-012 | Quantity dashboard | Provide BOQ vs PO vs WO vs GRN vs Consumption vs Execution quantity dashboard.... | Must | BOQ vs PO vs WO vs GRN vs consumption vs execution quantity displayed.... |
| RPT-013 | Supplier dashboard | Provide Supplier-wise quantity and cost control dashboard.... | Must | Supplier-wise quantity and cost control displayed.... |
| RPT-014 | Subcontractor dashboard | Provide Subcontractor-wise quantity and cost control dashboard.... | Must | Subcontractor-wise quantity and cost control displayed.... |
| RPT-015 | Execution dashboard | Provide Plan vs Actual monthly execution dashboard.... | Must | Monthly plan vs actual execution displayed.... |
| RPT-016 | Plan-comparison dashboard | Provide Baseline vs Revised Plan vs Actual dashboard.... | Must | Baseline vs revised plan vs actual displayed.... |
| RPT-017 | Billing dashboard | Provide Execution vs Billing vs Collection dashboard.... | Must | Execution vs billing vs collection displayed.... |
| RPT-018 | Cash-flow dashboard | Provide Project Cash Flow Forecast vs Actual dashboard.... | Must | Project cash-flow forecast vs actual displayed.... |
| RPT-019 | Margin dashboard | Provide Project Margin Forecast dashboard.... | Must | Project margin forecast displayed.... |
| RPT-020 | Risk dashboard | Provide Project Risk & Issue RAG dashboard.... | Must | Project risk & issue RAG displayed.... |
| RPT-021 | Delay dashboard | Provide Recovery Plan and Delay Analysis dashboard.... | Must | Recovery plan and delay analysis displayed.... |
| RPT-022 | Guarantee-expiry dashboard | Provide BG, PBG and Insurance expiry dashboard.... | Should | BG, PBG and insurance expiry displayed.... |

## 4.2 Project Implementation & Monitoring (28 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| PRJ-001 | Project setup | Create projects with code, client, contract value, start/end dates and site/location.... | Must | Project created with all attributes; unique code.... |
| PRJ-002 | WBS | Define a Work Breakdown Structure (WBS) with activities and sub-activities.... | Must | Multi-level WBS created per project.... |
| PRJ-003 | Milestones | Define milestones with planned dates and link them to client billing.... | Must | Milestones created and linkable to invoices.... |
| PRJ-004 | Progress | Track physical progress % by activity, rolling up to project level.... | Must | Activity progress entered; project % auto-calculated.... |
| PRJ-005 | S-curve | Produce a planned-vs-actual S-curve and schedule performance indicator.... | Must | S-curve chart and SPI generated from plan vs actual.... |
| PRJ-006 | Daily logs | Capture daily / periodic site progress logs from the field.... | Must | Site logs recorded and visible on the project.... |
| PRJ-007 | Budget baseline | Maintain an approved budget baseline per project and per site, broken by cost head.... | Must | Baseline stored per site and cost head.... |
| PRJ-008 | Cost-to-complete | Track cost-to-complete and cost variance against budget in real time.... | Must | CTC and variance update as costs post.... |
| PRJ-009 | Budget revision | Any upward budget revision must trigger an approval workflow before it takes effect (see BUD).... | Must | Revision blocked until approved; see Budget Control module.... |
| PRJ-010 | Resource plan | Plan resources, equipment and material against the schedule.... | Should | Resources allocated to activities/dates.... |
| PRJ-011 | Dashboard | Provide a project dashboard showing health (RAG), progress, cost and cash status.... | Must | Dashboard reflects live project data.... |
| PRJ-012 | Alerts | Alert on schedule slippage and milestone delay.... | Should | Notifications sent on defined triggers.... |
| PRJ-013 | Multi-project | Provide a consolidated multi-project / multi-site portfolio view.... | Must | Portfolio view aggregating all projects.... |
| PRJ-014 | Attachments | Attach project documents (drawings, approvals) to the project record.... | Must | Files attached and retrievable per project.... |
| PRJ-015 | Baseline control | Maintain Baseline Plan, Revised Plan and Actual Execution separately; baseline cannot be overwritten.... | Must | Baseline, revised plan and actuals held separately; approved baseline locked and cannot be overwritt... |
| PRJ-016 | Execution monitoring | Provide monthly, weekly and daily planned vs actual execution quantity monitoring by project, site, WBS and activity.... | Must | Planned vs actual execution quantity viewable monthly/weekly/daily by project, site, WBS and activit... |
| PRJ-017 | Slippage & recovery | Alert when actual execution falls behind the approved execution plan and require a recovery plan with responsible person... | Must | Behind-plan alert raised; a recovery plan with responsible person and target date is required.... |
| PRJ-018 | Quantity tracking | Track planned quantity, actual quantity, variance quantity and achievement % for each activity.... | Must | Planned qty, actual qty, variance qty and achievement % shown per activity.... |
| PRJ-019 | Completion forecast | Track forecast final completion date against contractual and baseline completion dates.... | Must | Forecast final completion date compared against contractual and baseline completion dates.... |
| PRJ-020 | Delay register | Maintain a delay register capturing delay reason, responsible party, delay days, impact and recovery action.... | Must | Delay reason, responsible party, delay days, impact and recovery action recorded per entry.... |
| PRJ-021 | Milestone escalation | Track milestone delay and escalation to responsible management.... | Must | Milestone delay flagged and escalated to the responsible management.... |
| PRJ-022 | Execution vs billing | Track execution vs billing and alert when billing/certification falls behind physical execution.... | Must | Alert raised when billing/certification falls behind physical execution.... |
| PRJ-023 | Recovery monitoring | Provide recovery plan monitoring with original delay, recovery target and actual recovery.... | Must | Original delay, recovery target and actual recovery tracked per plan.... |
| PRJ-024 | Risk & issue register | Provide project risk and issue register with owner, probability, impact, mitigation, due date and RAG status.... | Must | Each risk/issue holds owner, probability, impact, mitigation, due date and RAG status.... |
| PRJ-025 | Productivity | Track resource productivity by manpower, equipment and activity.... | Should | Productivity tracked by manpower, equipment and activity.... |
| PRJ-026 | Equipment utilisation | Track equipment utilisation against planned requirement.... | Should | Equipment utilisation reported against planned requirement.... |
| PRJ-027 | Meetings / MoM | Maintain project meeting/MoM records with action item, responsible person, target date, status, delay days and escalatio... | Should | MoM records hold action item, responsible person, target date, status, delay days and escalation.... |
| PRJ-028 | Client correspondence | Maintain client correspondence linked to project, subject, reference, date, responsible person, response due date and st... | Should | Correspondence logged with subject, reference, date, owner, response-due date and status.... |

## 4.3 Procurement & Inventory (36 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| PRC-001 | Indent | Raise material requisition (indent) from project plans or from the field / mobile.... | Must | Indent created on web and mobile; linked to project.... |
| PRC-002 | Vendor master | Maintain a vendor master with category, GSTIN, contacts and rating.... | Must | Vendors created and searchable; GSTIN stored.... |
| PRC-003 | RFQ | Issue RFQ to multiple vendors and capture their quotations.... | Must | RFQ sent; quotations recorded per vendor.... |
| PRC-004 | Comparative statement | Generate a comparative statement (CS) across received quotations.... | Must | CS auto-built comparing price/terms.... |
| PRC-005 | Vendor evaluation | Evaluate and score vendors on defined criteria.... | Should | Vendor scores recorded and reportable.... |
| PRC-006 | PO approval | Create a Purchase Order with multi-level, value-based approval workflow.... | Must | PO routed by value; approvals logged.... |
| PRC-007 | Budget check | At PO stage, block and route for approval any purchase that would exceed the project/site budget (see BUD).... | Must | Over-budget PO is blocked and routed, not just warned.... |
| PRC-008 | Price-escalation check | At PO stage, alert the purchase manager if the rate exceeds the estimated / last-purchased price beyond a configurable t... | Must | Threshold breach triggers alert + approval before release.... |
| PRC-009 | GRN | Record Goods Receipt Note (GRN) against a PO with quantity and quality check.... | Must | GRN posted; quantities validated vs PO.... |
| PRC-010 | 3-way match | Perform 3-way match (PO-GRN-invoice) before payment.... | Must | Mismatch flagged before payment approval.... |
| PRC-011 | Inventory | Maintain multi-store / multi-site inventory with real-time stock levels and valuation.... | Must | Stock and value visible per store/site in real time.... |
| PRC-012 | Re-order alert | Raise re-order-level alerts when stock falls below threshold.... | Should | Alert generated at defined re-order level.... |
| PRC-013 | Material issue | Issue material to site and track consumption against the project.... | Must | Issue reduces stock and posts to project cost.... |
| PRC-014 | Reverse auction | Provide a reverse-auction facility for critical / high-value materials, invoked after CS finalisation but before PO issu... | Should | Reverse-auction round can be run and outcome fed to PO.... |
| PRC-015 | Price history | Provide material-wise historical / previous purchase price data for a selectable period for benchmarking.... | Must | Historical prices viewable by item and period.... |
| PRC-016 | Stock transfer | Support stock transfer between stores / sites.... | Should | Transfer reduces source and increases destination stock.... |
| PRC-017 | Returns | Support purchase returns / debit notes.... | Should | Return posted and stock/ledger updated.... |
| PRC-018 | BOQ quantity control | At PO stage, compare PO quantity against approved BOQ quantity and block/route for approval when PO quantity exceeds ava... | Must | PO qty compared to approved BOQ qty; PO exceeding BOQ qty is blocked and routed for approval.... |
| PRC-019 | Quantity reconciliation | Track BOQ Qty - PR Qty - PO Qty - GRN Qty - Issue Qty - Consumption Qty - Balance Qty.... | Must | BOQ to PR to PO to GRN to Issue to Consumption to Balance quantities tracked end to end.... |
| PRC-020 | Supplier commitment | Maintain supplier-wise quantity and value commitment against BOQ/PO.... | Must | Supplier-wise committed quantity and value tracked against BOQ/PO.... |
| PRC-021 | GRN control | Prevent supplier/GRN quantity from exceeding the corresponding approved PO quantity without approval.... | Must | GRN/supplier quantity cannot exceed the corresponding approved PO quantity without approval.... |
| PRC-022 | Aggregate BOQ control | Track BOQ quantity vs total supplier PO quantity and alert/block when aggregate commitment exceeds BOQ.... | Must | Aggregate supplier PO qty vs BOQ qty tracked; over-commitment alerted/blocked.... |
| PRC-023 | Budget check (value) | Compare PO value against approved project/site/WBS budget and block + approval when budget is exceeded.... | Must | PO value compared to approved project/site/WBS budget; over-budget blocked and routed. [See PRC-007]... |
| PRC-024 | Rate check | Compare purchase rate against budget/estimated/previous purchase rate and trigger configurable alert + approval.... | Must | Purchase rate compared to budget/estimated/previous rate; breach triggers configurable alert + appro... |
| PRC-025 | Material budget | Maintain material-wise budget quantity, budget rate and budget amount and compare with procurement commitment and actual... | Must | Material budget quantity, rate and amount compared with procurement commitment and actual cost.... |
| PRC-026 | Shortage alert | Provide material shortage alerts based on planned execution requirement, available stock and incoming supply.... | Must | Material shortage alerts derived from planned requirement, available stock and incoming supply.... |
| PRC-027 | Wastage control | Track excess material consumption/wastage against approved norms or BOQ quantity.... | Must | Excess consumption/wastage tracked against approved norms or BOQ quantity.... |
| PRC-028 | Inventory visibility | Provide site-wise and project-wise inventory visibility.... | Must | Stock visible by site and by project.... |
| PRC-029 | Procurement planning | Provide material availability against the next execution plan and generate procurement/indent requirement.... | Must | Material availability vs next execution plan generates procurement/indent requirement.... |
| PRC-030 | Inventory ageing | Provide inventory ageing, slow-moving and non-moving material reports.... | Should | Inventory ageing, slow-moving and non-moving material reports available.... |
| PRC-031 | Subcontractor material issue | Material Issue to Subcontractor vs Consumption vs Stock Control – Track material issued to each subcontractor against pr... | Must | Material issued to each subcontractor tracked by project, site, WO, BOQ/activity and material.... |
| PRC-032 | Subcontractor reconciliation | Subcontractor Material Reconciliation – Track material issued to subcontractor vs material consumed vs balance material ... | Must | Material issued vs consumed vs balance lying with each subcontractor tracked.... |
| PRC-033 | Subcontractor material ageing | Subcontractor Material Ageing – Maintain ageing of material lying with each subcontractor from the date of issue.... | Must | Ageing maintained for material lying with each subcontractor from the issue date.... |
| PRC-034 | Excess material alert | Excess/Unconsumed Material Alert – Compare material issued to subcontractor against certified/executed consumption.... | Must | Material issued to subcontractor compared to certified/executed consumption; excess alerted.... |
| PRC-035 | Material return | Material Return from Subcontractor – Record unused/excess material returned to project/site store.... | Must | Unused/excess material returned to the project/site store recorded; stock updated.... |
| PRC-036 | Subcontractor material statement | Subcontractor-wise Material Statement – Provide material issued, consumed, returned and balance for each subcontractor.... | Must | Per-subcontractor statement of material issued, consumed, returned and balance produced.... |

## 4.4 Budget Control, Approvals & Alerts (24 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| BUD-001 | Baseline | Maintain an approved budget baseline at project and site level.... | Must | Baseline stored and locked once approved.... |
| BUD-002 | Cost heads | Break the budget by cost head (material, labour, subcontract, overhead).... | Must | Budget and actuals visible per cost head.... |
| BUD-003 | Tracking | Track committed and actual spend against budget in real time.... | Must | Committed + actual vs budget updates live.... |
| BUD-004 | Workflow | Provide configurable approval workflows with multiple levels and value-based routing (e.g. Site Engineer to PM to Financ... | Must | Routing configurable by value and role.... |
| BUD-005 | Delegation | Support delegation of approval authority and escalation on delay.... | Must | Delegate/escalation rules configurable and effective.... |
| BUD-006 | Blocking trigger | Block a transaction and route it for approval when a defined threshold is breached (not merely warn).... | Must | Transaction cannot proceed until approved.... |
| BUD-007 | Configurable thresholds | Thresholds must be configurable (absolute value and/or percentage) per project, site and cost head.... | Must | Thresholds set at each level and enforced.... |
| BUD-008 | Alerts | Send real-time alerts (in-app, email, mobile/WhatsApp) when a budget or price threshold is approached or breached.... | Must | Alerts delivered to the relevant role.... |
| BUD-009 | Audit trail | Maintain a full audit trail of budget revisions and approvals (requester, original vs revised, justification, approver, ... | Must | Complete, tamper-evident history retained.... |
| BUD-010 | Scenario A | Budget increase: a revision to a project/site budget takes effect only after the designated authority approves it.... | Must | Increase not applied until approved.... |
| BUD-011 | Scenario B | Procurement cost increase: if a rate rises above the estimated/previous price beyond the threshold, or spend would excee... | Must | Order blocked and routed on breach.... |
| BUD-012 | Approvals dashboard | Provide a pending-approvals dashboard per user with approval history.... | Should | Each approver sees their queue and history.... |
| BUD-013 | Budget hierarchy | Maintain budget at Project - Site - WBS - BOQ - Cost Head level.... | Must | Budget maintained at project, site, WBS, BOQ and cost-head levels.... |
| BUD-014 | Cost control | Track Budget - Commitment - Actual - Forecast - Cost to Complete - Variance in real time.... | Must | Budget, commitment, actual, forecast, cost-to-complete and variance tracked in real time.... |
| BUD-015 | WO budget control | Block and route for approval when WO value exceeds approved budget.... | Must | WO value exceeding approved budget is blocked and routed for approval.... |
| BUD-016 | Committed-cost control | Block and route for approval when supplier/subcontractor committed cost exceeds budget.... | Must | Supplier/subcontractor committed cost exceeding budget is blocked and routed.... |
| BUD-017 | Quantity budgeting | Track budgeted quantity × budgeted rate = budgeted amount for controlled BOQ/cost items.... | Must | Budgeted qty x budgeted rate = budgeted amount tracked for controlled items.... |
| BUD-018 | Budget vs commitment | Compare budgeted cost vs PO/WO cost by project, WBS, BOQ, supplier and subcontractor.... | Must | Budgeted cost vs PO/WO cost compared by project, WBS, BOQ, supplier and subcontractor.... |
| BUD-019 | Forecast control | Alert and route for approval when Forecast Cost > Approved Budget.... | Must | Forecast cost greater than approved budget triggers alert and approval.... |
| BUD-020 | Variance | Provide budget variance by amount and percentage.... | Must | Budget variance shown by amount and percentage.... |
| BUD-021 | Revision history | Maintain full history of Original Budget - Approved Revision - Current Budget.... | Must | Full history of original budget, approved revision and current budget retained.... |
| BUD-022 | Baseline lock | Prevent direct modification of approved budget baseline; revisions require approval.... | Must | Approved budget baseline cannot be modified directly; revisions require approval.... |
| BUD-023 | Hard-stop controls | Provide configurable hard-stop controls for quantity/value threshold breaches.... | Must | Configurable hard-stop controls enforced on quantity/value threshold breaches.... |
| BUD-024 | Audit trail | Maintain transaction-level audit trail including delay analysis/reason for variance.... | Must | Transaction-level audit trail retained, including delay analysis / reason for variance.... |

## 4.5 Subcontractor Management (16 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| SUB-001 | Master | Maintain a subcontractor master with compliance documents (licences, insurance, statutory).... | Must | Subcontractor created with document attachments.... |
| SUB-002 | Compliance alerts | Raise compliance-document expiry alerts.... | Must | Alert before/at expiry of stored documents.... |
| SUB-003 | Work orders | Maintain a subcontract / work-order register with scope, rates and value.... | Must | Work orders created and tracked.... |
| SUB-004 | RA billing | Support progress-based billing / running-account (RA) bills.... | Must | RA bill computed from progress; sequential.... |
| SUB-005 | Retention | Track retention (percentage, amount held, amount released).... | Must | Retention held and release tracked per bill.... |
| SUB-006 | Rating | Record subcontractor performance rating.... | Should | Ratings stored and reportable.... |
| SUB-007 | Cost link | Link subcontract cost to project cost and budget.... | Must | Subcontract cost posts to project ledger/budget.... |
| SUB-008 | Bill approval | Route subcontractor bills through multi-level approval.... | Must | Bills approved per workflow before payment.... |
| SUB-009 | Quantity tracking | Track BOQ Qty - WO Qty - Executed Qty - Certified Qty - Billed Qty - Paid Qty - Balance Qty.... | Must | BOQ to WO to Executed to Certified to Billed to Paid to Balance quantity tracked.... |
| SUB-010 | WO quantity control | Block subcontractor WO quantity when WO Qty > available BOQ Qty, subject to approval.... | Must | Subcontractor WO qty exceeding available BOQ qty is blocked, subject to approval.... |
| SUB-011 | Execution control | Block subcontractor execution/billing when Executed/Certified Qty > WO Qty, subject to configured control.... | Must | Executed/certified qty exceeding WO qty is blocked, subject to configured control.... |
| SUB-012 | Subcontractor vs BOQ | Track subcontractor-wise quantity and value against project BOQ.... | Must | Subcontractor-wise quantity and value tracked against project BOQ.... |
| SUB-013 | Rate control | Compare WO rate/value against budgeted rate/value and alert/block when exceeded.... | Must | WO rate/value compared against budgeted rate/value; breach alerted/blocked.... |
| SUB-014 | Productivity | Track subcontractor planned vs actual execution and productivity.... | Must | Subcontractor planned vs actual execution and productivity tracked.... |
| SUB-015 | Performance | Track subcontractor performance including quality, schedule, quantity, cost and compliance.... | Must | Subcontractor performance tracked on quality, schedule, quantity, cost and compliance.... |
| SUB-016 | Compliance alerts | Provide subcontractor compliance expiry alerts for insurance, licences, statutory documents and other mandatory document... | Must | Expiry alerts for insurance, licences, statutory and other mandatory documents.... |

## 4.6 Finance & Accounts (30 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| FIN-001 | GL | Provide a general ledger with a configurable chart of accounts.... | Must | COA configurable; entries post to GL.... |
| FIN-002 | AP | Manage accounts payable (vendor bills and payments).... | Must | Vendor bills booked and paid; balances tracked.... |
| FIN-003 | AR | Manage accounts receivable (client invoices and collections).... | Must | Invoices raised; receipts applied.... |
| FIN-004 | Bank | Provide bank & cash management with bank reconciliation.... | Must | Bank statements reconciled to ledger.... |
| FIN-005 | Milestone invoicing | Raise client invoices linked to milestones / RA bills.... | Must | Invoice generated from milestone/RA data.... |
| FIN-006 | Collections | Track collections and receivables ageing.... | Must | Ageing report by customer/invoice.... |
| FIN-007 | Project P&L | Provide project-wise profitability, cost ledgers and P&L.... | Must | P&L viewable per project.... |
| FIN-008 | Cash flow | Provide cash-flow tracking and forecasting.... | Should | Forecast built from receivables/payables.... |
| FIN-009 | GST | Compute GST (CGST/SGST/IGST) on transactions.... | Must | Correct GST applied and reportable.... |
| FIN-010 | e-Invoice | Generate GST e-invoices (IRN / QR).... | Must | Valid IRN/QR produced (live or via IRP).... |
| FIN-011 | e-Way bill | Generate e-way bills.... | Must | e-way bill generated with required fields.... |
| FIN-012 | TDS | Compute and deduct TDS (Sections 194C / 194J / 194I and others).... | Must | TDS auto-computed on applicable payments.... |
| FIN-013 | Statutory reports | Produce statutory reports/data for GST and TDS filing.... | Must | Return-ready data exportable.... |
| FIN-014 | Migration | Migrate opening balances and masters from the existing tool (e.g. Tally).... | Must | Balances/masters imported and reconciled.... |
| FIN-015 | Period close | Provide financial period close controls and back-dated-entry control.... | Must | Closed periods locked; back-dating restricted.... |
| FIN-016 | Multi-entity | Support multiple companies / entities if required.... | Could | Separate books per entity, consolidatable.... |
| FIN-017 | Execution vs billing | Provide execution vs billing vs collection monitoring at project/site level.... | Must | Execution vs billing vs collection monitored at project/site level.... |
| FIN-018 | Billing-lag alert | Alert when billing/certification falls behind physical execution beyond configured threshold.... | Must | Alert when billing/certification falls behind physical execution beyond the configured threshold.... |
| FIN-019 | Collection escalation | Provide collection overdue escalation based on invoice due date and ageing.... | Must | Overdue collections escalated based on invoice due date and ageing.... |
| FIN-020 | Cash-flow forecast | Provide monthly project cash-flow forecast vs actual.... | Must | Monthly project cash-flow forecast vs actual provided.... |
| FIN-021 | Cash requirement | Track project cash requirement based on planned execution, procurement, subcontract and expected collections.... | Must | Project cash requirement derived from planned execution, procurement, subcontract and expected colle... |
| FIN-022 | Financial securities | Track advance, retention, PBG and other financial securities project-wise.... | Must | Advance, retention, PBG and other financial securities tracked project-wise.... |
| FIN-023 | Margin forecast | Provide forecast revenue, forecast cost and forecast project margin.... | Must | Forecast revenue, forecast cost and forecast project margin provided.... |
| FIN-024 | Margin alert | Alert management when project margin falls below configured threshold.... | Must | Alert raised when project margin falls below the configured threshold.... |
| FIN-025 | Negative-margin alert | Alert management on negative forecast project margin.... | Must | Alert raised on negative forecast project margin.... |
| FIN-026 | Receivable ageing | Provide receivable ageing and collection action tracking.... | Must | Receivable ageing and collection action tracked.... |
| FIN-027 | Guarantee register | Maintain project-wise BG/PBG/Advance Guarantee/Insurance register.... | Must | Project-wise BG / PBG / advance-guarantee / insurance register maintained.... |
| FIN-028 | Guarantee details | Track issue date, expiry date, amount, beneficiary, issuing bank/insurer and status.... | Must | Issue date, expiry date, amount, beneficiary, issuing bank/insurer and status tracked.... |
| FIN-029 | Expiry alerts | Generate configurable alerts before BG/PBG/Insurance expiry.... | Must | Configurable alerts generated before BG/PBG/insurance expiry.... |
| FIN-030 | Renewal tracking | Track renewal/release status and responsible person.... | Must | Renewal/release status and responsible person tracked.... |

## 4.7 HR & Workforce Management (17 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| HR-001 | Employee master | Maintain an employee master with documents and organisation structure.... | Must | Employees created with docs and reporting lines.... |
| HR-002 | Attendance | Capture site-wise attendance (mobile / geo-tagged / biometric integration).... | Must | Attendance captured per site and employee.... |
| HR-003 | Timesheet | Record timesheets by project and activity for costing.... | Must | Hours booked to project/activity; feed to cost.... |
| HR-004 | Payroll | Run payroll with Indian statutory deductions (EPF, ESI, PT, TDS).... | Must | Payroll computed with correct statutory amounts.... |
| HR-005 | Payslip | Generate payslips.... | Must | Payslip produced per employee per period.... |
| HR-006 | Leave | Manage leave (types, balances, approvals).... | Must | Leave applied, approved and balance updated.... |
| HR-007 | Skills register | Maintain a skills / trade register.... | Should | Skills recorded and searchable.... |
| HR-008 | Contract labour | Handle contract / daily-wage labour distinctly from payroll staff, including wage computation.... | Must | Daily-wage workforce managed separately.... |
| HR-009 | Travel | Provide a travel request and approval workflow.... | Should | Travel requested and approved in-system.... |
| HR-010 | Expense claims | Support expense claims and reimbursement processing.... | Must | Claims submitted, approved and reimbursed.... |
| HR-011 | Performance | Support performance management (goals, appraisals, reviews).... | Should | Appraisal cycle run in-system.... |
| HR-012 | Directory | Provide a searchable people / employee directory.... | Should | Directory searchable by name/role/site.... |
| HR-013 | Statutory registers | Produce statutory registers/reports (EPF, ESI, PT).... | Must | Register outputs generated for filing.... |
| HR-014 | Cost mapping | Map employee cost to cost centre / profit centre / WBS for project costing.... | Should | Employee cost mapped to cost centre / profit centre / WBS.... |
| HR-015 | Manpower planning | Allow annual and project-wise manpower planning.... | Should | Annual and project-wise manpower planning supported.... |
| HR-016 | Recruitment | Provide a complete recruitment workflow from requisition to offer/onboarding.... | Should | Recruitment managed end to end (requisition to offer).... |
| HR-017 | Onboarding | Provide a joining/onboarding checklist that tracks to 100% completion status.... | Should | Joining checklist tracked and shown at 100% completion status.... |

## 4.8 Field Data Entry (Mobile, Real-Time) (10 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| FLD-001 | Responsive | Provide a mobile-friendly / responsive interface usable on low-cost devices.... | Must | Usable on common low-end Android devices.... |
| FLD-002 | Connectivity | Function on intermittent connectivity; offline capture with later sync (desirable).... | Should | Entry possible on weak/no signal; syncs later.... |
| FLD-003 | Daily report | Capture a daily site report: manpower deployed, work executed, material consumed, weather, equipment and any hindrances ... | Must | All fields captured from a single mobile form.... |
| FLD-004 | Photo capture | Capture photos / documents with geo-tag and timestamp.... | Must | Image stored with location and time.... |
| FLD-005 | Incident report | Allow safety / incident reporting from the field.... | Must | Incident logged from mobile.... |
| FLD-006 | Role access | Restrict field users to their own site and permitted forms.... | Must | User sees only assigned site/forms.... |
| FLD-007 | Cross-module update | Field entries automatically update project progress, inventory consumption, HR attendance, cost ledgers and QHSE records... | Must | One entry updates all linked modules.... |
| FLD-008 | Offline queue | Queue offline entries and handle conflicts on sync.... | Should | Queued entries sync without data loss.... |
| FLD-009 | Multi-language | Support multiple languages for site staff (desirable).... | Could | UI available in required languages.... |
| FLD-010 | Guided forms | Provide guided, minimal-entry forms for supervisors.... | Should | Forms short with minimal mandatory fields.... |

## 4.9 QHSE (Quality, Health, Safety & Environment) (7 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| QHS-001 | Inspections | Provide inspection checklists and quality records.... | Must | Checklists completed and stored.... |
| QHS-002 | NCR | Maintain an NCR register with a closure workflow.... | Must | NCR raised, actioned and closed with trail.... |
| QHS-003 | Incident | Support incident / near-miss reporting and investigation tracking.... | Must | Incident logged and investigation tracked.... |
| QHS-004 | Toolbox talk | Record toolbox talk records.... | Should | Talks logged with attendees/date.... |
| QHS-005 | Safety observation | Record safety-observation records.... | Should | Observations captured and reportable.... |
| QHS-006 | Dashboard | Provide QHSE dashboards (days without LTI, open NCRs, inspections done).... | Should | Live QHSE metrics displayed.... |
| QHS-007 | Linkage | Link QHSE records to project / site.... | Must | Records tagged to project/site.... |

## 5 & 6. Technical, Security & Non-Functional (15 requirements)

| Req ID | Category | Requirement | Priority | Acceptance Criteria |
|--------|----------|-------------|----------|---------------------|
| TEC-001 | Cloud | Provide a cloud-based solution accessible via web browser and mobile.... | Must | Accessible on web and mobile without local install.... |
| TEC-002 | Mobile app | Provide responsive mobile access or a native app for field entry.... | Must | Field functions usable on mobile.... |
| TEC-003 | RBAC | Provide role-based access control and configurable approval workflows.... | Must | Permissions configurable per role.... |
| TEC-004 | APIs | Provide open, documented APIs / integration capability (payment gateway, banking, biometric, WhatsApp/SMS/email).... | Must | Documented API; sample integrations demonstrable.... |
| TEC-005 | Data residency | Host data (and backups) in India, in line with prevailing data-protection regulations.... | Must | India region confirmed for data and backups.... |
| TEC-006 | Low-code | Be configurable without heavy custom coding wherever possible; low-code extensibility preferred.... | Should | Common changes done by configuration.... |
| TEC-007 | Encryption | Encrypt data in transit and at rest (database and file storage).... | Must | TLS in transit; encryption at rest incl. files.... |
| TEC-008 | MFA | Provide multi-factor authentication, enforceable for privileged roles.... | Must | MFA available and enforceable for finance/admin.... |
| TEC-009 | Audit logs | Maintain audit trails on financial and approval actions.... | Must | Immutable logs on key actions.... |
| TEC-010 | Backup/DR | Provide data backup and disaster-recovery provisions with a tested restore.... | Must | Backups scheduled; restore SLA stated and tested.... |
| TEC-011 | Availability | Meet a target uptime of 99.5% or better with defined maintenance windows.... | Must | Uptime SLA committed.... |
| TEC-012 | Storage | State included cloud-storage capacity, additional-storage cost/slab, scalability and retention.... | Must | Storage capacity and overage rate stated.... |
| TEC-013 | Scalability | Scale to support growth in users, projects and transaction volume to the target turnover without re-platforming.... | Must | No re-platforming needed to reach target scale.... |
| TEC-014 | Breach notice | Notify GESPL of a security incident/breach within a defined window.... | Must | Notification window committed in contract.... |
| TEC-015 | Data ownership | Ensure GESPL owns all data with export and secure deletion on exit.... | Must | Data export any time; deletion on exit confirmed.... |

