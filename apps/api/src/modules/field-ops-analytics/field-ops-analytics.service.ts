import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
@Injectable()
export class FieldOpsAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Get Field Operations Analytics Summary

  async getAnalyticsSummary(
    periodFrom?: Date,
    periodTo?: Date
  ) {
    const from = periodFrom ?? new Date(new Date().setMonth(new Date().getMonth() - 3));
    const to = periodTo ?? new Date();

    // Get field forms in period
    const forms = await this.prisma.fieldForm.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        formType: true,
        status: true,
        createdAt: true,
        projectId: true,
      },
    });

    // Calculate summaries
    const totalForms = forms.length;
    const submittedForms = forms.filter((f) => f.status === 'SUBMITTED').length;
    const approvedForms = forms.filter((f) => f.status === 'APPROVED').length;
    const draftForms = forms.filter((f) => f.status === 'DRAFT').length;

    // Forms by type
    const formsByType = this.calculateFormsByType(forms);

    // Offline sync stats
    const offlineForms = forms.filter((f) => {
      const metadata = JSON.parse(f.metadata ?? '{}');
      return metadata.offlineMode;
    }).length;

    // Average form completion time (simplified)
    const averageCompletionTime = 0; // Would calculate from form timestamps

    // Form completion rate
    const completionRate = totalForms > 0 ? (submittedForms / totalForms) * 100 : 100;

    // Form types distribution
    const formTypeDistribution = this.calculateFormTypeDistribution(forms);

    // Project-wise form submissions
    const projectWiseForms = this.calculateProjectWiseForms(forms);

    return {
      periodFrom: from,
      periodTo: to,
      totalForms,
      submittedForms,
      approvedForms,
      draftForms,
      completionRate: Math.round(completionRate * 100) / 100,
      formsByType,
      offlineForms,
      averageCompletionTime,
      formTypeDistribution,
      projectWiseForms,
    };
  }

  private calculateFormsByType(forms: any[]) {
    const distribution: Record<string, number> = {
      DAILY_REPORT: 0,
      SAFETY_CHECK: 0,
      PROGRESS_BILL: 0,
      ATTENDANCE: 0,
      INSPECTION: 0,
      CUSTOM: 0,
    };

    for (const form of forms) {
      const type = form.formType ?? 'CUSTOM';
      if (distribution[type] !== undefined) {
        distribution[type] += 1;
      }
    }

    return distribution;
  }

  private calculateFormTypeDistribution(forms: any[]) {
    // Return percentage distribution
    const total = forms.length;
    return total > 0
      ? forms.reduce((acc, form) => {
          const type = form.formType ?? 'CUSTOM';
          acc[type] = (acc[type] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {};
  }

  private calculateProjectWiseForms(forms: any[]) {
    const projectForms: Record<string, number> = {};
    for (const form of forms) {
      const projectId = form.projectId ?? 'uncategorized';
      projectForms[projectId] = (projectForms[projectId] ?? 0) + 1;
    }
    return projectForms;
  }
}