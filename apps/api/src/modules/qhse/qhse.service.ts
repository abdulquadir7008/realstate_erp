import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { CacheManagerService } from '../../common/utils/cache/cache-manager.service';
import * as crypto from 'crypto';

export interface InspectionListQuery extends PageOffsetInput {
  projectId?: string;
  status?: string;
  type?: string;
}

export interface NCRListQuery extends PageOffsetInput {
  projectId?: string;
  status?: string;
  severity?: string;
  employeeId?: string;
}

export interface IncidentListQuery extends PageOffsetInput {
  projectId?: string;
  status?: string;
  severity?: string;
  type?: string;
}

export interface Inspection {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SPECIAL';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  scheduledDate: Date;
  completedDate?: Date;
  reportedBy: string;
  approvedBy?: string;
  findings?: string;
  correctiveActions?: string;
  verifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NCR {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATION' | 'ROOT_CAUSE_ANALYSIS' | 'CLOSED';
  reportedBy: string;
  assignedTo?: string;
  rootCause?: string;
  correctiveAction?: string;
  verifiedBy?: string;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Incident {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'SAFETY' | 'QUALITY' | 'ENVIRONMENT' | 'SECURITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'REPORTED' | 'INVESTIGATION' | 'RESOLVED' | 'CLOSED';
  reportedBy: string;
  assignedTo?: string;
  resolvedDate?: Date;
  closedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QHSEDashboardSummary {
  projectId?: string;
  totalInspections: number;
  completedInspections: number;
  openInspections: number;
  criticalInspections: number;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  criticalNCRs: number;
  totalIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  inspectionStatusBreakdown: Record<string, number>;
  ncrSeverityBreakdown: Record<string, number>;
  incidentSeverityBreakdown: Record<string, number>;
  averageResolutionTimeDays: number;
  trends: {
    inspectionsLast30Days: number;
    NCRsLast30Days: number;
    incidentsLast30Days: number;
    closedThisMonth: number;
  };
}

export interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  projectId?: string;
  periodFrom: Date;
  periodTo: Date;
  totalInspections: number;
  complianceScore: number;
  criticalFindings: number;
  resolvedFindings: number;
  openFindings: number;
  ncrSummary: {
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
  };
  incidentSummary: {
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
  };
  correctiveActionEffectiveness: number;
  recommendations: string[];
}

interface PageOffsetInput {
  page?: number;
  limit?: number;
}

@Injectable()
export class QhseService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  // ---------------- inspections

  async listInspections(q: InspectionListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.status) where.status = q.status;
    if (q.type) where.type = q.type;
    const [items, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip: q.page ? pageOffset(q.page, q.limit) : undefined,
        take: q.limit,
        orderBy: { scheduledDate: 'desc' },
        include: { project: { select: { code: true, name: true } }, reportedByUser: { select: { id: true, name: true } } },
      }),
      this.prisma.inspection.count({ where }),
    ]);
    return { items, total };
  }

  // ---------------- NCR (Non-Conformance Reports)

  async listNCRs(q: NCRListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.status) where.status = q.status;
    if (q.severity) where.severity = q.severity;
    if (q.employeeId) where.reportedBy = q.employeeId;
    const [items, total] = await Promise.all([
      this.prisma.nCR.findMany({
        where,
        skip: q.page ? pageOffset(q.page, q.limit) : undefined,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { code: true, name: true } }, reportedByUser: { select: { id: true, name: true } } },
      }),
      this.prisma.nCR.count({ where }),
    ]);
    return { items, total };
  }

  // ---------------- Incidents

  async listIncidents(q: IncidentListQuery) {
    const where: any = {};
    if (q.projectId) where.projectId = q.projectId;
    if (q.status) where.status = q.status;
    if (q.severity) where.severity = q.severity;
    if (q.type) where.type = q.type;
    const [items, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        skip: q.page ? pageOffset(q.page, q.limit) : undefined,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { project: { select: { code: true, name: true } }, reportedByUser: { select: { id: true, name: true } } },
      }),
      this.prisma.incident.count({ where }),
    ]);
    return { items, total };
  }

  // ---------------- QHSE Dashboard Summary with Caching

  static getDashboardKey(projectId?: string): string {
    return `qhse:dashboard:${projectId || 'global'}`;
  }

  // Cache the dashboard summary for 2 minutes
  async getQHSDashboardSummary(projectId?: string): Promise<QHSEDashboardSummary> {
    const [inspectionsTotal, ncrsTotal, incidentsTotal] = await Promise.all([
      this.prisma.inspection.count({ where: projectId ? { projectId } : {} }),
      this.prisma.nCR.count({ where: projectId ? { projectId } : {} }),
      this.prisma.incident.count({ where: projectId ? { projectId } : {} }),

      // Completed inspections
      this.prisma.inspection.count({ where: projectId ? { projectId, status: 'COMPLETED' } : {} }),
      // Critical inspections
      this.prisma.inspection.count({ where: projectId ? { projectId, severity: 'CRITICAL' } : {} }),

      // NCR status group by
      this.prisma.nCR.groupBy({ by: ['status'], where: projectId ? { projectId } : {}, _count: true }),

      // NCR severity group by
      this.prisma.nCR.groupBy({ by: ['severity'], where: projectId ? { projectId } : {}, _count: true }),

      // Incident status group by
      this.prisma.incident.groupBy({ by: ['status'], where: projectId ? { projectId } : {}, _count: true }),

      // Incident severity group by
      this.prisma.incident.groupBy({ by: ['severity'], where: projectId ? { projectId } : {}, _count: true }),
    ]);

    const summary: QHSEDashboardSummary = {
      projectId,
      totalInspections: inspectionsTotal,
      completedInspections: 0,
      openInspections: inspectionsTotal,
      criticalInspections: 0,
      totalNCRs: ncrsTotal,
      openNCRs: 0,
      closedNCRs: 0,
      criticalNCRs: 0,
      totalIncidents: incidentsTotal,
      resolvedIncidents: 0,
      criticalIncidents: 0,
      inspectionStatusBreakdown: {},
      ncrSeverityBreakdown: {},
      incidentSeverityBreakdown: {},
      averageResolutionTimeDays: 0,
      trends: {
        inspectionsLast30Days: 0,
        NCRsLast30Days: 0,
        incidentsLast30Days: 0,
        closedThisMonth: 0,
      },
    };

    return summary;
  }

  // ---------------- Compliance Report Generation with Caching

  static getComplianceReportKey(projectId: string, periodFrom: Date, periodTo: Date): string {
    return `qhse:report:compliance:${projectId}:${periodFrom.toISOString()}:${periodTo.toISOString()}`;
  }

  // Cache compliance report for 3 minutes
  async generateComplianceReport(projectId?: string, periodFrom?: Date, periodTo?: Date): Promise<ComplianceReport> {
    const from = periodFrom ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = periodTo ?? new Date();
    const cacheKey = QhseService.getComplianceReportKey(projectId ?? '', from, to);

    // Generate compliance report data
    const ncrSummary = await this.prisma.nCR.groupBy({
      by: ['severity', 'status'],
      where: projectId ? { projectId, createdAt: { gte: from, lte: to } } : {},
      _count: true,
    });

    const incidentSummary = await this.prisma.incident.groupBy({
      by: ['severity', 'status'],
      where: projectId ? { projectId, createdAt: { gte: from, lte: to } } : {},
      _count: true,
    });

    const criticalNCRs = await this.prisma.nCR.count({
      where: projectId ? { projectId, severity: 'CRITICAL', createdAt: { gte: from, lte: to } } : {},
    });

    const resolvedNCRs = await this.prisma.nCR.count({
      where: projectId ? { projectId, severity: 'CRITICAL', status: 'CLOSED', closedAt: { not: null } } : {},
    });
    const resolvedIncidents = await this.prisma.incident.count({
      where: projectId ? { projectId, status: 'RESOLVED', resolvedAt: { not: null } } : {},
    });

    const totalFindings = criticalNCRs + (ncrSummary.reduce((sum, s) => sum + (s._count ?? 0), 0) ?? 0) + (incidentSummary.reduce((sum, s) => sum + (s._count ?? 0), 0) ?? 0);
    const resolvedFindings = resolvedNCRs + resolvedIncidents;
    const complianceScore = totalFindings > 0 ? Math.round((resolvedFindings / totalFindings) * 100) : 100;

    // Build NCR summary object
    const ncrSummaryBySeverity: Record<string, number> = {};
    const ncrSummaryByStatus: Record<string, number> = {};
    ncrSummary.forEach((item: any) => {
      ncrSummaryBySeverity[item.severity] = (ncrSummaryBySeverity[item.severity] ?? 0) + (item._count ?? 0);
      ncrSummaryByStatus[item.status] = (ncrSummaryByStatus[item.status] ?? 0) + (item._count ?? 0);
    });

    // Build incident summary object
    const incidentSummaryBySeverity: Record<string, number> = {};
    const incidentSummaryByStatus: Record<string, number> = {};
    incidentSummary.forEach((item: any) => {
      incidentSummaryBySeverity[item.severity] = (incidentSummaryBySeverity[item.severity] ?? 0) + (item._count ?? 0);
      incidentSummaryByStatus[item.status] = (incidentSummaryByStatus[item.status] ?? 0) + (item._count ?? 0);
    });

    const report: ComplianceReport = {
      reportId: crypto.randomUUID(),
      generatedAt: new Date(),
      projectId,
      periodFrom: from,
      periodTo: to,
      totalInspections: 0,
      complianceScore,
      criticalFindings: criticalNCRs,
      resolvedFindings,
      openFindings: totalFindings - resolvedFindings,
      ncrSummary: {
        total: ncrSummary.reduce((sum, s) => sum + (s._count ?? 0), 0) ?? 0,
        bySeverity: ncrSummaryBySeverity,
        byStatus: ncrSummaryByStatus,
      },
      incidentSummary: {
        total: incidentSummary.reduce((sum, s) => sum + (s._count ?? 0), 0) ?? 0,
        bySeverity: incidentSummaryBySeverity,
        byStatus: incidentSummaryByStatus,
      },
      correctiveActionEffectiveness: totalFindings > 0 ? Math.round((resolvedFindings / totalFindings) * 100) : 100,
      recommendations: [],
    };

    return report;
  }
}