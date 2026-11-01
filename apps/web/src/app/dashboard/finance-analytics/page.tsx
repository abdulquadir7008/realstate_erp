'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  DollarSign,
  Layout,
  BarChart2,
  PieChart,
  AlertCircle,
  Calendar,
  Folder,
  Building,
  Users,
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

interface FinanceTrendData {
  month: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

interface FinanceSourceData {
  source: string;
  revenue: number;
}

interface FinanceProjectData {
  projectCode: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  margin: number;
}

export default function FinanceAnalyticsPage() {
  const { projectId, currentProject } = useWorkspace();
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ['finance-analytics', projectId ?? 'all'],
    queryFn: () => api('/finance-analytics/summary'),
    refetchInterval: 300000,
  });

  if (isLoading) return <DashboardSkeleton finance />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!summary) return null;

  const projectText = currentProject ? ` – ${currentProject.name}` : ' – Organization-wide';

  // Trend data
  const trendData = [
    { month: 'Jan', revenue: 125000, expenses: 98000, netProfit: 27000 },
    { month: 'Feb', revenue: 132000, expenses: 105000, netProfit: 27000 },
    { month: 'Mar', revenue: 118000, expenses: 92000, netProfit: 26000 },
    { month: 'Apr', revenue: 145000, expenses: 112000, netProfit: 33000 },
    { month: 'May', revenue: 138000, expenses: 108000, netProfit: 30000 },
    { month: 'Jun', revenue: 152000, expenses: 115000, netProfit: 37000 },
    { month: 'Jul', revenue: 148000, expenses: 110000, netProfit: 38000 },
    { month: 'Aug', revenue: 160000, expenses: 120000, netProfit: 40000 },
    { month: 'Sep', revenue: 155000, expenses: 118000, netProfit: 37000 },
    { month: 'Oct', revenue: 172000, expenses: 125000, netProfit: 47000 },
    { month: 'Nov', revenue: 165000, expenses: 122000, netProfit: 43000 },
    { month: 'Dec', revenue: 180000, expenses: 130000, netProfit: 50000 },
  ];

  // Revenue by source (mock data)
  const sourceData = [
    { source: 'Project Revenue', revenue: summary.totalRevenue || 850000 },
    { source: 'Other Income', revenue: 45000 },
    { source: 'Interest', revenue: 25000 },
  ];

  // Top projects
  const topProjects = summary.topProjects || [
    { projectCode: 'PRJ-001', revenue: 85000, expenses: 65000, netProfit: 20000, margin: 23.5 },
    { projectCode: 'PRJ-002', revenue: 62000, expenses: 48000, netProfit: 14000, margin: 22.6 },
    { projectCode: 'PRJ-003', revenue: 48000, expenses: 38000, netProfit: 10000, margin: 20.8 },
    { projectCode: 'PRJ-004', revenue: 35000, expenses: 28000, netProfit: 7000, margin: 20.0 },
    { projectCode: 'PRJ-005', revenue: 28000, expenses: 22000, netProfit: 6000, margin: 21.4 },
  ];

  return (
    <div className="p-6 pt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Finance Analytics{projectText}
        </h1>
        <Link
          href="/dashboard/finance-analytics/export"
          className="inline-flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium shadow-sm transition:hover:border-accent/40"
        >
          <Download className="h-4 w-4 text-secondary" /> Export Report
        </Link>
      </div>

      {summary && !isLoading ? (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(summary.totalRevenue)}
            icon={<DollarSign className="h-5 w-5" />}
            tone="success"
            hint={`3-month period`}
          />
          <StatCard
            label="Total Expenses"
            value={formatCurrency(summary.totalExpenses)}
            icon={<DollarSign className="h-5 w-5" />}
            tone="danger"
            hint={`Includes all cost heads`}
          />
          <StatCard
            label="Net Profit"
            value={formatCurrency(summary.netProfit)}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="success"
            hint={`Gross Margin: ${summary.grossMargin}%`}
          />
          <StatCard
            label="Operating Margin"
            value={formatPercent(summary.operatingMargin / 100)}
            icon={<BarChart2 className="h-5 w-5" />}
            tone="default"
            hint={`Cash Flow: ${formatCurrency(summary.cashFlow)}`}
          />
        </div>

        <div className="text-sm text-muted-foreground">Chart placeholder</div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <Donut
              data={sourceData}
              colors={['bg-primary', 'bg-amber-500', 'bg-green-500']}
            />
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Total Revenue: {formatCurrency(summary.totalRevenue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Projects by Revenue</CardTitle>
            <p className="text-sm text-muted-foreground">Top 5 projects by revenue and margin</p>
          </CardHeader>
          <CardContent>
            <BarsChart
              data={topProjects}
              xKey="projectCode"
              layout="horizontal"
              series={[
                { key: 'revenue', label: 'Revenue', color: 'bg-primary' },
                { key: 'expenses', label: 'Expenses', color: 'bg-destructive' },
                { key: 'netProfit', label: 'Net Profit', color: 'bg-green-500' },
              ]}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              {topProjects.map((p, i) => (
                <div key={i}>
                  <span>{p.projectCode}</span>
                  <span className="mx-2">|</span>
                  <span>{formatPercent(p.margin / 100)} margin</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3-Month Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Next Month Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.forecasts.nextMonthRevenue)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Next Month Expenses</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.forecasts.nextMonthExpenses)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Next Month Net Profit</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.forecasts.nextMonthNetProfit)}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm">Confidence: {summary.forecasts.confidence}%</p>
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
        <DashboardSkeleton finance />
      )}
    </div>
  );
}

function DashboardSkeleton({ finance }: { finance?: boolean }) {
  return (
    <div className="p-6 pt-0">
      <h1 className="text-3xl font-semibold tracking-tight">Finance Analytics</h1>
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
      </div>
    </div>
  );
}