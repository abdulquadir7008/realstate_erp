import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import * as crypto from 'crypto';

export interface QHSEAnalyticsSummary {
  projectId?: string;
  periodFrom: Date;
  periodTo: Date;
  totalInspections: number;
  completedInspections: number;
  openInspections: number;
  criticalInspections: number;
  averageInspectionDurationDays: number;
  ncrSummary: {
    total: number;
    opened: number;
    closed: number;
    critical: number;
    averageResolutionTimeDays: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
  };
  incidentSummary: {
    total: number;
    reported: number;
    resolved: number;
    critical: number;
    averageResolutionTimeDays: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
  };
  complianceScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  trends: {
    inspectionsLast30Days: number;
    NCRsLast30Days: number;
    incidentsLast30Days: number;
    closuresThisMonth: number;
    severityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  recommendations: string[];
  predictiveInsights: {
    highRiskAreas: string[];
    predictedIncidentsNext30Days: number;
    predictedNCRsNext30Days: number;
    safetyImprovementAreas: string[];
  };
}

@Injectable()
export class QhseAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Get QHSE Analytics Summary

  async getAnalyticsSummary(
    projectId?: string,
    periodFrom?: Date,
    periodTo?: Date
  ): Promise<QHSEAnalyticsSummary> {
    const from = periodFrom ?? new Date(new Date().setMonth(new Date().getMonth() - 1));
    const to = periodTo ?? new Date();

    // Get inspections
    const inspections = await this.prisma.inspection.findMany({
      where: projectId ? { projectId, createdAt: { gte: from, lte: to } } : {},
    });

    // Get NCRs
    const ncrs = await this.prisma.nCR.findMany({
      where: projectId ? { projectId, createdAt: { gte: from, lte: to } } : {},
    });

    // Get Incidents
    const incidents = await this.prisma.incident.findMany({
      where: projectId ? { projectId, createdAt: { gte: from, lte: to } } : {},
    });

    // Calculate summaries
    const totalInspections = inspections.length;
    const completedInspections = inspections.filter(
      (i) => i.status === 'CLOSED'
    ).length;
    const openInspections = totalInspections - completedInspections;
    const criticalInspections = inspections.filter(
      (i) => i.severity === 'CRITICAL'
    ).length;

    const totalNCRs = ncrs.length;
    const closedNCRs = ncrs.filter((n) => n.status === 'CLOSED').length;
    const openNCRs = totalNCRs - closedNCRs;
    const criticalNCRs = ncrs.filter((n) => n.severity === 'CRITICAL').length;

    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(
      (i) => i.status === 'RESOLVED'
    ).length;
    const criticalIncidents = incidents.filter(
      (i) => i.severity === 'CRITICAL'
    ).length;

    // Calculate compliance score
    let complianceScore = 100;
    const riskFactors: number[] = [];

    if (criticalInspections > 0) {
      complianceScore -= criticalInspections * 10;
      riskFactors.push(criticalInspections * 10);
    }

    if (criticalNCRs > 0) {
      complianceScore -= criticalNCRs * 10;
      riskFactors.push(criticalNCRs * 10);
    }

    if (criticalIncidents > 0) {
      complianceScore -= criticalIncidents * 10;
      riskFactors.push(criticalIncidents * 10);
    }

    const openFindings =
      openInspections + openNCRs + (totalIncidents - resolvedIncidents);
    if (openFindings > 10) complianceScore -= 5;
    if (openFindings > 20) complianceScore -= 10;

    complianceScore = Math.max(complianceScore, 0);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (complianceScore <= 30) riskLevel = 'CRITICAL';
    else if (complianceScore <= 60) riskLevel = 'HIGH';
    else if (complianceScore <= 80) riskLevel = 'MEDIUM';

    // Calculate trends
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inspectionsLast30Days = inspections.filter(
      (i) => new Date(i.createdAt) >= thirtyDaysAgo
    ).length;

    const NCRsLast30Days = ncrs.filter(
      (n) => new Date(n.createdAt) >= thirtyDaysAgo
    ).length;

    const incidentsLast30Days = incidents.filter(
      (i) => new Date(i.createdAt) >= thirtyDaysAgo
    ).length;

    const closuresThisMonth = incidents.filter(
      (i) =>
        i.status === 'RESOLVED' &&
        new Date(i.resolvedAt ?? new Date()) >=
          new Date(new Date().setDate(new Date().getDate() - 30))
    ).length;

    // Determine severity trend
    const severityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE'; // Simplified

    // Generate recommendations
    const recommendations: string[] = [];

    if (criticalInspections > 0) {
      recommendations.push(
        `${criticalInspections} critical inspection(s) - conduct immediate safety audit`
      );
    }

    if (criticalNCRs > 0) {
      recommendations.push(
        `${criticalNCRs} critical NCR(s) - root cause analysis and corrective action required`
      );
    }

    if (criticalIncidents > 0) {
      recommendations.push(
        `${criticalIncidents} critical incident(s) - emergency response review required`
      );
    }

    if (openFindings > 5) {
      recommendations.push(
        `${openFindings} open finding(s) - prioritize resolution plan`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('QHSE compliance is within acceptable parameters');
    }

    // Predictive insights
    const predictedIncidentsNext30Days =
      Math.round((criticalIncidents / Math.max(1, totalIncidents + 1)) * 30);
    const predictedNCRsNext30Days =
      Math.round((criticalNCRs / Math.max(1, totalNCRs + 1)) * 30);

    const highRiskAreas: string[] = [];
    if (criticalInspections > 0) highRiskAreas.push('Critical inspection areas');
    if (criticalNCRs > 0) highRiskAreas.push('Critical NCR areas');
    if (criticalIncidents > 0) highRiskAreas.push('Critical incident areas');

    const safetyImprovementAreas: string[] = [];
    if (openFindings > 0)
      safetyImprovementAreas.push(
        `${openFindings} open finding(s) - implement corrective actions`
      );
    if (criticalInspections > 0)
      safetyImprovementAreas.push(
        `${criticalInspections} critical inspection(s) - review safety protocols`
      );
    if (criticalIncidents > 0)
      safetyImprovementAreas.push(
        `${criticalIncidents} critical incident(s) - emergency response training`
      );

    return {
      projectId,
      periodFrom: from,
      periodTo: to,
      totalInspections,
      completedInspections,
      openInspections,
      criticalInspections,
      averageInspectionDurationDays: 0, // Would calculate from data
      ncrSummary: {
        total: totalNCRs,
        opened: openNCRs,
        closed: closedNCRs,
        critical: criticalNCRs,
        averageResolutionTimeDays: 0, // Would calculate from data
        bySeverity: this.calculateSeverityDistribution(ncrs),
        byStatus: this.calculateStatusDistribution(ncrs),
      },
      incidentSummary: {
        total: totalIncidents,
        reported: totalIncidents, // All incidents are 'reported' initially
        resolved: resolvedIncidents,
        critical: criticalIncidents,
        averageResolutionTimeDays: 0, // Would calculate from data
        bySeverity: this.calculateSeverityDistribution(incidents),
        byStatus: this.calculateStatusDistribution(incidents),
      },
      complianceScore: Math.round(complianceScore),
      riskLevel,
      trends: {
        inspectionsLast30Days,
        NCRsLast30Days,
        incidentsLast30Days,
        closuresThisMonth,
        severityTrend,
      },
      recommendations,
      predictiveInsights: {
        highRiskAreas,
        predictedIncidentsNext30Days,
        predictedNCRsNext30Days,
        safetyImprovementAreas,
      },
    };
  }

  private calculateSeverityDistribution(items: any[]) {
    const distribution: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const item of items) {
      const severity = item.severity ?? 'LOW';
      if (distribution[severity] !== undefined) {
        distribution[severity] += 1;
      }
    }

    return distribution;
  }

  private calculateStatusDistribution(items: any[]) {
    const distribution: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      CLOSED: 0,
      RESOLVED: 0,
    };

    for (const item of items) {
      const status = item.status ?? 'OPEN';
      if (distribution[status] !== undefined) {
        distribution[status] += 1;
      }
    }

    return distribution;
  }
}