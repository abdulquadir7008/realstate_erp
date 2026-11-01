'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clipboard,
  Layout,
  TrendingUp,
  Calendar,
  AlertCircle,
  Shield,
  Folder,
  PieChart,
  Users,
  BarChart2,
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

interface FieldOpsTrendData {
  month: string;
  formsSubmitted: number;
  formsApproved: number;
  formsDraft: number;
  offlineForms: number;
}

interface FormTypeData {
  type: string;
  count: number;
}

interface ProjectFormData {
  projectCode: string;
  formCount: number;
}

export default function FieldOpsAnalyticsPage() {
  const { projectId, currentProject } = useWorkspace();
  const {
    data: summary,
    isLoading,
    error,
  } = useQuery<any>({
    queryKey: ['field-ops-analytics', projectId ?? 'all'],
    queryFn: () => api('/field-ops-analytics/summary'),
    refetchInterval: 300000,
  });

  if (isLoading) return <DashboardSkeleton fieldOps />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!summary) return null;

  const projectText = currentProject ? ` – ${currentProject.name}` : ' – Organization-wide';

  // Trend data
  const trendData = [
    { month: 'Jan', formsSubmitted: 45, formsApproved: 38, formsDraft: 7, offlineForms: 3 },
    { month: 'Feb', formsSubmitted: 52, formsApproved: 44, formsDraft: 8, offlineForms: 4 },
    { month: 'Mar', formsSubmitted: 48, formsApproved: 40, formsDraft: 6, offlineForms: 2 },
    { month: 'Apr', formsSubmitted: 55, formsApproved: 47, formsDraft: 6, offlineForms: 5 },
    { month: 'May', formsSubmitted: 50, formsApproved: 42, formsDraft: 6, offlineForms: 3 },
    { month: 'Jun', formsSubmitted: 60, formsApproved: 51, formsDraft: 7, offlineForms: 4 },
    { month: 'Jul', formsSubmitted: 58, formsApproved: 49, formsDraft: 7, offlineForms: 3 },
    { month: 'Aug', formsSubmitted: 62, formsApproved: 53, formsDraft: 7, offlineForms: 5 },
    { month: 'Sep', formsSubmitted: 53, formsApproved: 45, formsDraft: 6, offlineForms: 2 },
    { month: 'Oct', formsSubmitted: 65, formsApproved: 55, formsDraft: 8, offlineForms: 4 },
    { month: 'Nov', formsSubmitted: 57, formsApproved: 48, formsDraft: 7, offlineForms: 3 },
    { month: 'Dec', formsSubmitted: 68, formsApproved: 58, formsDraft: 8, offlineForms: 6 },
  ];

  // Form type distribution
  const formTypeData = summary.formsByType || {
    DAILY_REPORT: 35,
    SAFETY_CHECK: 22,
    PROGRESS_BILL: 18,
    ATTENDANCE: 15,
    INSPECTION: 12,
    CUSTOM: 8,
  };

  // Project-wise forms
  const projectForms = summary.projectWiseForms || {
    'PRJ-001': 45,
    'PRJ-002': 38,
    'PRJ-003': 28,
    'PRJ-004': 22,
    'PRJ-005': 18,
  };

  return (
    <div className="p-6 pt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          Field Operations Analytics{projectText}
        </h1>
        <Link
          href="/dashboard/field-ops-analytics/export"
          className="inline-flex items-center gap-2 rounded-lg border bg-secondary px-4 py-2 text-sm font-medium shadow-sm transition:hover:border-accent/40"
        >
          <Download className="h-4 w-4 text-secondary" /> Export Report
        </Link>
      </div>

      {summary && !isLoading ? (<>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Forms"
            value={summary.totalForms}
            icon={<Clipboard className="h-5 w-5" />}
            tone="default"
            hint={`Completion rate: ${summary.completionRate}%`}
          />
          <StatCard
            label="Submitted Forms"
            value={summary.submittedForms}
            icon={<TrendingUp className="h-5 w-5" />}
            tone="success"
            hint={`86% approval rate`}
          />
          <StatCard
            label="Approved Forms"
            value={summary.approvedForms}
            icon={<Shield className="h-5 w-5" />}
            tone="default"
            hint={`Offline forms: ${summary.offlineForms}`}
          />
          <StatCard
            label="Draft Forms"
            value={summary.draftForms}
            icon={<Folder className="h-5 w-5" />}
            tone="warning"
            hint={`${summary.totalForms - summary.submittedForms - summary.approvedForms - summary.draftForms} other`}
          />
        </div>

        <div className="text-sm text-muted-foreground">Chart placeholder</div>

        <Card>
          <CardHeader>
            <CardTitle>Form Type Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Percentage of each form type submitted</p>
          </CardHeader>
          <CardContent>
            <Donut
              data={Object.entries(formTypeData).map(([type, count]) => ({
                name: type,
                value: count as number,
              }))}
              colors={[
                'bg-primary',
                'bg-destructive',
                'bg-amber-500',
                'bg-green-500',
                'bg-blue-500',
                'bg-purple-500',
              ]}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              {Object.entries(formTypeData).map(([type, count], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span>{type}</span>
                  <span>{formatNumber(count as number)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project-wise Form Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Form submissions per project</p>
          </CardHeader>
          <CardContent>
            <BarsChart
              data={Object.entries(projectForms).map(([projectCode, formCount]) => ({
                projectCode,
                formCount,
              }))}
              xKey="projectCode"
              layout="horizontal"
              series={[
                { key: 'formCount', label: 'Forms', color: 'bg-primary' },
              ]}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              {Object.entries(projectForms).map(([projectCode, formCount], i) => (
                <div key={i}>
                  <span>{projectCode}</span>
                  <span>{formatNumber(formCount as number)} forms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offline Sync Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-2xl font-bold">{summary.offlineForms}</p>
                <p className="text-muted-foreground">Offline forms</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalForms}</p>
                <p className="text-muted-foreground">Total forms</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Completion rate: {summary.completionRate}% | Average completion time: {summary.averageCompletionTime} minutes
            </p>
          </CardContent>
        </Card>

      </>) : (
        <DashboardSkeleton fieldOps />
      )}
    </div>
  );
}

function DashboardSkeleton({ fieldOps }: { fieldOps?: boolean }) {
  return (
    <div className="p-6 pt-0">
      <h1 className="text-3xl font-semibold tracking-tight">Field Ops Analytics</h1>
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