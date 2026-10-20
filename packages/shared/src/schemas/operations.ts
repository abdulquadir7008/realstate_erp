import { z } from 'zod';
import { paginationSchema } from './common';

// ---------------- vendors / procurement / materials

export const vendorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z
    .enum(['CONTRACTOR', 'SUBCONTRACTOR', 'MATERIAL_SUPPLIER', 'CONSULTANT', 'AGENCY', 'ARCHITECT', 'OTHER'])
    .default('OTHER'),
  contactName: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().toLowerCase().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  gstin: z.string().trim().max(15).optional().nullable(),
  pan: z.string().trim().max(12).optional().nullable(),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const materialSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(30).transform((s) => s.toUpperCase()),
  categoryId: z.string().uuid().optional().nullable(),
  unit: z.enum(['NOS', 'KG', 'BAG', 'M2', 'M3', 'LTR', 'FT', 'TON', 'BOX']).default('NOS'),
  description: z.string().trim().max(500).optional().nullable(),
  reorderLevel: z.coerce.number().min(0).default(0),
  standardCost: z.coerce.number().min(0).default(0),
});

export const materialCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const warehouseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  projectId: z.string().uuid().optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
});

export const stockMoveSchema = z.object({
  materialId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  type: z.enum(['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0).default(0),
  referenceType: z.string().trim().max(30).optional().nullable(),
  referenceId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  note: z.string().trim().max(300).optional().nullable(),
});

export const purchaseOrderSchema = z.object({
  projectId: z.string().uuid(),
  vendorId: z.string().uuid(),
  requisitionId: z.string().uuid().optional().nullable(),
  orderDate: z.coerce.date(),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid().optional().nullable(),
        description: z.string().trim().min(1).max(300),
        quantity: z.coerce.number().positive(),
        unit: z.string().trim().max(10).default('NOS'),
        rate: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

export const requisitionSchema = z.object({
  projectId: z.string().uuid(),
  notes: z.string().trim().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        materialId: z.string().uuid().optional().nullable(),
        description: z.string().trim().min(1).max(300),
        quantity: z.coerce.number().positive(),
        unit: z.string().trim().max(10).default('NOS'),
        estimatedCost: z.coerce.number().min(0).default(0),
      }),
    )
    .min(1),
});

export const decideRequisitionSchema = z.object({
  approved: z.boolean(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const grnSchema = z.object({
  poId: z.string().uuid(),
  projectId: z.string().uuid(),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        poItemId: z.string().uuid().optional().nullable(),
        materialId: z.string().uuid().optional().nullable(),
        quantity: z.coerce.number().positive(),
        qtyAccepted: z.coerce.number().min(0),
        qtyRejected: z.coerce.number().min(0).default(0),
        warehouseId: z.string().uuid().optional().nullable(),
        note: z.string().trim().max(200).optional().nullable(),
      }),
    )
    .min(1),
});

// ---------------- construction / tasks

export const constructionTaskSchema = z.object({
  projectId: z.string().uuid(),
  buildingId: z.string().uuid().optional().nullable(),
  milestoneId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().uuid().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
});

export const updateTaskSchema = constructionTaskSchema.partial().omit({ projectId: true });

export const siteReportSchema = z.object({
  projectId: z.string().uuid(),
  date: z.coerce.date(),
  workDescription: z.string().trim().max(4000).optional().nullable(),
  manpowerCount: z.coerce.number().int().min(0).default(0),
  equipmentUsed: z.string().trim().max(500).optional().nullable(),
  weather: z.string().trim().max(60).optional().nullable(),
  issues: z.string().trim().max(2000).optional().nullable(),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
  photos: z.array(z.object({ url: z.string().max(600), caption: z.string().max(200).optional() })).default([]),
});

export const qualityInspectionSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2).max(160),
  date: z.coerce.date(),
  checklist: z.array(z.object({ item: z.string().min(1).max(200), ok: z.boolean(), remarks: z.string().max(300).optional() })).default([]),
  result: z.enum(['PASS', 'FAIL', 'CONDITIONAL']).default('CONDITIONAL'),
  remarks: z.string().trim().max(2000).optional().nullable(),
});

// ---------------- tickets / HR / documents / workflows

export const ticketSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  category: z.enum(['COMPLAINT', 'SERVICE', 'MAINTENANCE', 'HANDOVER', 'WARRANTY', 'FEEDBACK', 'OTHER']).default('COMPLAINT'),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const updateTicketSchema = z.object({
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  resolutionNotes: z.string().trim().max(2000).optional().nullable(),
});

