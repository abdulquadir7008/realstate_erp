import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { Fld001Service } from '../fld-001/fld-001.service';

@Injectable()
export class FieldOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fld001Service: Fld001Service
  ) {}

  // ---------------- Field Form Submission to QHSE

  async submitFieldFormWithQHSE(input: {
    formType: 'DAILY_REPORT' | 'SAFETY_CHECK' | 'PROGRESS_BILL' | 'ATTENDANCE' | 'INSPECTION' | 'CUSTOM';
    projectId: string;
    title: string;
    data: Record<string, any>;
    submittedBy: string;
    gpsLocation?: { latitude: number; longitude: number; accuracy: number };
    photos?: { fileName: string; storageKey: string; mimeType: string }[];
    offlineMode: boolean;
  }) {
    // 1. Create the field form
    const form = await this.fld001Service.createForm({
      formType: input.formType,
      projectId: input.projectId,
      title: input.title,
      data: input.data,
      submittedBy: input.submittedBy,
    });

    // 2. If GPS location provided, create QHSE incident if safety issue
    if (input.gpsLocation && input.formType === 'SAFETY_CHECK') {
      const incident = await this.prisma.incident.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: JSON.stringify(input.data),
          type: 'SAFETY',
          severity: 'MEDIUM',
          status: 'REPORTED',
          reportedBy: input.submittedBy,
          resolvedDate: null,
          closedDate: null,
        },
      });

      return {
        form,
        incident,
        message: 'Safety check submitted with incident creation',
      };
    }

    // 3. If photos provided and form type is inspection, create QHSE inspection
    if (input.photos && input.formType === 'INSPECTION') {
      const qhseInspection = await this.prisma.inspection.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          description: JSON.stringify(input.data),
          type: 'DAILY',
          severity: 'LOW',
          status: 'PLANNED',
          scheduledDate: new Date(),
          reportedBy: input.submittedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return {
        form,
        inspection: qhseInspection,
        message: 'Inspection form submitted with QHSE inspection creation',
      };
    }

    return {
      form,
      message: 'Field form submitted successfully',
    };
  }

  // ---------------- Get Field Form with QHSE Context

  async getFormWithQHSEContext(formId: string) {
    const form = await this.fld001Service.getForm(formId);

    // Get related QHSE data for the project
    const projectId = form.projectId;

    const [ncrCount, incidentCount, inspectionCount] = await Promise.all([
      this.prisma.nCR.count({ where: { projectId } }),
      this.prisma.incident.count({ where: { projectId } }),
      this.prisma.inspection.count({ where: { projectId } }),
    ]);

    return {
      form,
      qhseContext: {
        projectId,
        ncrCount,
        incidentCount,
        inspectionCount,
        hasRelatedQHSE: ncrCount > 0 || incidentCount > 0 || inspectionCount > 0,
      },
    };
  }

  // ---------------- Sync Offline Forms with QHSE

  async syncOfflineFormsWithQHSE(userId: string, formIds: string[]) {
    const results = [];

    for (const formId of formIds) {
      const form = await this.fld001Service.getForm(formId);
      const metadata = JSON.parse(form.metadata ?? '{}');

      if (metadata.offlineMode) {
        // Create QHSE records based on form data
        let createdItem = null;

        if (form.formType === 'SAFETY_CHECK') {
          createdItem = await this.prisma.incident.create({
            data: {
              projectId: form.projectId,
              title: form.title,
              description: JSON.stringify(form.data),
              type: 'SAFETY',
              severity: 'MEDIUM',
              status: 'RESOLVED',
              reportedBy: userId,
              resolvedDate: new Date(),
            },
          });
        } else if (form.formType === 'INSPECTION') {
          createdItem = await this.prisma.inspection.create({
            data: {
              projectId: form.projectId,
              title: form.title,
              description: JSON.stringify(form.data),
              type: 'DAILY',
              severity: 'LOW',
              status: 'CLOSED',
              reportedBy: userId,
              completedDate: new Date(),
            },
          });
        }

        results.push({
          formId,
          status: 'SYNCED',
          qhseItemId: createdItem?.id,
        });
      } else {
        results.push({
          formId,
          status: 'ALREADY_SYNCED',
        });
      }
    }

    return results;
  }
}