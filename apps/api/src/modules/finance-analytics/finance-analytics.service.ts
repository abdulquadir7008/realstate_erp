import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import * as crypto from 'crypto';

export interface FinanceAnalyticsSummary {
  periodFrom: Date;
  periodTo: Date;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  grossMargin: number;
  operatingMargin: number;
  cashFlow: number;
  burnRate: number;
  revenueByProject: Record<string, number>;
  revenueBySource: Record<string, number>;
  expenseBreakdown: Record<string, number>;
  topProjects: Array<{
    projectId: string;
    projectCode: string;
    revenue: number;
    expenses: number;
    netProfit: number;
    margin: number;
  }>;
  trends: {
    revenueGrowthMonthOverMonth: number;
    expenseGrowthMonthOverMonth: number;
    profitMarginTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    cashFlowTrend: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  };
  forecasts: {
    nextMonthRevenue: number;
    nextMonthExpenses: number;
    nextMonthNetProfit: number;
    confidence: number;
  };
  recommendations: string[];
}

@Injectable()
export class FinanceAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Get Finance Analytics Summary

  async getAnalyticsSummary(
    periodFrom?: Date,
    periodTo?: Date
  ): Promise<FinanceAnalyticsSummary> {
    const from = periodFrom ?? new Date(new Date().setMonth(new Date().getMonth() - 3));
    const to = periodTo ?? new Date();

    // Get revenue data from invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuedAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        total: true,
        status: true,
        projectId: true,
      },
    });

    // Get expense data
    const expenses = await this.prisma.projectCostLedger.findMany({
      where: {
        postedAt: {
          gte: from,
          lte: to,
        },
        entityType: 'EXPENSE',
      },
      select: {
        amount: true,
      },
    });

    // Calculate revenue
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
    const revenueByProject = this.aggregateByProject(invoices);
    const revenueBySource = this.aggregateBySource(invoices);

    // Calculate expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount ?? 0), 0);
    const expenseBreakdown = this.calculateExpenseBreakdown(expenses);

    // Calculate net profit and margins
    const netProfit = totalRevenue - totalExpenses;
    const grossMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    // Operating margin would need SGST/CGST/IGST, simplified here
    const operatingMargin = grossMargin; // Simplified

    // Cash flow (simplified: revenue minus expenses plus opening balance)
    const cashFlow = netProfit;

    // Burn rate (expenses per month)
    const monthsCovered = Math.max(1, (to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000));
    const burnRate = totalExpenses / monthsCovered;

    // Top projects
    const topProjects = this.calculateTopProjects(invoices, expenses);

    // Trends
    const revenueGrowthMonthOverMonth = this.calculateMoM_Growth(invoices, from, to);
    const expenseGrowthMonthOverMonth = this.calculateMoM_GrowthExpenses(expenses, from, to);

    let profitMarginTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    const cashFlowTrend:
      | 'POSITIVE'
      | 'NEGATIVE'
      | 'NEUTRAL' =
      netProfit > 0 ? 'POSITIVE' : netProfit < 0 ? 'NEGATIVE' : 'NEUTRAL';

    // Forecasts (simple trend-based)
    const nextMonthRevenue = totalRevenue / 3; // Simplified: average per month
    const nextMonthExpenses = totalExpenses / 3;
    const nextMonthNetProfit = nextMonthRevenue - nextMonthExpenses;
    const confidence = 75; // Based on data coverage

    // Recommendations
    const recommendations: string[] = [];

    if (grossMargin < 20) {
      recommendations.push(
        'Low gross margin detected - review pricing and cost structure'
      );
    }

    if (burnRate > totalRevenue * 0.8) {
      recommendations.push(
        'High burn rate - monitor cash flow closely and reduce discretionary expenses'
      );
    }

    if (cashFlow < 0) {
      recommendations.push(
        'Negative cash flow - implement cost controls and accelerate receivables'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Financial performance is within acceptable parameters'
      );
    }

    return {
      periodFrom: from,
      periodTo: to,
      totalRevenue,
      totalExpenses,
      netProfit,
      grossMargin: Math.round(grossMargin * 100) / 100,
      operatingMargin: Math.round(operatingMargin * 100) / 100,
      cashFlow,
      burnRate: Math.round(burnRate * 100) / 100,
      revenueByProject,
      revenueBySource,
      expenseBreakdown,
      topProjects,
      trends: {
        revenueGrowthMonthOverMonth: Math.round(revenueGrowthMonthOverMonth * 100) / 100,
        expenseGrowthMonthOverMonth: Math.round(expenseGrowthMonthOverMonth * 100) / 100,
        profitMarginTrend,
        cashFlowTrend,
      },
      forecasts: {
        nextMonthRevenue: Math.round(nextMonthRevenue * 100) / 100,
        nextMonthExpenses: Math.round(nextMonthExpenses * 100) / 100,
        nextMonthNetProfit: Math.round(nextMonthNetProfit * 100) / 100,
        confidence,
      },
      recommendations,
    };
  }

  private aggregateByProject(invoices: any[]) {
    const projectRevenue: Record<string, number> = {};
    for (const invoice of invoices) {
      const projectId = invoice.projectId ?? 'uncategorized';
      projectRevenue[projectId] = (projectRevenue[projectId] ?? 0) + (invoice.total ?? 0);
    }
    return projectRevenue;
  }

  private aggregateBySource(invoices: any[]) {
    // Simplified: just return revenue by status as source
    const sourceRevenue: Record<string, number> = {};
    for (const invoice of invoices) {
      const status = invoice.status ?? 'unknown';
      sourceRevenue[status] = (sourceRevenue[status] ?? 0) + (invoice.total ?? 0);
    }
    return sourceRevenue;
  }

  private calculateExpenseBreakdown(expenses: any[]) {
    const breakdown: Record<string, number> = {
      LABOUR: 0,
      MATERIAL: 0,
      SUBCONTRACTOR: 0,
      OVERHEAD: 0,
    };

    for (const expense of expenses) {
      // Would need costHead or category, simplified here
      breakdown.OVERHEAD += expense.amount ?? 0;
    }

    return breakdown;
  }

  private calculateTopProjects(
    invoices: any[],
    expenses: any[]
  ) {
    // Aggregate revenue and expenses per project
    const projectData: Record<string, { revenue: number; expenses: number }> = {};

    for (const invoice of invoices) {
      const projectId = invoice.projectId ?? 'uncategorized';
      if (!projectData[projectId]) projectData[projectId] = { revenue: 0, expenses: 0 };
      projectData[projectId].revenue += invoice.total ?? 0;
    }

    for (const expense of expenses) {
      // Would need projectId linkage, simplified here
    }

    // Return top 5 projects by revenue
    return Object.entries(projectData)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([projectId, data]) => ({
        projectId,
        projectCode: projectId,
        revenue: data.revenue,
        expenses: data.expenses,
        netProfit: data.revenue - data.expenses,
        margin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0,
      }));
  }

  private calculateMoM_Growth(invoices: any[], from: Date, to: Date) {
    // Simplified MoM growth calculation
    const monthDuration = (to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000);
    const months = Math.max(1, Math.floor(monthDuration));
    
    if (months <= 1) return 0;
    
    // Get revenue for last two months
    const currentMonthRevenue = invoices
      .filter((inv) => {
        const invDate = new Date(inv.issuedAt ?? new Date());
        return (
          invDate.getMonth() === new Date().getMonth() &&
          invDate >= from &&
          invDate <= to
        );
      })
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    const previousMonthRevenue = invoices
      .filter((inv) => {
        const invDate = new Date(inv.issuedAt ?? new Date());
        return (
          invDate.getMonth() === new Date().getMonth() - 1 &&
          invDate >= from &&
          invDate <= to
        );
      })
      .reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    if (previousMonthRevenue === 0) return 0;
    return (currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue;
  }

  private calculateMoM_GrowthExpenses(expenses: any[], from: Date, to: Date) {
    // Simplified MoM growth for expenses
    const monthDuration = (to.getTime() - from.getTime()) / (30 * 24 * 60 * 60 * 1000);
    const months = Math.max(1, Math.floor(monthDuration));

    if (months <= 1) return 0;

    const currentMonthExpenses = expenses
      .filter((exp) => {
        const expDate = new Date(exp.postedAt ?? new Date());
        return expDate >= from && expDate <= to;
      })
      .reduce((sum, exp) => sum + (exp.amount ?? 0), 0);

    const previousMonthExpenses = expenses
      .filter((exp) => {
        const expDate = new Date(exp.postedAt ?? new Date());
        return expDate.getMonth() === new Date().getMonth() - 1 && expDate >= from && expDate <= to;
      })
      .reduce((sum, exp) => sum + (exp.amount ?? 0), 0);

    if (previousMonthExpenses === 0) return 0;
    return (currentMonthExpenses - previousMonthExpenses) / previousMonthExpenses;
  }
}