export const ticketMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  authorRole: z.enum(['STAFF', 'CUSTOMER']).default('STAFF'),
  attachments: z.array(z.object({ url: z.string().max(600), name: z.string().max(200).optional() })).default([]),
});

export const employeeSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional().nullable(),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(20).optional().nullable(),
  employeeCode: z.string().trim().min(2).max(30),
  departmentId: z.string().uuid().optional().nullable(),
  designation: z.string().trim().min(2).max(80),
  branchId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  joinDate: z.coerce.date(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).default('FULL_TIME'),
  baseSalary: z.coerce.number().min(0).default(0),
  userId: z.string().uuid().optional().nullable(),
});

export const attendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.coerce.date(),
  status: z.enum(['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY']).default('PRESENT'),
  checkIn: z.coerce.date().optional().nullable(),
  checkOut: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const leaveSchema = z.object({
  employeeId: z.string().uuid(),
  type: z.enum(['ANNUAL', 'SICK', 'CASUAL', 'UNPAID']).default('ANNUAL'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  days: z.coerce.number().int().min(1).max(365),
  reason: z.string().trim().min(3).max(1000),
});

export const documentMetaSchema = z.object({
  name: z.string().trim().min(1).max(200),
  folder: z
    .enum([
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
    ])
    .default('OTHER'),
  projectId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  bookingId: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  visibility: z.enum(['INTERNAL', 'CUSTOMER']).default('INTERNAL'),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const documentUploadSchema = documentMetaSchema.extend({
  fileName: z.string().trim().min(1).max(300),
  mimeType: z.string().trim().min(1).max(150),
  sizeBytes: z.coerce.number().int().min(0),
  storageKey: z.string().trim().min(1).max(600),
});

export const documentVersionSchema = z.object({
  fileName: z.string().trim().min(1).max(300),
  sizeBytes: z.coerce.number().int().min(0),
  storageKey: z.string().trim().min(1).max(600),
  note: z.string().trim().max(500).optional().nullable(),
});

export const handoverSchema = z.object({
  bookingId: z.string().uuid(),
  scheduledAt: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const updateHandoverSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  checklist: z
    .array(z.object({ item: z.string().min(1).max(200), done: z.boolean(), remarks: z.string().max(300).optional() }))
    .optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  handedOverAt: z.coerce.date().optional().nullable(),
});

export const workflowDefinitionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(40).transform((s) => s.toUpperCase()),
  trigger: z.enum([
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
  ]),
  conditions: z
    .array(z.object({ field: z.string().min(1), op: z.enum(['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'in']), value: z.unknown() }))
    .default([]),
  actions: z
    .array(
      z.object({
        type: z.enum(['ASSIGN_LEAD', 'NOTIFY', 'CREATE_TASK', 'SEND_EMAIL', 'UPDATE_STATUS', 'GENERATE_DEMANDS', 'WEBHOOK']),
        config: z.record(z.unknown()).default({}),
      }),
    )
    .min(1),
  isActive: z.boolean().default(true),
});

export const notificationQuerySchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
  type: z.string().optional(),
});

export const auditQuerySchema = paginationSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const updateVendorSchema = vendorSchema.partial();
export const updateMaterialSchema = materialSchema.partial();
export const updateMaterialCategorySchema = materialCategorySchema.partial();
export const updateWarehouseSchema = warehouseSchema.partial();
export const updateEmployeeSchema = employeeSchema.partial();
export const updateWorkflowSchema = workflowDefinitionSchema.partial();

export type VendorInput = z.infer<typeof vendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type MaterialCategoryInput = z.infer<typeof materialCategorySchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type StockMoveInput = z.infer<typeof stockMoveSchema>;
export type RequisitionInput = z.infer<typeof requisitionSchema>;
export type DecideRequisitionInput = z.infer<typeof decideRequisitionSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type GrnInput = z.infer<typeof grnSchema>;
export type ConstructionTaskInput = z.infer<typeof constructionTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type SiteReportInput = z.infer<typeof siteReportSchema>;
export type QualityInspectionInput = z.infer<typeof qualityInspectionSchema>;
export type TicketInput = z.infer<typeof ticketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type LeaveInput = z.infer<typeof leaveSchema>;
export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type DocumentVersionInput = z.infer<typeof documentVersionSchema>;
export type HandoverInput = z.infer<typeof handoverSchema>;
export type UpdateHandoverInput = z.infer<typeof updateHandoverSchema>;
export type WorkflowDefinitionInput = z.infer<typeof workflowDefinitionSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
