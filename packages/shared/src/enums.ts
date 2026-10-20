const enumOf = <T extends string>(...values: T[]) => {
  const obj = Object.fromEntries(values.map((v) => [v, v])) as { [K in T]: K };
  return obj;
};

export const Scope = enumOf('SAAS', 'TENANT');
export type Scope = (typeof Scope)[keyof typeof Scope];

export const UserStatus = enumOf('INVITED', 'ACTIVE', 'SUSPENDED');
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const OrgStatus = enumOf('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'CANCELLED');
export type OrgStatus = (typeof OrgStatus)[keyof typeof OrgStatus];

export const SubscriptionStatus = enumOf('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const BillingCycle = enumOf('MONTHLY', 'YEARLY');
export type BillingCycle = (typeof BillingCycle)[keyof typeof BillingCycle];

export const ProjectType = enumOf('RESIDENTIAL', 'COMMERCIAL', 'PLOT', 'VILLA', 'APARTMENT', 'MIXED_USE');
export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const ProjectStatus = enumOf('PLANNING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const BuildingType = enumOf('TOWER', 'BLOCK', 'VILLA_ROW', 'PLOT_SECTION', 'STANDALONE');
export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType];

export const UnitType = enumOf('APARTMENT', 'VILLA', 'PLOT', 'SHOP', 'OFFICE', 'LAND', 'PARKING', 'OTHER');
export type UnitType = (typeof UnitType)[keyof typeof UnitType];

export const UnitStatus = enumOf(
  'AVAILABLE',
  'ON_HOLD',
  'RESERVED',
  'BOOKED',
  'AGREEMENT_PENDING',
  'SOLD',
  'CANCELLED',
  'BLOCKED',
);
export type UnitStatus = (typeof UnitStatus)[keyof typeof UnitStatus];

export const TERMINAL_UNIT_STATUSES: UnitStatus[] = ['BOOKED', 'AGREEMENT_PENDING', 'SOLD'];
export const RELEASABLE_UNIT_STATUSES: UnitStatus[] = ['ON_HOLD', 'RESERVED'];

export const LeadSource = enumOf(
  'WEBSITE',
  'REFERRAL',
  'WALK_IN',
  'CALL',
  'IMPORT',
  'BROKER',
  'PORTAL',
  'SOCIAL',
  'CAMPAIGN',
  'OTHER',
);
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadStatus = enumOf(
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'SITE_VISIT',
  'NEGOTIATION',
  'CONVERTED',
  'LOST',
  'UNQUALIFIED',
);
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LEAD_PIPELINE_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION'];

export const ActivityType = enumOf('CALL', 'MEETING', 'EMAIL', 'WHATSAPP', 'NOTE', 'STATUS_CHANGE', 'SITE_VISIT', 'SYSTEM');
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const CustomerType = enumOf('INDIVIDUAL', 'COMPANY', 'NRI');
export type CustomerType = (typeof CustomerType)[keyof typeof CustomerType];

export const KycStatus = enumOf('PENDING', 'VERIFIED', 'REJECTED');
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const BookingStatus = enumOf(
  'DRAFT',
  'RESERVED',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'AGREEMENT_PENDING',
  'AGREEMENT_SIGNED',
  'CANCELLED',
  'REFUNDED',
  'COMPLETED',
);
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const DemandStatus = enumOf('DUE', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED');
export type DemandStatus = (typeof DemandStatus)[keyof typeof DemandStatus];

export const PaymentMode = enumOf('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'ONLINE', 'WALLET', 'OTHER');
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const PaymentStatus = enumOf('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const GatewayProvider = enumOf('MANUAL', 'RAZORPAY');
export type GatewayProvider = (typeof GatewayProvider)[keyof typeof GatewayProvider];

export const RefundStatus = enumOf('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const ExpenseStatus = enumOf('DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED');
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

export const InvoiceType = enumOf('SALES', 'PURCHASE');
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];

export const InvoiceStatus = enumOf('DRAFT', 'ISSUED', 'PARTIAL', 'PAID', 'VOID');
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const AccountType = enumOf('CASH', 'BANK', 'WALLET', 'OTHER');
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const LedgerType = enumOf('DEBIT', 'CREDIT');
export type LedgerType = (typeof LedgerType)[keyof typeof LedgerType];

export const VendorCategory = enumOf(
  'CONTRACTOR',
  'SUBCONTRACTOR',
  'MATERIAL_SUPPLIER',
  'CONSULTANT',
  'AGENCY',
  'ARCHITECT',
  'OTHER',
);
export type VendorCategory = (typeof VendorCategory)[keyof typeof VendorCategory];

export const RequisitionStatus = enumOf('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ORDERED');
export type RequisitionStatus = (typeof RequisitionStatus)[keyof typeof RequisitionStatus];

export const PurchaseOrderStatus = enumOf('DRAFT', 'ISSUED', 'PARTIAL', 'RECEIVED', 'CANCELLED');
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const StockMoveType = enumOf('IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');
export type StockMoveType = (typeof StockMoveType)[keyof typeof StockMoveType];

export const TaskStatus = enumOf('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = enumOf('LOW', 'MEDIUM', 'HIGH', 'URGENT');
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TicketCategory = enumOf('COMPLAINT', 'SERVICE', 'MAINTENANCE', 'HANDOVER', 'WARRANTY', 'FEEDBACK', 'OTHER');
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TicketStatus = enumOf('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = enumOf('LOW', 'MEDIUM', 'HIGH', 'URGENT');
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const DocumentFolder = enumOf(
  'ORGANIZATION',
  'PROJECT',
  'PROPERTY',
  'CUSTOMER_KYC',
  'BOOKING',
  'AGREEMENT',
  'PAYMENT',
  'LEGAL',
  'CONSTRUCTION',
  'VENDOR',
  'EMPLOYEE',
  'OTHER',
);
export type DocumentFolder = (typeof DocumentFolder)[keyof typeof DocumentFolder];

export const DocumentVisibility = enumOf('INTERNAL', 'CUSTOMER');
export type DocumentVisibility = (typeof DocumentVisibility)[keyof typeof DocumentVisibility];

export const DocStatus = enumOf('ACTIVE', 'SUPERSEDED', 'EXPIRED');
export type DocStatus = (typeof DocStatus)[keyof typeof DocStatus];

export const WorkflowTrigger = enumOf(
  'LEAD_CREATED',
  'LEAD_CONVERTED',
  'BOOKING_CONFIRMED',
  'BOOKING_CANCELLED',
  'PAYMENT_RECEIVED',
  'DEMAND_OVERDUE',
  'MILESTONE_COMPLETED',
  'DOCUMENT_EXPIRING',
  'TICKET_CREATED',
  'CUSTOM',
);
export type WorkflowTrigger = (typeof WorkflowTrigger)[keyof typeof WorkflowTrigger];

export const SubscriptionPeriod = enumOf('BOOKING', 'AGREEMENT', 'CONSTRUCTION', 'POSSESSION', 'OTHER');
export type SubscriptionPeriod = (typeof SubscriptionPeriod)[keyof typeof SubscriptionPeriod];

export const CommissionStatus = enumOf('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
export type CommissionStatus = (typeof CommissionStatus)[keyof typeof CommissionStatus];

export const PayeeType = enumOf('SALES_EXECUTIVE', 'BROKER', 'CHANNEL_PARTNER', 'AGENCY');
export type PayeeType = (typeof PayeeType)[keyof typeof PayeeType];

export const LeaveStatus = enumOf('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];

export const AttendanceStatus = enumOf('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY');
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const NotificationChannel = enumOf('IN_APP', 'EMAIL', 'PUSH', 'SMS');
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];
