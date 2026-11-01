import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface FieldFormListQuery extends PageOffsetInput {
  projectId?: string;
  formType?: string;
  status?: string;
  employeeId?: string;
  from?: Date;
  to?: Date;
}

export interface FieldForm {
  id: string;
  formType: 'DAILY_REPORT' | 'SAFETY_CHECK' | 'PROGRESS_BILL' | 'ATTENDANCE' | 'INSPECTION' | 'CUSTOM';
  projectId: string;
  employeeId?: string;
  title: string;
  data: Record<string, any>;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Offline-capable form data snapshot
export interface OfflineFormData {
  formId: string;
  serializedData: Record<string, any>;
  capturedAt: Date;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  localId?: string;
}

// GPS location captured with form
export interface FormGPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

// Photo attachment to form
export interface FormPhoto {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: Date;
  caption?: string;
}

// Form submission metadata for mobile
export interface FormSubmissionMetadata {
  employeeId: string;
  deviceId: string;
  offlineMode: boolean;
  gpsLocation?: FormGPSLocation;
  photos: FormPhoto[];
  syncRequired: boolean;
}

interface PageOffsetInput {
  page?: number;
  limit?: number;
}

@Injectable()
export class Fld001Service {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- field forms list

  async listForms(q: FieldFormListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.formType) where.formType = q.formType;
    if (q.status) where.status = q.status;
    if (q.employeeId) where.employeeId = q.employeeId;
    if (q.from || q.to) {
      where.createdAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    }
    const [items, total] = await Promise.all([
      this.prisma.fieldForm.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { code: true, name: true } }, employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.fieldForm.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  // ---------------- field form create

  async createForm(input: {
    formType: 'DAILY_REPORT' | 'SAFETY_CHECK' | 'PROGRESS_BILL' | 'ATTENDANCE' | 'INSPECTION' | 'CUSTOM';
    projectId: string;
    title: string;
    data: Record<string, any>;
    submittedBy: string;
  }) {
    return this.prisma.fieldForm.create({
      data: {
        organizationId: requireOrgId(),
        formType: input.formType,
        projectId: input.projectId,
        title: input.title,
        data: input.data,
        status: 'DRAFT',
        submittedBy: input.submittedBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ---------------- field form get

  async getForm(id: string) {
    const form = await this.prisma.fieldForm.findUnique({ where: { id } });
    if (!form) throw errors.notFound('Field form');
    return form;
  }

  // ---------------- field form update

  async updateForm(id: string, input: Partial<{
    title: string;
    data?: Record<string, any>;
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  }>) {
    const form = await this.getForm(id);
    return this.prisma.fieldForm.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  // ---------------- form submission (with offline support)

  async submitForm(id: string, submittedBy: string, metadata: {
    offlineMode: boolean;
    gpsLocation?: { latitude: number; longitude: number; accuracy: number };
    photos?: { fileName: string; storageKey: string; mimeType: string }[];
  }) {
    const form = await this.getForm(id);
    
    // Prepare photo data for storage
    let photoRecords = [];
    if (metadata.photos && metadata.photos.length > 0) {
      for (const photo of metadata.photos) {
        photoRecords.push(this.prisma.formPhoto.create({
          data: {
            documentId: id,
            fileName: photo.fileName,
            storageKey: photo.storageKey,
            mimeType: photo.mimeType,
            sizeBytes: 0, // Would be set on upload
            capturedAt: new Date(),
            caption: null,
          },
        }));
      }
    }
    
    // Set sync status based on offline mode
    const syncStatus = metadata.offlineMode ? 'PENDING' : 'SYNCED';
    
    return this.prisma.fieldForm.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedBy,
        updatedAt: new Date(),
        // Store metadata as JSON
        metadata: JSON.stringify({
          offlineMode: metadata.offlineMode,
          gpsLocation: metadata.gpsLocation,
          photoCount: metadata.photos?.length ?? 0,
          syncStatus,
        }),
      },
    });
  }

  // ---------------- form approval

  async approveForm(id: string, approvedBy: string) {
    const form = await this.getForm(id);
    return this.prisma.fieldForm.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ---------------- form rejection

  async rejectForm(id: string, approvedBy: string, rejectionReason: string) {
    const form = await this.getForm(id);
    return this.prisma.fieldForm.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy,
        updatedAt: new Date(),
      },
    });
  }

  // ---------------- forms by type

  async listFormsByType(formType: string, projectId?: string) {
    const where: any = { formType };
    if (projectId) where.projectId = projectId;
    return this.prisma.fieldForm.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------- forms by project

  async listFormsByProject(projectId: string) {
    return this.listForms({ projectId, limit: 100 });
  }

  // ---------------- forms by employee

  async listFormsByEmployee(employeeId: string, from?: Date, to?: Date) {
    return this.listForms({ employeeId, from, to, limit: 100 });
  }

  // ---------------- offline sync handler

  async handleOfflineSync(userId: string, formIds: string[]) {
    const results = [];
    
    for (const formId of formIds) {
      const form = await this.getForm(formId);
      const metadata = JSON.parse(form.metadata ?? '{}');
      
      if (metadata.offlineMode && metadata.syncStatus === 'PENDING') {
        // Mark as synced
        await this.prisma.fieldForm.update({
          where: { id: formId },
          data: {
            metadata: JSON.stringify({
              ...metadata,
              syncStatus: 'SYNCED',
              syncedAt: new Date(),
              syncedBy: userId,
            }),
          },
        });
        results.push({ formId, status: 'SYNCED' });
      } else {
        results.push({ formId, status: 'ALREADY_SYNCED' });
      }
    }
    return results;
  }

  // ---------------- get forms pending sync

  async getFormsPendingSync() {
    // Return forms that were captured offline and need sync
    // For now, return forms with offline metadata flag
    return this.prisma.fieldForm.findMany({
      where: {
        metadata: {
          has: 'offlineMode',
        },
      },
      take: 50,
    });
  }
}