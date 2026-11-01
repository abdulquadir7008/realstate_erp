import { api } from './api';

export interface QhseAnalyticsSummary {
  projectId?: string;
  periodFrom: string;
  periodTo: string;
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
  complianceScore: number;
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

export interface FinanceAnalyticsSummary {
  periodFrom: string;
  periodTo: string;
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

export interface HrAnalyticsSummary {
  periodFrom: string;
  periodTo: string;
  totalEmployees: number;
  activeEmployees: number;
  terminatedEmployees: number;
  newHires: number;
  turnoverRate: number;
  averageTenureMonths: number;
  attendanceRate: number;
  overtimeHours: number;
  payrollCost: number;
  employeeSatisfaction: number;
  turnoverByDepartment: Record<string, number>;
  topDepartments: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    turnoverRate: number;
  }>;
  trends: {
    headcountChangeMonthOverMonth: number;
    turnoverTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    attendanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  predictions: {
    projectedTurnoverNext6Months: number;
    projectedHiresNext6Months: number;
    retentionRiskEmployees: Array<{
      employeeId: string;
      employeeCode: string;
      fullName: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      riskFactors: string[];
    }>;
  };
  recommendations: string[];
}

export interface FieldOpsAnalyticsSummary {
  periodFrom: string;
  periodTo: string;
  totalForms: number;
  submittedForms: number;
  approvedForms: number;
  draftForms: number;
  completionRate: number;
  formsByType: Record<string, number>;
  offlineForms: number;
  averageCompletionTime: number;
  formTypeDistribution: Record<string, number>;
  projectWiseForms: Record<string, number>;
}

export interface ProjectAnalyticsSummary {
  periodFrom: string;
  periodTo: string;
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

/** QHSE Analytics - get summary with optional project filter and date range */
export async function getQhseAnalyticsSummary(
  projectId?: string,
  from?: string,
  to?: string
): Promise<QhseAnalyticsSummary> {
  const params: string[] = [];
  if (projectId) params.push(`projectId=${projectId}`);
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return api<QhseAnalyticsSummary>(`/qhse-analytics/summary${query}`);
}

/** Finance Analytics - get summary with optional date range */
export async function getFinanceAnalyticsSummary(
  from?: string,
  to?: string
): Promise<FinanceAnalyticsSummary> {
  const params: string[] = [];
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return api<FinanceAnalyticsSummary>(`/finance-analytics/summary${query}`);
}

/** HR Analytics - get summary with optional date range */
export async function getHrAnalyticsSummary(
  from?: string,
  to?: string
): Promise<HrAnalyticsSummary> {
  const params: string[] = [];
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return api<HrAnalyticsSummary>(`/hr-analytics/summary${query}`);
}

/** Field Ops Analytics - get summary with optional date range */
export async function getFieldOpsAnalyticsSummary(
  from?: string,
  to?: string
): Promise<FieldOpsAnalyticsSummary> {
  const params: string[] = [];
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return api<FieldOpsAnalyticsSummary>(`/field-ops-analytics/summary${query}`);
}

/** Project Analytics - get summary with optional date range */
export async function getProjectAnalyticsSummary(
  from?: string,
  to?: string
): Promise<ProjectAnalyticsSummary> {
  const params: string[] = [];
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  const query = params.length > 0 ? `?${params.join('&')}` : '';
  return api<ProjectAnalyticsSummary>(`/project-analytics/summary${query}`);
}