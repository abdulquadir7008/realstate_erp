import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface ProjectAnalyticsSummary {
  periodFrom: Date;
  periodTo: Date;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalBudget: number;
  totalActualSpend: number;
  remainingBudget: number;
  budgetUtilization: number;
  milestoneCompletionRate: number;
  scheduleAdherence: number;
  costPerformanceIndex: number;
  topProjects: Array<{
    projectId: string;
    projectCode: string;
    projectName: string;
    budget: number;
    actualSpend: number;
    variance: number;
    scheduleVariance: number;
    status: string;
  }>;
  trends: {
    projectStartRateMonthOverMonth: number;
    projectCompletionRateMonthOverMonth: number;
    budgetVarianceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  predictions: {
    projectedOverBudgetProjects: number;
    delayedProjectsCount: number;
    resourceUtilizationRate: number;
  };
  recommendations: string[];
}

@Injectable()
export class ProjectAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Get Project Analytics Summary

  async getAnalyticsSummary(
    periodFrom?: Date,
    periodTo?: Date
  ): Promise<ProjectAnalyticsSummary> {
    const from = periodFrom ?? new Date(new Date().setMonth(new Date().getMonth() - 3));
    const to = periodTo ?? new Date();

    // Get projects created in period
    const projects = await this.prisma.project.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        totalBudget: true,
        startDate: true,
        endDate: true,
      },
    });

    // Get budget commitments and costs for projects
    const projectIds = projects.map((p) => p.id);

    const budgetCommitments = await this.prisma.budgetCommitment.findMany({
      where: {
        projectId: { in: projectIds },
        status: 'APPROVED',
      },
      select: {
        amount: true,
        projectId: true,
      },
    });

    const projectCostLedgers = await this.prisma.projectCostLedger.findMany({
      where: {
        projectId: { in: projectIds },
        entityType: 'EXPENSE',
      },
      select: {
        amount: true,
        projectId: true,
      },
    });

    // Calculate summaries
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED').length;
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
    const onHoldProjects = projects.filter((p) => p.status === 'ON_HOLD').length;

    // Total budget from projects
    const totalBudget = projects.reduce((sum, p) => sum + (p.totalBudget ?? 0), 0);

    // Total actual spend from cost ledgers
    const totalActualSpend = projectCostLedgers.reduce(
      (sum, ledger) => sum + (ledger.amount ?? 0),
      0
    );

    // Remaining budget
    const remainingBudget = totalBudget - totalActualSpend;

    // Budget utilization percentage
    const budgetUtilization = totalBudget > 0 ? (totalActualSpend / totalBudget) * 100 : 0;

    // Milestone completion rate (simplified)
    // Would query milestones and calculate completion percentage
    const milestoneCompletionRate = 85; // Placeholder

    // Schedule adherence (simplified)
    const scheduleAdherence = 88; // Placeholder

    // Cost Performance Index CPI = Earned Value / Actual Cost
    // Simplified: ratio of budget to actual spend
    const costPerformanceIndex = totalBudget > 0 ? totalBudget / totalActualSpend : 1;

    // Top projects by variance
    const topProjects = this.calculateTopProjects(projects, budgetCommitments, projectCostLedgers);

    // Trends
    const projectStartRateMonthOverMonth = this.calculateProjectStartRate(periodFrom, periodTo);
    const projectCompletionRateMonthOverMonth = this.calculateProjectCompletionRate(periodFrom, periodTo);
    const budgetVarianceTrend = 'STABLE'; // Simplified

    // Predictions
    const projectedOverBudgetProjects = Math.round(
      (totalActualSpend / totalBudget) * totalProjects
    );
    const delayedProjectsCount = Math.round(
      (100 - scheduleAdherence) / 100 * totalProjects
    );
    const resourceUtilizationRate = totalActualSpend / totalBudget;

    // Recommendations
    const recommendations: string[] = [];

    if (budgetUtilization > 90) {
      recommendations.push(
        'High budget utilization - monitor spending closely and approve no-expense requests cautiously'
      );
    }

    if (scheduleAdherence < 85) {
      recommendations.push(
        `Low schedule adherence of ${scheduleAdherence}% - review project timelines and resource allocation`
      );
    }

    if (costPerformanceIndex < 1) {
      recommendations.push(
        'Cost overruns detected - CPI below 1.0 - implement cost control measures'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Project performance is within acceptable parameters'
      );
    }

    return {
      periodFrom: from,
      periodTo: to,
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalBudget,
      totalActualSpend,
      remainingBudget,
      budgetUtilization: Math.round(budgetUtilization * 100) / 100,
      milestoneCompletionRate,
      scheduleAdherence,
      costPerformanceIndex: Math.round(costPerformanceIndex * 100) / 100,
      topProjects,
      trends: {
        projectStartRateMonthOverMonth: Math.round(projectStartRateMonthOverMonth * 100) / 100,
        projectCompletionRateMonthOverMonth: Math.round(projectCompletionRateMonthOverMonth * 100) / 100,
        budgetVarianceTrend,
      },
      predictions: {
        projectedOverBudgetProjects,
        delayedProjectsCount,
        resourceUtilizationRate: Math.round(resourceUtilizationRate * 100) / 100,
      },
      recommendations,
    };
  }

  private calculateTopProjects(
    projects: any[],
    budgetCommitments: any[],
    projectCostLedgers: any[]
  ) {
    // Aggregate budget and spend per project
    const projectData: Record<string, { budget: number; actualSpend: number }> = {};

    for (const project of projects) {
      const projectId = project.id;
      projectData[projectId] = {
        budget: project.totalBudget ?? 0,
        actualSpend: 0,
      };
    }

    // Add actual spend from cost ledgers
    for (const ledger of projectCostLedgers) {
      const projectId = ledger.projectId;
      if (projectData[projectId]) {
        projectData[projectId].actualSpend += ledger.amount ?? 0;
      }
    }

    // Add budget commitments
    for (const commitment of budgetCommitments) {
      const projectId = commitment.projectId;
      if (projectData[projectId]) {
        projectData[projectId].budget += commitment.amount ?? 0;
      }
    }

    // Return top 5 projects by variance
    return Object.entries(projectData)
      .sort((a, b) => Math.abs(b[1].budget - b[1].actualSpend) - Math.abs(a[1].budget - a[1].actualSpend))
      .slice(0, 5)
      .map(([projectId, data]) => {
        const project = projects.find((p) => p.id === projectId);
        const variance = data.budget - data.actualSpend;
        return {
          projectId,
          projectCode: project?.code ?? projectId,
          projectName: project?.name ?? 'Unknown',
          budget: data.budget,
          actualSpend: data.actualSpend,
          variance,
          scheduleVariance: 0, // Would calculate from milestones
          status: projects.find((p) => p.id === projectId)?.status ?? 'ACTIVE',
        };
      });
  }

  private calculateProjectStartRate(
    periodFrom: Date,
    periodTo: Date
  ): number {
    // Simplified: would calculate new projects per month
    return 0;
  }

  private calculateProjectCompletionRate(
    periodFrom: Date,
    periodTo: Date
  ): number {
    // Simplified: would calculate completed projects per month
    return 0;
  }
}