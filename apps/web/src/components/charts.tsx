'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const CHART_COLORS = [
  'hsl(228 100% 66%)', // electric
  'hsl(156 76% 40%)', // emerald
  'hsl(212 55% 32%)', // navy-light
  'hsl(38 92% 55%)', // amber
  'hsl(280 60% 62%)', // purple
  'hsl(190 80% 45%)', // cyan
  'hsl(0 72% 55%)', // red
];

const axisTick = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--popover))',
  color: 'hsl(var(--popover-foreground))',
  boxShadow: '0 8px 30px rgba(2, 8, 23, 0.12)',
  fontSize: 12,
  padding: '8px 12px',
};

export interface Series {
  key: string;
  label: string;
  color?: string;
}

export function TrendArea({
  data,
  xKey,
  series,
  height = 280,
  valueFormatter,
}: {
  data: any[];
  xKey: string;
  series: Series[];
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.35} />
                <stop offset="95%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => (valueFormatter ? valueFormatter(v) : String(v))} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name) => [valueFormatter ? valueFormatter(v) : v, name]} />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2.5}
              fill={`url(#fill-${s.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({
  data,
  xKey,
  series,
  height = 280,
  valueFormatter,
  layout = 'horizontal',
}: {
  data: any[];
  xKey: string;
  series: Series[];
  height?: number;
  valueFormatter?: (v: number) => string;
  layout?: 'horizontal' | 'vertical';
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout={layout} margin={{ top: 10, right: 10, left: layout === 'vertical' ? 20 : -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={layout === 'vertical'} horizontal={layout === 'horizontal'} stroke="hsl(var(--border))" />
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey={xKey} tick={axisTick} tickLine={false} axisLine={false} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={60} tickFormatter={(v) => (valueFormatter ? valueFormatter(v) : String(v))} />
            </>
          )}
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name) => [valueFormatter ? valueFormatter(v) : v, name]} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} radius={layout === 'vertical' ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={42} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  data,
  height = 260,
  valueFormatter,
  colors,
}: {
  data: { name: string; value: number }[];
  height?: number;
  valueFormatter?: (v: number) => string;
  colors?: string[];
}) {
  const palette = colors ?? CHART_COLORS;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="86%" paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name) => [valueFormatter ? valueFormatter(v) : v, name]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineTrend({ data, xKey, series, height = 280 }: { data: any[]; xKey: string; series: Series[]; height?: number }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={false} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={60} />
          <Tooltip contentStyle={tooltipStyle} />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2.5} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartLegend({ items }: { items: { name: string; color?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((it, i) => (
        <span key={it.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color ?? CHART_COLORS[i % CHART_COLORS.length] }} />
          {it.name}
        </span>
      ))}
    </div>
  );
}
