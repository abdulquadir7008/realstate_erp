import json
import re

with open('docs/client-requirements/requirements.json', 'r', encoding='utf-8') as f:
    requirements = json.load(f)

# Analyze each requirement against the codebase
# This is a heuristic analysis based on model names, module names, and known features

def classify_requirement(req):
    """Classify a requirement based on codebase evidence"""
    req_id = req['req_id']
    module = req['module']
    category = req['category']
    requirement = req['requirement'].lower()
    
    # Known implemented modules/models
    implemented_models = {
        'tender': [],
        'project': ['Project', 'ProjectMilestone', 'Building', 'Floor', 'Unit'],
        'wbs': [],
        'boq': [],
        'budget': ['Project.totalBudget'],
        'approval': [],
        'procurement': ['Vendor', 'Material', 'MaterialCategory', 'Warehouse', 'MaterialStock', 'StockMovement', 
                       'PurchaseRequisition', 'PurchaseRequisitionItem', 'PurchaseOrder', 'PurchaseOrderItem',
                       'GoodsReceivedNote', 'GrnItem'],
        'subcontractor': [],
        'finance': ['Account', 'Expense', 'ExpenseCategory', 'Invoice', 'LedgerEntry', 'Payment', 
                   'PaymentAllocation', 'Receipt', 'Refund', 'TaxRate', 'FinancialYear'],
        'hr': ['Employee', 'Attendance', 'LeaveRequest'],
        'document': ['Document', 'DocumentVersion'],
        'construction': ['ConstructionTask', 'DailySiteReport', 'QualityInspection'],
        'qhse': ['QualityInspection'],
        'mobile': [],
        'report': [],
        'workflow': ['WorkflowDefinition', 'WorkflowExecution'],
        'notification': ['Notification'],
        'audit': ['AuditLog'],  # unused
        'gst': [],
        'tds': [],
        'tally': [],
        'bank_guarantee': [],
        'insurance': [],
        'payroll': [],
        'timesheet': [],
        'contract_labour': [],
        'recruitment': [],
        'offline': [],
        'geo': [],
        'incident': [],
        'ncr': [],
        'toolbox': [],
        'safety_observation': [],
        'transmittal': [],
        'rfi': [],
        'deliverable': [],
        'technical_approval': [],
    }
    
    # Check if requirement maps to existing implementation
    missing_keywords = []
    partial_keywords = []
    
    # Tendering
    if module == '4.1 Tendering & Estimation':
        return 'Missing'
    
    # Project Implementation
    if module == '4.2 Project Implementation & Monitoring':
        if 'baseline' in requirement or 'revised plan' in requirement or 'wbs' in requirement or 'boq' in requirement:
            return 'Missing'
        if 'execution quantit' in requirement or 'planned vs actual' in requirement:
            return 'Missing'
        if 'milestone' in requirement and 'delay' in requirement:
            return 'Partial'  # Milestones exist but no delay register
        if 'escalation' in requirement or 'recovery' in requirement:
            return 'Missing'
        if 'execution vs billing' in requirement:
            return 'Missing'
        if 'risk' in requirement or 'issue' in requirement or 'rag' in requirement:
            return 'Missing'
        if 'productivity' in requirement or 'equipment' in requirement:
            return 'Missing'
        if 'mom' in requirement or 'action item' in requirement or 'correspondence' in requirement:
            return 'Missing'
        return 'Partial'  # Tasks and site reports exist
    
    # Procurement
    if module == '4.3 Procurement & Inventory':
        if 'indent' in requirement or 'purchase requisition' in requirement:
            return 'Implemented'  # Basic CRUD
        if 'vendor master' in requirement:
            return 'Implemented'
        if 'rfq' in requirement or 'comparative statement' in requirement:
            return 'Missing'
        if 'vendor evaluation' in requirement or 'vendor rating' in requirement:
            return 'Partial'  # Vendor has rating field but no evaluation workflow
        if 'multi-level po approval' in requirement:
            return 'Partial'  # PO status workflow but no configurable approval
        if 'budget' in requirement and 'rate' in requirement and 'boq' in requirement:
            return 'Missing'  # No budget/rate/BOQ checks on PO
        if 'grn' in requirement and ('quality' in requirement or 'quantity check' in requirement):
            return 'Partial'  # GRN has qtyAccepted/qtyRejected
        if 'three-way match' in requirement or '3-way' in requirement or 'po-grn-invoice' in requirement:
            return 'Missing'
        if 'multi-store' in requirement or 'site stock' in requirement or 'valuation' in requirement:
            return 'Partial'  # Warehouse + stock exist but no valuation methods
        if 'reorder' in requirement:
            return 'Partial'  # Material has reorderLevel but no alerts
        if 'material issue' in requirement or 'consumption' in requirement:
            return 'Partial'  # StockMovement OUT exists
        if 'reverse auction' in requirement:
            return 'Missing'
        if 'price history' in requirement:
            return 'Missing'
        if 'stock transfer' in requirement:
            return 'Partial'  # TRANSFER_IN/OUT movement types exist
        if 'return' in requirement or 'debit note' in requirement:
            return 'Missing'
        if 'reconciliation' in requirement:
            return 'Missing'
        if 'supplier commitment' in requirement:
            return 'Missing'
        if 'aggregate boq' in requirement:
            return 'Missing'
        if 'shortage' in requirement or 'wastage' in requirement:
            return 'Missing'
        if 'subcontractor material' in requirement:
            return 'Missing'
        return 'Partial'
    
    # Budget Control
    if module == '4.4 Budget Control, Approvals & Alerts':
        if 'baseline' in requirement:
            return 'Missing'
        if 'committed' in requirement or 'actual' in requirement or 'forecast' in requirement or 'cost-to-complete' in requirement or 'variance' in requirement:
            return 'Missing'
        if 'multi-level approval' in requirement:
            return 'Missing'  # Generic workflow only
        if 'delegation' in requirement or 'escalation' in requirement:
            return 'Missing'
        if 'hard stop' in requirement or 'pre-transaction' in requirement:
            return 'Missing'
        if 'threshold' in requirement:
            return 'Missing'
        if 'notification' in requirement:
            return 'Partial'  # Notifications exist but not approval-specific
        if 'audit trail' in requirement:
            return 'Missing'  # AuditLog model unused
        if 'revision' in requirement or 'immutable baseline' in requirement:
            return 'Missing'
        if 'quantity' in requirement and 'rate' in requirement and 'budget' in requirement:
            return 'Missing'
        if 'po/wo commitment' in requirement or 'overrun' in requirement:
            return 'Missing'
        return 'Missing'
    
    # Subcontractor
    if module == '4.5 Subcontractor Management':
        if 'subcontractor master' in requirement or 'compliance expiry' in requirement:
            return 'Partial'  # Vendor category=SUBCONTRACTOR but no compliance tracking
        if 'work order' in requirement:
            return 'Missing'
        if 'ra bill' in requirement or 'running account' in requirement:
            return 'Missing'
        if 'retention' in requirement:
            return 'Missing'
        if 'rating' in requirement or 'performance' in requirement or 'scorecard' in requirement:
            return 'Partial'  # Vendor has rating field
        if 'project/budget link' in requirement:
            return 'Missing'
        if 'multi-level bill approval' in requirement:
            return 'Missing'
        if 'boq/wo/executed/certified/billed/paid/balance' in requirement:
            return 'Missing'
        if 'quantity/rate blocking' in requirement:
            return 'Missing'
        return 'Missing'
    
    # Finance
    if module == '4.6 Finance & Accounts':
        if 'gl' in requirement or 'chart of account' in requirement:
            return 'Partial'  # Account model but flat, not hierarchical
        if 'ap/ar' in requirement or 'ageing' in requirement:
            return 'Partial'  # Payments/Receipts exist but no aging reports
        if 'bank reconciliation' in requirement or 'cash reconciliation' in requirement:
            return 'Missing'
        if 'milestone' in requirement and 'ra invoic' in requirement:
            return 'Partial'  # Invoice with milestones but no RA bill invoicing
        if 'project p&l' in requirement or 'cost ledger' in requirement:
            return 'Missing'  # LedgerEntry exists but not project P&L
        if 'cash flow forecast' in requirement:
            return 'Missing'
        if 'gst' in requirement or 'e-invoice' in requirement or 'irn' in requirement or 'qr' in requirement or 'e-way bill' in requirement:
            return 'Missing'
        if 'tds' in requirement:
            return 'Missing'
        if 'statutory report' in requirement:
            return 'Missing'
        if 'tally' in requirement:
            return 'Missing'
        if 'period close' in requirement or 'backdating' in requirement:
            return 'Missing'  # FinancialYear exists but no period close
        if 'multi-entity' in requirement:
            return 'Partial'  # Multiple orgs but no consolidated reporting
        if 'execution-billing-collection' in requirement or 'lag' in requirement or 'escalation alert' in requirement:
            return 'Missing'
        if 'cash requirement' in requirement:
            return 'Missing'
        if 'financial securit' in requirement or 'bank guarantee' in requirement or 'pbg' in requirement or 'insurance register' in requirement:
            return 'Missing'
        if 'expiry' in requirement and 'renewal' in requirement and 'margin' in requirement:
            return 'Missing'
        return 'Partial'
    
    # HR
    if module == '4.7 HR & Workforce Management':
        if 'employee master' in requirement:
            return 'Implemented'
        if 'attendance' in requirement and ('geo' in requirement or 'biometric' in requirement):
            return 'Partial'  # Attendance model but no geo/biometric
        if 'timesheet' in requirement:
            return 'Missing'
        if 'payroll' in requirement or 'statutory deduction' in requirement or 'payslip' in requirement:
            return 'Missing'
        if 'leave' in requirement:
            return 'Implemented'  # Basic leave requests
        if 'skill' in requirement:
            return 'Missing'
        if 'contract labour' in requirement or 'wage' in requirement:
            return 'Missing'
        if 'travel' in requirement or 'reimbursement' in requirement:
            return 'Missing'  # Expenses exist but not travel-specific
        if 'appraisal' in requirement:
            return 'Missing'
        if 'directory' in requirement:
            return 'Partial'  # Users + Employees but no org chart
        if 'statutory register' in requirement:
            return 'Missing'
        if 'cost centre' in requirement or 'wbs mapping' in requirement:
            return 'Missing'
        if 'manpower planning' in requirement:
            return 'Missing'
        if 'recruitment' in requirement or 'onboarding' in requirement:
            return 'Missing'
        return 'Partial'
    
    # Field/Mobile
    if module == '4.8 Field Data Entry (Mobile, Real-Time)':
        if 'offline' in requirement or 'sync' in requirement:
            return 'Missing'
        if 'daily report' in requirement:
            return 'Partial'  # DailySiteReport exists but missing many fields
        if 'geo-tagged' in requirement or 'time-stamped photo' in requirement:
            return 'Missing'  # Document metadata only, no binary upload
        if 'incident' in requirement:
            return 'Missing'
        if 'site-scoped access' in requirement:
            return 'Missing'  # Tenant scoping only
        if 'cross-module' in requirement:
            return 'Missing'
        if 'guided' in requirement or 'low-entry' in requirement:
            return 'Missing'
        if 'multilingual' in requirement:
            return 'Missing'
        return 'Partial'
    
    # QHSE
    if module == '4.9 QHSE (Quality, Health, Safety & Environment)':
        if 'inspection' in requirement or 'checklist' in requirement:
            return 'Implemented'  # QualityInspection exists
        if 'ncr' in requirement or 'non-conformance' in requirement:
            return 'Missing'
        if 'incident' in requirement or 'near miss' in requirement or 'investigation' in requirement:
            return 'Missing'
        if 'toolbox talk' in requirement:
            return 'Missing'
        if 'safety observation' in requirement:
            return 'Missing'
        if 'lti' in requirement or 'dashboard' in requirement:
            return 'Missing'
        return 'Partial'
    
    # Document Control
    if module == '4.10 Document Control':
        if 'versioned' in requirement or 'register' in requirement:
            return 'Partial'  # Document + DocumentVersion but metadata only
        if 'transmittal' in requirement:
            return 'Missing'
        if 'rfi' in requirement:
            return 'Missing'
        if 'approval workflow' in requirement:
            return 'Missing'
        if 'project/role access' in requirement:
            return 'Partial'  # Visibility INTERNAL/CUSTOMER only
        if 'search' in requirement or 'audit' in requirement:
            return 'Missing'
        if 'planned/received/approved deliverable' in requirement:
            return 'Missing'
        if 'gtp' in requirement or 'technical approval' in requirement or 'ageing' in requirement or 'delay alert' in requirement:
            return 'Missing'
        return 'Partial'
    
    # Reports
    if module == '4.11 Reports, Dashboards & Analytics':
        if 'role-based dashboard' in requirement:
            return 'Partial'  # Reports module but hardcoded KPIs
        if 'operational' in requirement or 'statutory report' in requirement:
            return 'Missing'
        if 'excel' in requirement or 'pdf export' in requirement:
            return 'Partial'  # PDF for invoices only
        if 'configurable report builder' in requirement:
            return 'Missing'
        if 'earned value' in requirement or 'evm' in requirement:
            return 'Missing'
        if 'utilization' in requirement:
            return 'Missing'
        if 'cash' in requirement or 'profitability' in requirement:
            return 'Missing'
        if 'drill-down' in requirement:
            return 'Missing'
        if 'budget/commitment/actual/forecast' in requirement:
            return 'Missing'
        if 'boq/po/wo/grn/consumption/execution' in requirement:
            return 'Missing'
        if 'supplier/subcontractor control' in requirement:
            return 'Missing'
        if 'plan vs actual' in requirement or 'baseline vs revised' in requirement:
            return 'Missing'
        if 'execution vs billing vs collection' in requirement:
            return 'Missing'
        if 'cash flow' in requirement:
            return 'Missing'
        if 'margin' in requirement:
            return 'Missing'
        if 'risk rag' in requirement:
            return 'Missing'
        if 'delay/recovery' in requirement:
            return 'Missing'
        if 'guarantee expiry' in requirement:
            return 'Missing'
        return 'Missing'
    
    # Technical/Security
    if module == '5 & 6. Technical, Security & Non-Functional':
        if 'cloud web/mobile access' in requirement:
            return 'Implemented'  # Docker, Render, Vercel
        if 'api/integration' in requirement:
            return 'Partial'  # REST API exists
        if 'india data residency' in requirement or 'backup' in requirement:
            return 'Config-only'  # Config exists but no DR test evidence
        if 'configurable workflow' in requirement:
            return 'Partial'  # Workflow engine but actions SIMULATED
        if 'encryption' in requirement:
            return 'Partial'  # HTTPS, bcrypt but no field-level
        if 'mfa' in requirement or 'multi-factor' in requirement:
            return 'Missing'  # User.mfaEnabled unused
        if 'audit log' in requirement:
            return 'Missing'  # Model unused
        if 'backup/restore' in requirement or 'dr' in requirement or 'disaster recovery' in requirement:
            return 'Missing'
        if 'uptime' in requirement or '99.5' in requirement:
            return 'Operational'  # Requires monitoring/SLA
        if 'storage capacity' in requirement or 'pricing' in requirement or 'retention' in requirement:
            return 'Config-only'  # Env vars only
        if 'scale' in requirement:
            return 'Partial'  # Stateless API but no load test
        if 'breach notification' in requirement:
            return 'Missing'
        if 'customer data ownership' in requirement or 'export' in requirement or 'deletion' in requirement:
            return 'Missing'
        return 'Partial'
    
    return 'Unknown'

