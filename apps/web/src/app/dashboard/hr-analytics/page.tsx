'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Layout,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clipboard,
  Shield,
  Folder,
  HardHat,
  CreditCard,
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

interface HrTrendData {
  month: string;
  hires: number;
  terminations: number;
  headcount: number;
}

interface HrDepartmentData {
  departmentName: string;
  employeeCount: number;
  turnoverRate: number;
}

interface HrRetentionRisk {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: string[];
}

export default function HrAnalyticsPage() {
  const { projectId, currentProject } = useWorkspace();
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ['hr-analytics', projectId ?? 'all'],
    queryFn: () => api('/hr-analytics/summary'),
    refetchInterval: 300000,
  });

  if (isLoading) return <DashboardSkeleton hr />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!summary) return null;

  const projectText = currentProject ? ` – ${currentProject.name}` : ' – Organization-wide';

  // Trend data
  const trendData = [
    { month: 'Jan', hires: 8, terminations: 5, headcount: 42 },
    { month: 'Feb', hires: 6, terminations: 4, headcount: 44 },
    { month: 'Mar', hires: 10, terminations: 6, headcount: 48 },
    { month: 'Apr', hires: 4, terminations: 3, headcount: 49 },
    { month: 'May', hires: 7, terminations: 5, headcount: 51 },
    { month: 'Jun', hires: 5, terminations: 4, headcount: 52 },
    { month: 'Jul', hires: 9, terminations: 7, headcount: 54 },
    { month: 'Aug', hires: 3, terminations: 2, headcount: 55 },
    { month: 'Sep', hires: 6, terminations: 5, headcount: 56 },
    { month: 'Oct', hires: 8, terminations: 6, headcount: 58 },
    { month: 'Nov', hires: 5, terminations: 4, headcount: 59 },
    { month: 'Dec', hires: 7, terminations: 5, headcount: 60 },
  ];

  // Department data
  const departmentData = summary.turnoverByDepartment || [
    { departmentName: 'Engineering', employeeCount: 12, turnoverRate: 8.5 },
    { departmentName: 'Sales', employeeCount: 8, turnoverRate: 12.3 },
    { departmentName: 'Operations', employeeCount: 15, turnoverRate: 5.2 },
    { departmentName: 'HR', employeeCount: 3, turnoverRate: 0 },
    { departmentName: 'Finance', employeeCount: 5, turnoverRate: 6.8 },
  ];

  // Retention risk employees
  const riskEmployees = summary.predictions?.retentionRiskEmployees || [
    { employeeId: 'E001', employeeCode: 'E001', fullName: 'John Smith', riskLevel: 'HIGH', riskFactors: ['Short tenure (< 6 months)'] },
    { employeeId: 'E005', employeeCode: 'E005', fullName: 'Maria Garcia', riskLevel: 'MEDIUM', riskFactors: ['Low attendance rate'] },
    { employeeId: 'E012', employeeCode: 'E012', fullName: 'Robert Johnson', riskLevel: 'HIGH', riskFactors: ['Short tenure (< 6 months)'] },
  ];

  return (
    <div className="p-6 pt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          HR Analytics{projectText}
        </h1>
        <Link
          href="/dashboard/hr-analytics/export"
          className="inline-flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium shadow-sm transition:hover:border-accent/40"
        >
          <Download className="h-4 w-4 text-secondary" /> Export Report
        </Link>
      </div>

      {summary && !isLoading ? (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Employees"
            value={summary.totalEmployees}
            icon={<Users className="h-5 w-5" />}
            tone="default"
            hint={`Active: ${summary.activeEmployees}`}
          />
          <StatCard
            label="Turnover Rate"
            value={formatPercent(summary.turnoverRate / 100)}
            icon={<AlertCircle className="h-5 w-5" />}
            tone="danger"
            hint={`${summary.terminatedEmployees} terminated this period`}
          />
          <StatCard
            label="Attendance Rate"
            value={formatPercent(summary.attendanceRate / 100)}
            icon={<Clipboard className="h-5 w-5" />}
            tone="success"
            hint={`${summary.overdue} overtime hours`}
          />
          <StatCard
            label="Payroll Cost"
            value={formatCurrency(summary.payrollCost)}
            icon={<CreditCard className="h-5 w-5" />}
            tone="default"
            hint={`3-month period`}
          />
        </div>

        <div className="text-sm text-muted-foreground">Chart placeholder</div>

        <Card>
          <CardHeader>
            <CardTitle>Turnover by Department</CardTitle>
            <p className="text-sm text-muted-foreground">Employee count and turnover rate per department</p>
          </CardHeader>
          <CardContent>
            <Donut
              data={departmentData.map((d) => ({
                departmentName: d.departmentName,
                employeeCount: d.employeeCount,
                turnoverRate: d.turnoverRate,
              }))}
              colors={['bg-primary', 'bg-destructive', 'bg-amber-500', 'bg-green-500', 'bg-blue-500']}
            />
            <div className="mt-4 text-sm">
              {departmentData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-muted-foreground">
                  <span>{d.departmentName}</span>
                  <span>{formatPercent(d.turnoverRate / 100)}</span>
                  <span>{d.employeeCount} employees</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retention Risk Employees</CardTitle>
            <p className="text-sm text-muted-foreground">Employees at risk of turnover</p>
          </CardHeader>
          <CardContent>
            {riskEmployees.length > 0 && (
              <ul className="space-y-3 text-sm">
                {riskEmployees.map((risk, i) => (
                  <li key={i} className="px-4 py-3 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className={`mt-1 text-${risk.riskLevel === 'HIGH' ? 'destructive' : risk.riskLevel === 'MEDIUM' ? 'amber' : 'green'} h-4 w-4`}
                      />
                      <div>
                        <p className="font-medium">{risk.fullName}</p>
                        <p className="text-xs text-muted-foreground">Risk Level: {risk.riskLevel}</p>
                        {risk.riskFactors.length > 0 && (
                          <p className="text-xs mt-1">
                            {risk.riskFactors.map((f, j) => (
                              <span key={j} className="mr-1 text-[--webkit-text-stroke: 0.5px]">
                                {f}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) || (
              <p className="text-muted-foreground">No retention risks identified</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Overtime Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.overtimeHours}h</p>
              <p className="text-muted-foreground">This period</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payroll Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatCurrency(summary.payrollCost)}</p>
              <p className="text-muted-foreground">3-month total</p>
            </CardContent>
          </Card>
        </div>

      </>) : (
        <DashboardSkeleton hr />
      )}
    </div>
  );
}

function DashboardSkeleton({ hr }: { hr?: boolean }) {
  return (
    <div className="p-6 pt-0">
      <h1 className="text-3xl font-semibold tracking-tight">HR Analytics</h1>
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