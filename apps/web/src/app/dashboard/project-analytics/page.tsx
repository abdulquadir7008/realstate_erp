'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Building,
  TrendingUp,
  Calendar,
  AlertCircle,
  Folder,
  Shield,
  Users,
  Clipboard,
  DollarSign,
  Layout,
  Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useWorkspace } from '@/components/shell/workspace';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatCard,
  Skeleton,
  EmptyState,
  Button,
} from '@/components/ui';
import { TrendArea, Donut, BarsChart, ChartLegend } from '@/components/charts';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

interface ProjectTrendData {
  month: string;
  newProjects: number;
  completedProjects: number;
  budgetVariance: number;
}

interface ProjectVarianceData {
  projectCode: string;
  budget: number;
  actualSpend: number;
  variance: number;
  scheduleVariance: number;
  status: string;
}

interface PredictionData {
  projectedOverBudget: number;
  delayedProjects: number;
  resourceUtilization: number;
}

export default function ProjectAnalyticsPage() {
  const { projectId, currentProject } = useWorkspace();
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ['project-analytics', projectId ?? 'all'],
    queryFn: () => api('/project-analytics/summary'),
    refetchInterval: 300000,
  });

  if (isLoading) return <DashboardSkeleton project />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!summary) return null;

  const projectText = currentProject ? ` – ${currentProject.name}` : ' – Organization-wide';

  // Trend data
  const trendData = [
    { month: 'Jan', newProjects: 3, completedProjects: 2, budgetVariance: 5 },
    { month: 'Feb', newProjects: 4, completedProjects: 3, budgetVariance: 3 },
    { month: 'Mar', newProjects: 2, completedProjects: 4, budgetVariance: -2 },
    { month: 'Apr', newProjects: 5, completedProjects: 3, budgetVariance: 8 },
    { month: 'May', newProjects: 3, completedProjects: 5, budgetVariance: 1 },
    { month: 'Jun', newProjects: 4, completedProjects: 4, budgetVariance: 4 },
    { month: 'Jul', newProjects: 3, completedProjects: 4, budgetVariance: 2 },
    { month: 'Aug', newProjects: 6, completedProjects: 5, budgetVariance: 7 },
    { month: 'Sep', newProjects: 2, completedProjects: 4, budgetVariance: 0 },
    { month: 'Oct', newProjects: 5, completedProjects: 4, budgetVariance: 6 },
    { month: 'Nov', newProjects: 3, completedProjects: 5, budgetVariance: 2 },
    { month: 'Dec', newProjects: 4, completedProjects: 6, budgetVariance: 9 },
  ];

  // Project variance data
  const projectVariance = summary.topProjects || [
    { projectCode: 'PRJ-001', budget: 500000, actualSpend: 420000, variance: 80000, scheduleVariance: 95, status: 'Active' },
    { projectCode: 'PRJ-002', budget: 350000, actualSpend: 330000, variance: 20000, scheduleVariance: 92, status: 'Active' },
    { projectCode: 'PRJ-003', budget: 280000, actualSpend: 265000, variance: 15000, scheduleVariance: 88, status: 'On Hold' },
    { projectCode: 'PRJ-004', budget: 180000, actualSpend: 195000, variance: -15000, scheduleVariance: 75, status: 'Over Budget' },
    { projectCode: 'PRJ-005', budget: 150000, actualSpend: 130000, variance: 20000, scheduleVariance: 98, status: 'Active' },
  ];

  // Predictions
  const predictions = summary.predictions || {
    projectedOverBudget: 2,
    delayedProjects: 3,
    resourceUtilization: 85,
  };

  return (
    <div className="p-6 pt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Project Analytics{projectText}
        </h1>
        <Link
          href="/dashboard/project-analytics/export"
          className="inline-flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium shadow-sm transition:hover:border-accent/40"
        >
          <Download className="h-4 w-4 text-secondary" /> Export Report
        </Link>
      </div>

      {summary && !isLoading ? (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Projects"
            value={summary.totalProjects}
            icon={<Building className="h-5 w-5" />}
            tone="default"
            hint={`${summary.activeProjects} active, ${summary.completedProjects} completed`}
          />
          <StatCard
            label="Budget Utilization"
            value={formatPercent(summary.budgetUtilization / 100)}
            icon={<DollarSign className="h-5 w-5" />}
            tone={
              summary.budgetUtilization > 90
                ? 'destructive'
                : summary.budgetUtilization > 75
                  ? 'warning'
                  : 'success'
            }
            hint={`${summary.remainingBudget} remaining`}
          />
          <StatCard
            label="Schedule Adherence"
            value={formatPercent(summary.scheduleAdherence / 100)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone={
              summary.scheduleAdherence > 90
                ? 'success'
                : summary.scheduleAdherence > 75
                  ? 'default'
                  : 'destructive'
            }
            hint={`CPI: ${summary.costPerformanceIndex}`}
          />
          <StatCard
            label="Cost Performance Index"
            value={summary.costPerformanceIndex > 1 ? '✓ Over' : summary.costPerformanceIndex}
            icon={<AlertCircle className="h-5 w-5" />}
            tone="danger"
            hint={`${summary.onHoldProjects} on hold`}
          />
        </div>

        <div className="text-sm text-muted-foreground">Chart placeholder</div>

        <Card>
          <CardHeader>
            <CardTitle>Top Projects by Variance</CardTitle>
            <p className="text-sm text-muted-foreground">Projects with highest budget and schedule variance</p>
          </CardHeader>
          <CardContent>
            <BarsChart
              data={projectVariance}
              xKey="projectCode"
              layout="horizontal"
              series={[
                { key: 'budget', label: 'Budget', color: 'bg-primary' },
                { key: 'actualSpend', label: 'Actual Spend', color: 'bg-destructive' },
                { key: 'variance', label: 'Variance', color: 'bg-amber-500' },
                { key: 'scheduleVariance', label: 'Schedule', color: 'bg-blue-500' },
              ]}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              {projectVariance.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{p.projectCode}</span>
                  <span>{formatCurrency(p.variance)} variance</span>
                  <Badge tone={p.status === 'Over Budget' ? 'destructive' : p.status === 'On Hold' ? 'warning' : 'success'}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Projected Over-Budget</p>
                <p className="text-2xl font-bold text-destructive">{predictions.projectedOverBudget}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Delayed Projects</p>
                <p className="text-2xl font-bold text-destructive">{predictions.delayedProjects}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Resource Utilization</p>
                <p className="text-2xl font-bold">{predictions.resourceUtilization}%</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm">Budget utilization: {summary.budgetUtilization}%</p>
              <p className="text-sm">Schedule adherence: {summary.scheduleAdherence}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.recommendations.length > 0 && (
              <ul className="space-y-2 text-sm">
                {summary.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start">
                    <AlertCircle className="mt-1 text-destructive h-4 w-4" />
                    <span className="ml-2">{rec}</span>
                  </li>
                ))}
              </ul>
            ) || (
              <p className="text-muted-foreground">No recommendations at this time</p>
            )}
          </CardContent>
        </Card>

      </>) : (
        <DashboardSkeleton project />
      )}
    </div>
  );
}

function DashboardSkeleton({ project }: { project?: boolean }) {
  return (
    <div className="p-6 pt-0">
      <h1 className="text-3xl font-semibold tracking-tight">Project Analytics</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}