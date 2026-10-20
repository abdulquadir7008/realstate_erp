export interface Option {
  value: string;
  label: string;
}

export interface Field {
  name: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'currency'
    | 'date'
    | 'datetime'
    | 'select'
    | 'checkbox'
    | 'ref'
    | 'multiselect'
    | 'items'
    | 'password'
    | 'json';
  required?: boolean;
  options?: Option[];
  ref?: string;
  itemFields?: Field[];
  itemLabel?: string;
  defaultValue?: unknown;
  colSpan?: 1 | 2;
  help?: string;
  placeholder?: string;
}

export interface Column {
  key: string;
  label: string;
  kind?: 'text' | 'currency' | 'number' | 'date' | 'badge';
}

export interface ActionDef {
  label: string;
  method?: 'POST' | 'PATCH';
  endpoint: string | ((row: Record<string, any>) => string);
  fields: Field[];
  toBody?: (values: Record<string, any>, row: Record<string, any>) => Record<string, any>;
  confirm?: string;
}

export interface ModuleConfig {
  title: string;
  description: string;
  endpoint: string;
  createEndpoint?: string;
  columns: Column[];
  fields?: Field[];
  editFields?: Field[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canDownloadPdf?: boolean;
  rowActions?: ActionDef[];
  pageActions?: ActionDef[];
  special?: 'reports' | 'organization';
}

const titleCase = (v: string) =>
  v
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const opts = (...values: string[]): Option[] => values.map((v) => ({ value: v, label: titleCase(v) }));

interface RefDef {
  endpoint: string;
  label: (r: any) => string;
  value?: string;
}

export const REFS: Record<string, RefDef> = {
  projects: { endpoint: '/projects', label: (r) => `${r.code} · ${r.name}` },
  buildings: { endpoint: '/inventory/buildings', label: (r) => `${r.code} · ${r.name}` },
  floors: { endpoint: '/inventory/floors', label: (r) => r.label ?? r.name },
  units: { endpoint: '/inventory/units', label: (r) => `${r.unitNumber}${r.type ? ` (${r.type})` : ''}` },
  customers: { endpoint: '/customers', label: (r) => `${r.firstName} ${r.lastName ?? ''}`.trim() },
  leads: { endpoint: '/leads', label: (r) => `${r.name}${r.phone ? ` · ${r.phone}` : ''}` },
  bookings: { endpoint: '/bookings', label: (r) => r.bookingNumber },
  users: { endpoint: '/users', label: (r) => `${r.firstName} ${r.lastName ?? ''}`.trim() },
  employees: { endpoint: '/hr/employees', label: (r) => `${r.firstName} ${r.lastName ?? ''}`.trim() },
  branches: { endpoint: '/organization/branches', label: (r) => `${r.code} · ${r.name}` },
  departments: { endpoint: '/organization/departments', label: (r) => r.name },
  vendors: { endpoint: '/procurement/vendors', label: (r) => r.name },
  materials: { endpoint: '/procurement/materials', label: (r) => `${r.code} · ${r.name}` },
  'material-categories': { endpoint: '/procurement/material-categories', label: (r) => r.name },
  warehouses: { endpoint: '/procurement/warehouses', label: (r) => `${r.code} · ${r.name}` },
  'expense-categories': { endpoint: '/finance/expense-categories', label: (r) => r.name },
  accounts: { endpoint: '/finance/accounts', label: (r) => r.name },
  'payment-plans': { endpoint: '/finance/payment-plans', label: (r) => `${r.name}${r.isDefault ? ' (Default)' : ''}` },
  requisitions: { endpoint: '/procurement/requisitions', label: (r) => r.requisitionNumber ?? r.code ?? r.id },
  'purchase-orders': { endpoint: '/procurement/purchase-orders', label: (r) => r.poNumber },
  demands: { endpoint: '/finance/demands', label: (r) => r.demandNumber },
  roles: { endpoint: '/roles', label: (r) => r.name },
};

const refField = (name: string, label: string, ref: string, required = false): Field => ({
  name,
  label,
  type: 'ref',
  ref,
  required,
});

const projectField = refField('projectId', 'Project', 'projects', true);

export const MODULES: Record<string, ModuleConfig> = {
  // ------------------------------------------------------------ Sales & CRM
  projects: {
    title: 'Projects',
    description: 'Residential, commercial and plotted developments.',
    endpoint: '/projects',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'city', label: 'City' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'totalBudget', label: 'Budget', kind: 'currency' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 2 },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: opts('RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'VILLA', 'APARTMENT', 'MIXED_USE'), defaultValue: 'RESIDENTIAL' },
      { name: 'status', label: 'Status', type: 'select', options: opts('PLANNING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'), defaultValue: 'PLANNING' },
      refField('branchId', 'Branch', 'branches'),
      { name: 'city', label: 'City', type: 'text' },
      { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
      { name: 'totalBudget', label: 'Total Budget', type: 'currency', defaultValue: 0 },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'endDate', label: 'End Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
  },
  buildings: {
    title: 'Buildings',
    description: 'Towers, blocks and sections within projects.',
    endpoint: '/inventory/buildings',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'totalFloors', label: 'Floors', kind: 'number' },
    ],
    fields: [
      projectField,
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: opts('TOWER', 'BLOCK', 'VILLA_ROW', 'PLOT_SECTION', 'STANDALONE'), defaultValue: 'TOWER' },
      { name: 'totalFloors', label: 'Total Floors', type: 'number', defaultValue: 1 },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
    canDelete: true,
  },
  units: {
    title: 'Units',
    description: 'Individual sellable units across buildings and floors.',
    endpoint: '/inventory/units',
    columns: [
      { key: 'unitNumber', label: 'Unit' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'carpetArea', label: 'Carpet Area', kind: 'number' },
      { key: 'basePrice', label: 'Base Price', kind: 'currency' },
    ],
    fields: [
      projectField,
      refField('buildingId', 'Building', 'buildings', true),
      refField('floorId', 'Floor', 'floors', true),
      { name: 'unitNumber', label: 'Unit Number', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: opts('APARTMENT', 'VILLA', 'PLOT', 'SHOP', 'OFFICE', 'LAND', 'PARKING', 'OTHER'), defaultValue: 'APARTMENT' },
      { name: 'configuration', label: 'Configuration', type: 'text' },
      { name: 'carpetArea', label: 'Carpet Area (sqft)', type: 'number' },
      { name: 'builtUpArea', label: 'Built-up Area (sqft)', type: 'number' },
      { name: 'basePrice', label: 'Base Price', type: 'currency', defaultValue: 0 },
      { name: 'pricePerSqft', label: 'Price / sqft', type: 'currency' },
      { name: 'facing', label: 'Facing', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    editFields: [
      { name: 'unitNumber', label: 'Unit Number', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: opts('AVAILABLE', 'ON_HOLD', 'RESERVED', 'BOOKED', 'AGREEMENT_PENDING', 'SOLD', 'CANCELLED', 'BLOCKED') },
      { name: 'carpetArea', label: 'Carpet Area (sqft)', type: 'number' },
      { name: 'basePrice', label: 'Base Price', type: 'currency' },
      { name: 'pricePerSqft', label: 'Price / sqft', type: 'currency' },
      { name: 'facing', label: 'Facing', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canDelete: true,
  },
  customers: {
    title: 'Customers',
    description: 'Buyers and prospects across your organization.',
    endpoint: '/customers',
    columns: [
      { key: 'customerCode', label: 'Code' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'kycStatus', label: 'KYC', kind: 'badge' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: opts('INDIVIDUAL', 'COMPANY', 'NRI'), defaultValue: 'INDIVIDUAL' },
      { name: 'source', label: 'Source', type: 'select', options: opts('WEBSITE', 'REFERRAL', 'WALK_IN', 'CALL', 'IMPORT', 'BROKER', 'PORTAL', 'SOCIAL', 'CAMPAIGN', 'OTHER'), defaultValue: 'OTHER' },
      { name: 'password', label: 'Portal Password', type: 'password', help: 'Generate to enable customer portal login' },
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'altPhone', label: 'Alternate Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'companyName', label: 'Company', type: 'text' },
      { name: 'pan', label: 'PAN', type: 'text' },
      { name: 'gstin', label: 'GSTIN', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
      { name: 'country', label: 'Country', type: 'text', defaultValue: 'India' },
      { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    editFields: [
      { name: 'firstName', label: 'First Name', type: 'text' },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'kycStatus', label: 'KYC Status', type: 'select', options: opts('PENDING', 'VERIFIED', 'REJECTED') },
      { name: 'status', label: 'Status', type: 'select', options: opts('ACTIVE', 'INACTIVE', 'BLACKLISTED') },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
  },
  leads: {
    title: 'Leads',
    description: 'Track and convert sales enquiries.',
    endpoint: '/leads',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'phone', label: 'Phone' },
      { key: 'source', label: 'Source', kind: 'badge' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'budgetMax', label: 'Budget', kind: 'currency' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 2 },
      { name: 'phone', label: 'Phone', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'source', label: 'Source', type: 'select', options: opts('WEBSITE', 'REFERRAL', 'WALK_IN', 'CALL', 'IMPORT', 'BROKER', 'PORTAL', 'SOCIAL', 'CAMPAIGN', 'OTHER'), defaultValue: 'WEBSITE' },
      { name: 'propertyType', label: 'Property Type', type: 'text' },
      { name: 'budgetMin', label: 'Budget Min', type: 'currency' },
      { name: 'budgetMax', label: 'Budget Max', type: 'currency' },
      refField('projectId', 'Interested Project', 'projects'),
      refField('assignedTo', 'Assigned To', 'users'),
      { name: 'nextFollowUpAt', label: 'Next Follow-up', type: 'datetime' },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    editFields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: opts('NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'CONVERTED', 'LOST', 'UNQUALIFIED') },
      refField('assignedTo', 'Assigned To', 'users'),
      { name: 'nextFollowUpAt', label: 'Next Follow-up', type: 'datetime' },
      { name: 'lostReason', label: 'Lost Reason', type: 'text', colSpan: 2 },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
  },
  bookings: {
    title: 'Bookings',
    description: 'Unit bookings and their payment schedules.',
    endpoint: '/bookings',
    columns: [
      { key: 'bookingNumber', label: 'Booking #' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'negotiatedPrice', label: 'Price', kind: 'currency' },
      { key: 'bookingDate', label: 'Date', kind: 'date' },
    ],
    fields: [
      refField('unitId', 'Unit', 'units', true),
      refField('customerId', 'Customer', 'customers', true),
      refField('leadId', 'Lead', 'leads'),
      refField('salesExecutiveId', 'Sales Executive', 'users'),
      refField('paymentPlanId', 'Payment Plan', 'payment-plans'),
      { name: 'negotiatedPrice', label: 'Negotiated Price', type: 'currency', required: true },
      { name: 'basePrice', label: 'Base Price', type: 'currency' },
      { name: 'discountAmount', label: 'Discount', type: 'currency', defaultValue: 0 },
      { name: 'bookingDate', label: 'Booking Date', type: 'date' },
      { name: 'confirm', label: 'Confirm immediately', type: 'checkbox', defaultValue: true },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
    rowActions: [
      {
        label: 'Confirm',
        endpoint: (r) => `/bookings/${r.id}/confirm`,
        fields: [{ name: 'notes', label: 'Notes', type: 'text' }],
        confirm: 'Confirm this booking and generate payment demands?',
      },
      {
        label: 'Cancel',
        endpoint: (r) => `/bookings/${r.id}/cancel`,
        fields: [
          { name: 'reason', label: 'Reason', type: 'text', required: true },
          { name: 'refundPolicy', label: 'Refund Policy', type: 'select', options: opts('FULL', 'PARTIAL', 'NONE'), defaultValue: 'PARTIAL' },
          { name: 'refundAmount', label: 'Refund Amount', type: 'currency' },
        ],
        confirm: 'Cancel this booking?',
      },
      {
        label: 'Record Payment',
        endpoint: (r) => `/finance/payments`,
        method: 'POST',
        fields: [
          { name: 'amount', label: 'Amount', type: 'currency', required: true },
          { name: 'mode', label: 'Mode', type: 'select', options: opts('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'ONLINE', 'WALLET', 'OTHER'), defaultValue: 'BANK_TRANSFER' },
          { name: 'reference', label: 'Reference', type: 'text' },
          { name: 'paidAt', label: 'Paid On', type: 'date' },
          { name: 'notes', label: 'Notes', type: 'text' },
        ],
        toBody: (v, r) => ({ ...v, bookingId: r.id, gateway: 'MANUAL' }),
      },
      {
        label: 'Set Status',
        method: 'PATCH',
        endpoint: (r) => `/bookings/${r.id}/status`,
        fields: [
          { name: 'status', label: 'Status', type: 'select', options: opts('RESERVED', 'BOOKED', 'AGREEMENT_PENDING', 'AGREEMENT_DONE', 'SOLD', 'CANCELLED'), required: true },
          { name: 'remarks', label: 'Remarks', type: 'text' },
        ],
      },
    ],
  },
  'payment-plans': {
    title: 'Payment Plans',
    description: 'Instalment schedules applied to bookings.',
    endpoint: '/finance/payment-plans',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'isDefault', label: 'Default', kind: 'badge' },
      { key: 'isActive', label: 'Active', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 2 },
      refField('projectId', 'Project', 'projects'),
      { name: 'isDefault', label: 'Default plan', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
      {
        name: 'milestones',
        label: 'Milestones',
        type: 'items',
        colSpan: 2,
        itemLabel: 'Milestone',
        itemFields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'category', label: 'Category', type: 'select', options: opts('BOOKING', 'AGREEMENT', 'CONSTRUCTION', 'POSSESSION', 'OTHER'), defaultValue: 'CONSTRUCTION' },
          { name: 'basis', label: 'Basis', type: 'select', options: opts('PERCENT', 'FIXED'), defaultValue: 'PERCENT' },
          { name: 'value', label: 'Value', type: 'number', required: true },
          { name: 'dueOffsetDays', label: 'Offset (days)', type: 'number', defaultValue: 0 },
          { name: 'taxPercent', label: 'Tax %', type: 'number', defaultValue: 0 },
        ],
      },
    ],
    canDelete: true,
  },
  demands: {
    title: 'Payment Demands',
    description: 'Instalment demands raised to customers.',
    endpoint: '/finance/demands',
    columns: [
      { key: 'demandNumber', label: 'Demand #' },
      { key: 'amount', label: 'Amount', kind: 'currency' },
      { key: 'paidAmount', label: 'Paid', kind: 'currency' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'dueDate', label: 'Due', kind: 'date' },
    ],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    rowActions: [
      {
        label: 'Waive',
        endpoint: (r) => `/finance/demands/${r.id}/waive`,
        fields: [{ name: 'reason', label: 'Reason', type: 'text' }],
        confirm: 'Waive this demand?',
      },
    ],
  },
  payments: {
    title: 'Payments',
    description: 'Collections received against bookings.',
    endpoint: '/finance/payments',
    columns: [
      { key: 'receiptNumber', label: 'Receipt #' },
      { key: 'amount', label: 'Amount', kind: 'currency' },
      { key: 'mode', label: 'Mode', kind: 'badge' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'paidAt', label: 'Paid At', kind: 'date' },
    ],
    fields: [
      refField('bookingId', 'Booking', 'bookings', true),
      { name: 'amount', label: 'Amount', type: 'currency', required: true },
      { name: 'mode', label: 'Mode', type: 'select', options: opts('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'ONLINE', 'WALLET', 'OTHER'), defaultValue: 'BANK_TRANSFER' },
      { name: 'reference', label: 'Reference', type: 'text' },
      { name: 'paidAt', label: 'Paid On', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canEdit: false,
    canDelete: true,
  },
  invoices: {
    title: 'Invoices',
    description: 'Sales and purchase invoices.',
    endpoint: '/finance/invoices',
    columns: [
      { key: 'invoiceNumber', label: 'Invoice #' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'totalAmount', label: 'Total', kind: 'currency' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'issueDate', label: 'Issued', kind: 'date' },
    ],
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: opts('SALES', 'PURCHASE'), defaultValue: 'SALES' },
      { name: 'issueDate', label: 'Issue Date', type: 'date', required: true },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      refField('customerId', 'Customer', 'customers'),
      refField('bookingId', 'Booking', 'bookings'),
      refField('vendorId', 'Vendor', 'vendors'),
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
      {
        name: 'items',
        label: 'Line Items',
        type: 'items',
        colSpan: 2,
        itemLabel: 'Item',
        itemFields: [
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'hsn', label: 'HSN', type: 'text' },
          { name: 'quantity', label: 'Qty', type: 'number', defaultValue: 1 },
          { name: 'rate', label: 'Rate', type: 'number', required: true },
          { name: 'taxPercent', label: 'Tax %', type: 'number', defaultValue: 0 },
        ],
      },
    ],
    canEdit: false,
    canDelete: true,
    canDownloadPdf: true,
  },
  accounts: {
    title: 'Accounts',
    description: 'Bank and cash accounts with balances.',
    endpoint: '/finance/accounts',
    columns: [
      { key: 'name', label: 'Account' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'accountNumber', label: 'Number' },
      { key: 'currentBalance', label: 'Balance', kind: 'currency' },
    ],
    fields: [
      { name: 'name', label: 'Account Name', type: 'text', required: true, colSpan: 2 },
      { name: 'type', label: 'Type', type: 'select', options: opts('CASH', 'BANK', 'WALLET', 'OTHER'), defaultValue: 'BANK' },
      { name: 'accountNumber', label: 'Account Number', type: 'text' },
      { name: 'bankName', label: 'Bank Name', type: 'text' },
      { name: 'ifsc', label: 'IFSC', type: 'text' },
      { name: 'openingBalance', label: 'Opening Balance', type: 'currency', defaultValue: 0 },
    ],
    canEdit: false,
    canDelete: false,
  },
  expenses: {
    title: 'Expenses',
    description: 'Project and administrative expenses.',
    endpoint: '/finance/expenses',
    columns: [
      { key: 'expenseNumber', label: 'Expense #' },
      { key: 'title', label: 'Title' },
      { key: 'amount', label: 'Amount', kind: 'currency' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'date', label: 'Date', kind: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
      { name: 'amount', label: 'Amount', type: 'currency', required: true },
      { name: 'taxAmount', label: 'Tax Amount', type: 'currency', defaultValue: 0 },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'mode', label: 'Mode', type: 'select', options: opts('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'ONLINE', 'WALLET', 'OTHER'), defaultValue: 'BANK_TRANSFER' },
      refField('projectId', 'Project', 'projects'),
      refField('categoryId', 'Category', 'expense-categories'),
      refField('vendorId', 'Vendor', 'vendors'),
      refField('accountId', 'Account', 'accounts'),
      { name: 'reference', label: 'Reference', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
    rowActions: [
      {
        label: 'Set Status',
        method: 'PATCH',
        endpoint: (r) => `/finance/expenses/${r.id}/status`,
        fields: [
          { name: 'status', label: 'Status', type: 'select', options: opts('SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'), required: true },
          { name: 'remarks', label: 'Remarks', type: 'text' },
        ],
      },
    ],
  },
  'expense-categories': {
    title: 'Expense Categories',
    description: 'Classification for expenses.',
    endpoint: '/finance/expense-categories',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'kind', label: 'Kind', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'kind', label: 'Kind', type: 'select', options: opts('CAPEX', 'OPEX'), defaultValue: 'OPEX' },
    ],
    canEdit: false,
    canDelete: false,
  },

  // ------------------------------------------------------------ Procurement
  vendors: {
    title: 'Vendors',
    description: 'Suppliers, contractors and service vendors.',
    endpoint: '/procurement/vendors',
    columns: [
      { key: 'name', label: 'Vendor' },
      { key: 'category', label: 'Category', kind: 'badge' },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 2 },
      { name: 'category', label: 'Category', type: 'select', options: opts('CONTRACTOR', 'SUBCONTRACTOR', 'MATERIAL_SUPPLIER', 'CONSULTANT', 'AGENCY', 'ARCHITECT', 'OTHER'), defaultValue: 'OTHER' },
      { name: 'contactName', label: 'Contact Person', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'gstin', label: 'GSTIN', type: 'text' },
      { name: 'pan', label: 'PAN', type: 'text' },
      { name: 'rating', label: 'Rating', type: 'number' },
      { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
  },
  materials: {
    title: 'Materials',
    description: 'Material master with units and costs.',
    endpoint: '/procurement/materials',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'unit', label: 'Unit', kind: 'badge' },
      { key: 'standardCost', label: 'Cost', kind: 'currency' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      refField('categoryId', 'Category', 'material-categories'),
      { name: 'unit', label: 'Unit', type: 'select', options: opts('NOS', 'KG', 'BAG', 'M2', 'M3', 'LTR', 'FT', 'TON', 'BOX'), defaultValue: 'NOS' },
      { name: 'reorderLevel', label: 'Reorder Level', type: 'number', defaultValue: 0 },
      { name: 'standardCost', label: 'Standard Cost', type: 'currency', defaultValue: 0 },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
  },
  'material-categories': {
    title: 'Material Categories',
    description: 'Grouping for materials.',
    endpoint: '/procurement/material-categories',
    columns: [{ key: 'name', label: 'Name' }],
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }],
    canEdit: false,
    canDelete: false,
  },
  warehouses: {
    title: 'Warehouses',
    description: 'Material stores and their locations.',
    endpoint: '/procurement/warehouses',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Warehouse' },
      { key: 'city', label: 'City' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      refField('projectId', 'Project', 'projects'),
      { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
    ],
    canDelete: false,
  },
  stock: {
    title: 'Stock',
    description: 'Live material stock levels per warehouse.',
    endpoint: '/procurement/stock',
    columns: [
      { key: 'materialId', label: 'Material' },
      { key: 'warehouseId', label: 'Warehouse' },
      { key: 'quantity', label: 'Quantity', kind: 'number' },
    ],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    pageActions: [
      {
        label: 'Record Stock Move',
        endpoint: '/procurement/stock-moves',
        fields: [
          refField('materialId', 'Material', 'materials', true),
          refField('warehouseId', 'Warehouse', 'warehouses', true),
          { name: 'type', label: 'Type', type: 'select', options: opts('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'), defaultValue: 'IN' },
          { name: 'quantity', label: 'Quantity', type: 'number', required: true },
          { name: 'unitCost', label: 'Unit Cost', type: 'currency', defaultValue: 0 },
          { name: 'note', label: 'Note', type: 'text', colSpan: 2 },
        ],
      },
    ],
  },
  requisitions: {
    title: 'Purchase Requisitions',
    description: 'Internal requests for materials.',
    endpoint: '/procurement/requisitions',
    columns: [
      { key: 'requisitionNumber', label: 'Requisition #' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'createdAt', label: 'Created', kind: 'date' },
    ],
    fields: [
      projectField,
      { name: 'notes', label: 'Notes', type: 'text', colSpan: 2 },
      {
        name: 'items',
        label: 'Items',
        type: 'items',
        colSpan: 2,
        itemLabel: 'Item',
        itemFields: [
          refField('materialId', 'Material', 'materials'),
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'quantity', label: 'Qty', type: 'number', defaultValue: 1 },
          { name: 'unit', label: 'Unit', type: 'text', defaultValue: 'NOS' },
          { name: 'estimatedCost', label: 'Est. Cost', type: 'number', defaultValue: 0 },
        ],
      },
    ],
    canEdit: false,
    canDelete: false,
    rowActions: [
      {
        label: 'Decide',
        endpoint: (r) => `/procurement/requisitions/${r.id}/decide`,
        fields: [
          { name: 'approved', label: 'Approve', type: 'checkbox', required: true },
          { name: 'notes', label: 'Notes', type: 'text' },
        ],
      },
    ],
  },
  'purchase-orders': {
    title: 'Purchase Orders',
    description: 'Orders placed to vendors.',
    endpoint: '/procurement/purchase-orders',
    columns: [
      { key: 'poNumber', label: 'PO #' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'orderDate', label: 'Order Date', kind: 'date' },
    ],
    fields: [
      projectField,
      refField('vendorId', 'Vendor', 'vendors', true),
      refField('requisitionId', 'Requisition', 'requisitions'),
      { name: 'orderDate', label: 'Order Date', type: 'date', required: true },
      { name: 'expectedDate', label: 'Expected Date', type: 'date' },
      { name: 'notes', label: 'Notes', type: 'text', colSpan: 2 },
      {
        name: 'items',
        label: 'Items',
        type: 'items',
        colSpan: 2,
        itemLabel: 'Item',
        itemFields: [
          refField('materialId', 'Material', 'materials'),
          { name: 'description', label: 'Description', type: 'text', required: true },
          { name: 'quantity', label: 'Qty', type: 'number', defaultValue: 1 },
          { name: 'unit', label: 'Unit', type: 'text', defaultValue: 'NOS' },
          { name: 'rate', label: 'Rate', type: 'number', required: true },
        ],
      },
    ],
    canEdit: false,
    canDelete: false,
    rowActions: [
      {
        label: 'Set Status',
        method: 'PATCH',
        endpoint: (r) => `/procurement/purchase-orders/${r.id}/status`,
        fields: [
          { name: 'status', label: 'Status', type: 'select', options: opts('DRAFT', 'ISSUED', 'PARTIAL', 'RECEIVED', 'CANCELLED'), required: true },
        ],
      },
    ],
  },
  grn: {
    title: 'Goods Received Notes',
    description: 'Material receipts against purchase orders.',
    endpoint: '/procurement/grn',
    columns: [
      { key: 'grnNumber', label: 'GRN #' },
      { key: 'createdAt', label: 'Received', kind: 'date' },
    ],
    fields: [
      refField('poId', 'Purchase Order', 'purchase-orders', true),
      projectField,
      { name: 'notes', label: 'Notes', type: 'text', colSpan: 2 },
      {
        name: 'items',
        label: 'Received Items',
        type: 'items',
        colSpan: 2,
        itemLabel: 'Item',
        itemFields: [
          refField('materialId', 'Material', 'materials'),
          { name: 'quantity', label: 'Quantity', type: 'number', required: true },
          { name: 'qtyAccepted', label: 'Accepted', type: 'number', required: true },
          { name: 'qtyRejected', label: 'Rejected', type: 'number', defaultValue: 0 },
          refField('warehouseId', 'Warehouse', 'warehouses'),
        ],
      },
    ],
    canEdit: false,
    canDelete: false,
  },

  // ------------------------------------------------------------ Construction
  tasks: {
    title: 'Construction Tasks',
    description: 'Site execution tasks and progress.',
    endpoint: '/construction/tasks',
    columns: [
      { key: 'name', label: 'Task' },
      { key: 'priority', label: 'Priority', kind: 'badge' },
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'progressPercent', label: 'Progress', kind: 'number' },
    ],
    fields: [
      projectField,
      refField('buildingId', 'Building', 'buildings'),
      { name: 'name', label: 'Task Name', type: 'text', required: true, colSpan: 2 },
      { name: 'status', label: 'Status', type: 'select', options: opts('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'), defaultValue: 'TODO' },
      { name: 'priority', label: 'Priority', type: 'select', options: opts('LOW', 'MEDIUM', 'HIGH', 'URGENT'), defaultValue: 'MEDIUM' },
      refField('assigneeId', 'Assignee', 'users'),
      { name: 'progressPercent', label: 'Progress %', type: 'number', defaultValue: 0 },
      { name: 'startDate', label: 'Start Date', type: 'date' },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
  },
  'site-reports': {
    title: 'Daily Site Reports',
    description: 'Daily progress logs from sites.',
    endpoint: '/construction/site-reports',
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'manpowerCount', label: 'Manpower', kind: 'number' },
      { key: 'progressPercent', label: 'Progress', kind: 'number' },
    ],
    fields: [
      projectField,
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'manpowerCount', label: 'Manpower Count', type: 'number', defaultValue: 0 },
      { name: 'progressPercent', label: 'Progress %', type: 'number', defaultValue: 0 },
      { name: 'weather', label: 'Weather', type: 'text' },
      { name: 'equipmentUsed', label: 'Equipment Used', type: 'text' },
      { name: 'workDescription', label: 'Work Description', type: 'textarea', colSpan: 2 },
      { name: 'issues', label: 'Issues', type: 'textarea', colSpan: 2 },
    ],
    canEdit: false,
    canDelete: false,
  },
  inspections: {
    title: 'Quality Inspections',
    description: 'Quality checks and their results.',
    endpoint: '/construction/inspections',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'result', label: 'Result', kind: 'badge' },
      { key: 'date', label: 'Date', kind: 'date' },
    ],
    fields: [
      projectField,
      { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'result', label: 'Result', type: 'select', options: opts('PASS', 'FAIL', 'CONDITIONAL'), defaultValue: 'CONDITIONAL' },
      { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
    ],
    canEdit: false,
    canDelete: false,
  },

  // ------------------------------------------------------------ Service
  tickets: {
    title: 'Helpdesk',
    description: 'Customer and internal support tickets.',
    endpoint: '/tickets',
    columns: [
      { key: 'ticketNumber', label: 'Ticket #' },
      { key: 'subject', label: 'Subject' },
      { key: 'priority', label: 'Priority', kind: 'badge' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      refField('customerId', 'Customer', 'customers'),
      refField('bookingId', 'Booking', 'bookings'),
      refField('projectId', 'Project', 'projects'),
      { name: 'category', label: 'Category', type: 'select', options: opts('COMPLAINT', 'SERVICE', 'MAINTENANCE', 'HANDOVER', 'WARRANTY', 'FEEDBACK', 'OTHER'), defaultValue: 'COMPLAINT' },
      { name: 'priority', label: 'Priority', type: 'select', options: opts('LOW', 'MEDIUM', 'HIGH', 'URGENT'), defaultValue: 'MEDIUM' },
      { name: 'subject', label: 'Subject', type: 'text', required: true, colSpan: 2 },
      { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
    ],
    canEdit: true,
    canDelete: true,
    rowActions: [
      {
        label: 'Update',
        method: 'PATCH',
        endpoint: (r) => `/tickets/${r.id}`,
        fields: [
          { name: 'status', label: 'Status', type: 'select', options: opts('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED') },
          { name: 'priority', label: 'Priority', type: 'select', options: opts('LOW', 'MEDIUM', 'HIGH', 'URGENT') },
          refField('assignedTo', 'Assigned To', 'users'),
          { name: 'resolutionNotes', label: 'Resolution Notes', type: 'textarea', colSpan: 2 },
        ],
      },
      {
        label: 'Add Message',
        endpoint: (r) => `/tickets/${r.id}/messages`,
        fields: [
          { name: 'body', label: 'Message', type: 'textarea', required: true, colSpan: 2 },
          { name: 'authorRole', label: 'From', type: 'select', options: opts('STAFF', 'CUSTOMER'), defaultValue: 'STAFF' },
        ],
      },
    ],
  },
  handovers: {
    title: 'Handovers',
    description: 'Possession handovers to customers.',
    endpoint: '/tickets/handovers/list',
    createEndpoint: '/tickets/handovers',
    columns: [
      { key: 'status', label: 'Status', kind: 'badge' },
      { key: 'scheduledAt', label: 'Scheduled', kind: 'date' },
    ],
    fields: [
      refField('bookingId', 'Booking', 'bookings', true),
      { name: 'scheduledAt', label: 'Scheduled At', type: 'datetime' },
      { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
    ],
    canEdit: false,
    canDelete: false,
    rowActions: [
      {
        label: 'Update',
        method: 'PATCH',
        endpoint: (r) => `/tickets/handovers/${r.id}`,
        fields: [
          { name: 'status', label: 'Status', type: 'select', options: opts('PENDING', 'IN_PROGRESS', 'COMPLETED') },
          { name: 'handedOverAt', label: 'Handed Over At', type: 'datetime' },
          { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
        ],
      },
    ],
  },
  documents: {
    title: 'Documents',
    description: 'Agreements, approvals and shared files.',
    endpoint: '/documents',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'folder', label: 'Folder', kind: 'badge' },
      { key: 'visibility', label: 'Visibility', kind: 'badge' },
      { key: 'createdAt', label: 'Uploaded', kind: 'date' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, colSpan: 2 },
      { name: 'folder', label: 'Folder', type: 'select', options: opts('ORGANIZATION', 'PROJECT', 'PROPERTY', 'CUSTOMER_KYC', 'BOOKING', 'AGREEMENT', 'PAYMENT', 'LEGAL', 'CONSTRUCTION', 'VENDOR', 'EMPLOYEE', 'OTHER'), defaultValue: 'OTHER' },
      { name: 'visibility', label: 'Visibility', type: 'select', options: opts('INTERNAL', 'CUSTOMER'), defaultValue: 'INTERNAL' },
      refField('projectId', 'Project', 'projects'),
      refField('customerId', 'Customer', 'customers'),
      refField('bookingId', 'Booking', 'bookings'),
      refField('vendorId', 'Vendor', 'vendors'),
      { name: 'fileName', label: 'File Name', type: 'text', required: true },
      { name: 'mimeType', label: 'MIME Type', type: 'text', defaultValue: 'application/pdf', required: true },
      { name: 'sizeBytes', label: 'Size (bytes)', type: 'number', defaultValue: 0, required: true },
      { name: 'storageKey', label: 'Storage Key / URL', type: 'text', required: true, colSpan: 2 },
      { name: 'expiresAt', label: 'Expires At', type: 'date' },
    ],
    editFields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'visibility', label: 'Visibility', type: 'select', options: opts('INTERNAL', 'CUSTOMER') },
      { name: 'expiresAt', label: 'Expires At', type: 'date' },
    ],
    canDelete: true,
    rowActions: [
      {
        label: 'Add Version',
        endpoint: (r) => `/documents/${r.id}/versions`,
        fields: [
          { name: 'fileName', label: 'File Name', type: 'text', required: true },
          { name: 'sizeBytes', label: 'Size (bytes)', type: 'number', required: true },
          { name: 'storageKey', label: 'Storage Key / URL', type: 'text', required: true, colSpan: 2 },
          { name: 'note', label: 'Note', type: 'text', colSpan: 2 },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ People
  employees: {
    title: 'Employees',
    description: 'Staff records across departments.',
    endpoint: '/hr/employees',
    columns: [
      { key: 'employeeCode', label: 'Code' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'employeeCode', label: 'Employee Code', type: 'text', required: true },
      { name: 'designation', label: 'Designation', type: 'text', required: true },
      refField('departmentId', 'Department', 'departments'),
      refField('branchId', 'Branch', 'branches'),
      { name: 'joinDate', label: 'Join Date', type: 'date', required: true },
      { name: 'employmentType', label: 'Employment Type', type: 'select', options: opts('FULL_TIME', 'PART_TIME', 'CONTRACT'), defaultValue: 'FULL_TIME' },
      { name: 'baseSalary', label: 'Base Salary', type: 'currency', defaultValue: 0 },
      refField('userId', 'Linked User', 'users'),
    ],
    canEdit: true,
    canDelete: true,
  },
  attendance: {
    title: 'Attendance',
    description: 'Daily attendance register.',
    endpoint: '/hr/attendance',
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      refField('employeeId', 'Employee', 'employees', true),
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: opts('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY'), defaultValue: 'PRESENT' },
      { name: 'notes', label: 'Notes', type: 'text', colSpan: 2 },
    ],
    canEdit: false,
    canDelete: false,
  },
  leaves: {
    title: 'Leave Requests',
    description: 'Employee leave applications.',
    endpoint: '/hr/leaves',
    columns: [
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'startDate', label: 'From', kind: 'date' },
      { key: 'endDate', label: 'To', kind: 'date' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      refField('employeeId', 'Employee', 'employees', true),
      { name: 'type', label: 'Type', type: 'select', options: opts('ANNUAL', 'SICK', 'CASUAL', 'UNPAID'), defaultValue: 'ANNUAL' },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'days', label: 'Days', type: 'number', required: true, defaultValue: 1 },
      { name: 'reason', label: 'Reason', type: 'textarea', required: true, colSpan: 2 },
    ],
    canEdit: false,
    canDelete: false,
    rowActions: [
      {
        label: 'Decide',
        endpoint: (r) => `/hr/leaves/${r.id}/decide`,
        fields: [{ name: 'approved', label: 'Approve', type: 'checkbox', required: true }],
      },
    ],
  },

  // ------------------------------------------------------------ Automation
  workflows: {
    title: 'Workflows',
    description: 'Automation rules triggered by business events.',
    endpoint: '/workflows',
    columns: [
      { key: 'name', label: 'Workflow' },
      { key: 'trigger', label: 'Trigger', kind: 'badge' },
      { key: 'isActive', label: 'Active', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      {
        name: 'trigger',
        label: 'Trigger',
        type: 'select',
        options: opts('LEAD_CREATED', 'LEAD_CONVERTED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'PAYMENT_RECEIVED', 'DEMAND_OVERDUE', 'MILESTONE_COMPLETED', 'DOCUMENT_EXPIRING', 'TICKET_CREATED', 'CUSTOM'),
        defaultValue: 'LEAD_CREATED',
        colSpan: 2,
      },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
      {
        name: 'actions',
        label: 'Actions',
        type: 'items',
        colSpan: 2,
        itemLabel: 'Action',
        itemFields: [
          { name: 'type', label: 'Type', type: 'select', options: opts('ASSIGN_LEAD', 'NOTIFY', 'CREATE_TASK', 'SEND_EMAIL', 'UPDATE_STATUS', 'GENERATE_DEMANDS', 'WEBHOOK') },
          { name: 'config', label: 'Config (JSON)', type: 'json', help: 'e.g. {"role":"SALES"}' },
        ],
      },
    ],
    canDelete: true,
    rowActions: [
      {
        label: 'Run',
        endpoint: (r) => `/workflows/${r.id}/run`,
        fields: [{ name: 'context', label: 'Context (JSON)', type: 'json', defaultValue: {} }],
      },
    ],
  },

  // ------------------------------------------------------------ Admin
  users: {
    title: 'Users',
    description: 'Team members with access to this organization.',
    endpoint: '/users',
    columns: [
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status', kind: 'badge' },
    ],
    fields: [
      { name: 'firstName', label: 'First Name', type: 'text', required: true },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'text', required: true },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'password', label: 'Temporary Password', type: 'password', required: true, help: 'Min 8 chars, 1 letter, 1 number' },
      { name: 'roleCodes', label: 'Role', type: 'ref', ref: 'roles', required: true, help: 'Sent as a single-role array' },
      { name: 'designation', label: 'Designation', type: 'text' },
      refField('departmentId', 'Department', 'departments'),
      refField('branchId', 'Branch', 'branches'),
    ],
    editFields: [
      { name: 'firstName', label: 'First Name', type: 'text' },
      { name: 'lastName', label: 'Last Name', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: opts('ACTIVE', 'SUSPENDED') },
      { name: 'designation', label: 'Designation', type: 'text' },
      refField('departmentId', 'Department', 'departments'),
      refField('branchId', 'Branch', 'branches'),
    ],
    canDelete: true,
  },
  roles: {
    title: 'Roles & Permissions',
    description: 'Access roles and their permissions.',
    endpoint: '/roles',
    columns: [
      { key: 'name', label: 'Role' },
      { key: 'code', label: 'Code' },
      { key: 'permissionCount', label: 'Permissions', kind: 'number' },
      { key: 'userCount', label: 'Users', kind: 'number' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true, help: 'UPPER_SNAKE_CASE' },
      { name: 'description', label: 'Description', type: 'text', colSpan: 2 },
      { name: 'permissions', label: 'Permissions', type: 'multiselect', ref: 'permissions', required: true, colSpan: 2 },
    ],
    editFields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'description', label: 'Description', type: 'text', colSpan: 2 },
      { name: 'permissions', label: 'Permissions', type: 'multiselect', ref: 'permissions', colSpan: 2 },
    ],
    canDelete: true,
  },
  notifications: {
    title: 'Notifications',
    description: 'In-app alerts and messages.',
    endpoint: '/notifications',
    columns: [
      { key: 'title', label: 'Title' },
      { key: 'type', label: 'Type', kind: 'badge' },
      { key: 'isRead', label: 'Read', kind: 'badge' },
      { key: 'createdAt', label: 'Created', kind: 'date' },
    ],
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 },
      { name: 'body', label: 'Body', type: 'textarea', colSpan: 2 },
      { name: 'type', label: 'Type', type: 'text', defaultValue: 'GENERAL' },
      { name: 'channel', label: 'Channel', type: 'select', options: opts('IN_APP', 'EMAIL', 'PUSH', 'SMS'), defaultValue: 'IN_APP' },
    ],
    canEdit: false,
    canDelete: true,
    rowActions: [
      { label: 'Mark Read', endpoint: (r) => `/notifications/${r.id}/read`, fields: [] },
    ],
    pageActions: [
      { label: 'Mark All Read', endpoint: '/notifications/read-all', fields: [] },
    ],
  },
  branches: {
    title: 'Branches',
    description: 'Office and site branches.',
    endpoint: '/organization/branches',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Branch' },
      { key: 'city', label: 'City' },
      { key: 'isActive', label: 'Active', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'isHeadquarters', label: 'Headquarters', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
      { name: 'address', label: 'Address', type: 'text', colSpan: 2 },
    ],
    canDelete: true,
  },
  departments: {
    title: 'Departments',
    description: 'Organization departments.',
    endpoint: '/organization/departments',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'isActive', label: 'Active', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      refField('headId', 'Head', 'users'),
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    canDelete: true,
  },
  'financial-years': {
    title: 'Financial Years',
    description: 'Accounting periods.',
    endpoint: '/organization/financial-years',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'startDate', label: 'Start', kind: 'date' },
      { key: 'endDate', label: 'End', kind: 'date' },
      { key: 'isCurrent', label: 'Current', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'startDate', label: 'Start Date', type: 'date', required: true },
      { name: 'endDate', label: 'End Date', type: 'date', required: true },
      { name: 'isCurrent', label: 'Current Year', type: 'checkbox' },
    ],
    canDelete: false,
  },
  'tax-rates': {
    title: 'Tax Rates',
    description: 'Tax slabs applied to charges.',
    endpoint: '/organization/tax-rates',
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'code', label: 'Code' },
      { key: 'percent', label: 'Percent', kind: 'number' },
      { key: 'isDefault', label: 'Default', kind: 'badge' },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true },
      { name: 'percent', label: 'Percent', type: 'number', required: true },
      { name: 'isDefault', label: 'Default', type: 'checkbox' },
      { name: 'isActive', label: 'Active', type: 'checkbox', defaultValue: true },
    ],
    canDelete: true,
  },
  organization: {
    title: 'Organization',
    description: 'Company profile, settings and structure.',
    endpoint: '/organization',
    columns: [],
    special: 'organization',
  },
  reports: {
    title: 'Reports',
    description: 'Live business KPIs across all modules.',
    endpoint: '/reports/dashboard',
    columns: [],
    special: 'reports',
  },
  ai: {
    title: 'AI Assistant',
    description: 'Business assistant conversations and usage.',
    endpoint: '/ai/conversations',
    columns: [
      { key: 'title', label: 'Conversation' },
      { key: 'updatedAt', label: 'Last activity', kind: 'date' },
    ],
    canCreate: true,
    canEdit: false,
    canDelete: true,
    createEndpoint: '/ai/conversations',
    fields: [{ name: 'title', label: 'Title', type: 'text', required: true, colSpan: 2 }],
  },
};