# Classify all requirements
for req in requirements:
    req['status'] = classify_requirement(req)

# Save enhanced JSON
with open('docs/client-requirements/requirements-with-status.json', 'w', encoding='utf-8') as f:
    json.dump(requirements, f, indent=2, ensure_ascii=False)

# Generate detailed markdown matrix
with open('docs/client-requirements/requirements-matrix-detailed.md', 'w', encoding='utf-8') as f:
    f.write("# GESPL Requirements Matrix — Detailed Status\n\n")
    f.write(f"Total requirements: {len(requirements)}\n\n")
    f.write("## Status Legend\n")
    f.write("- **Implemented** — Feature exists and works end-to-end (cite file paths)\n")
    f.write("- **Partially Implemented** — Core models/CRUD exist but missing key sub-features or workflows\n")
    f.write("- **Missing** — No implementation found\n")
    f.write("- **Config-only** — Env/config slots exist but no backing code\n")
    f.write("- **Operational** — Requires deployment/process evidence, not code alone\n\n")
    
    # Group by module
    modules = {}
    for r in requirements:
        m = r['module']
        if m not in modules:
            modules[m] = []
        modules[m].append(r)
    
    for m, reqs in sorted(modules.items()):
        f.write(f"\n## {m} ({len(reqs)} requirements)\n\n")
        f.write("| Req ID | Category | Requirement | Priority | Status | Evidence |\n")
        f.write("|--------|----------|-------------|----------|--------|----------|\n")
        for r in reqs:
            status = r.get('status', 'TBD')
            status_md = f"**{status}**"
            evidence = ""
            if status == 'Implemented':
                evidence = "✅ Core models + CRUD + API + UI"
            elif status == 'Partially Implemented':
                evidence = "⚠️ Models/CRUD exist; missing workflows/integrations"
            elif status == 'Missing':
                evidence = "❌ No implementation found"
            elif status == 'Config-only':
                evidence = "⚙️ Env vars/config only"
            elif status == 'Operational':
                evidence = "☁️ Deployment/process evidence needed"
            
            req_text = r['requirement'][:120] + ('...' if len(r['requirement']) > 120 else '')
            f.write(f"| {r['req_id']} | {r['category']} | {req_text} | {r['priority']} | {status_md} | {evidence} |\n")

print("Saved detailed matrix with status")

# Summary stats
from collections import Counter
status_counts = Counter(r.get('status', 'Unknown') for r in requirements)
print("Status distribution:", dict(status_counts))

# By module
for m, reqs in sorted(modules.items()):
    counts = Counter(r.get('status', 'Unknown') for r in reqs)
    print(f"  {m}: {dict(counts)}")