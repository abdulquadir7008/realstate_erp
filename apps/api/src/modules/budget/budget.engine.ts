export interface BudgetFigures {
  planned: number;
  committed: number;
  actual: number;
  forecast: number;
  contingency: number;
}

export interface BudgetLineFigures {
  plannedAmount: number;
  committedAmount: number;
  actualAmount: number;
  forecastAmount: number;
}

export interface BudgetAlertLevels {
  warning: number;
  critical: number;
  hardStop: number;
}

export const DEFAULT_ALERT_LEVELS: BudgetAlertLevels = { warning: 80, critical: 95, hardStop: 100 };

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeLineAmount(quantity: unknown, plannedRate: unknown): number {
  return round2(toNumber(quantity) * toNumber(plannedRate));
}

export function normalizeFigures(figures: Partial<BudgetFigures>): BudgetFigures {
  const planned = toNumber(figures.planned);
  const committed = toNumber(figures.committed);
  const actual = toNumber(figures.actual);
  const forecast = toNumber(figures.forecast);
  const contingency = toNumber(figures.contingency);
  return {
    planned: round2(planned),
    committed: round2(committed),
    actual: round2(actual),
    forecast: round2(forecast),
    contingency: round2(contingency),
  };
}

export function availableBudget(figures: Partial<BudgetFigures>): number {
  const normalized = normalizeFigures(figures);
  return round2(normalized.planned + normalized.contingency - normalized.committed - normalized.actual);
}

export function utilizationPercent(figures: Partial<BudgetFigures>): number {
  const normalized = normalizeFigures(figures);
  const total = normalized.planned + normalized.contingency;
  if (total <= 0) return 0;
  return round2(((normalized.committed + normalized.actual) / total) * 100);
}

export function varianceAmount(figures: Partial<BudgetFigures>): number {
  const normalized = normalizeFigures(figures);
  return round2(normalized.planned - normalized.committed - normalized.actual);
}

export function resolveAlertLevel(
  utilization: number,
  levels: BudgetAlertLevels = DEFAULT_ALERT_LEVELS,
): 'WARNING' | 'CRITICAL' | 'HARD_STOP' | null {
  if (utilization >= levels.hardStop) return 'HARD_STOP';
  if (utilization >= levels.critical) return 'CRITICAL';
  if (utilization >= levels.warning) return 'WARNING';
  return null;
}

export interface BudgetCheckInputFigures extends Partial<BudgetFigures> {
  proposedAmount: number;
  hardStop?: boolean;
  levels?: BudgetAlertLevels;
}

export interface BudgetCheckResult {
  allowed: boolean;
  hardStop: boolean;
  planned: number;
  committed: number;
  actual: number;
  available: number;
  proposedAmount: number;
  projectedCommitted: number;
  projectedAvailable: number;
  utilization: number;
  projectedUtilization: number;
  alertLevel: 'WARNING' | 'CRITICAL' | 'HARD_STOP' | null;
}

export function evaluateBudgetCheck(input: BudgetCheckInputFigures): BudgetCheckResult {
  const levels = input.levels ?? DEFAULT_ALERT_LEVELS;
  const figures = normalizeFigures(input);
  const proposedAmount = round2(toNumber(input.proposedAmount));
  const available = availableBudget(figures);
  const projectedCommitted = round2(figures.committed + proposedAmount);
  const projectedAvailable = round2(available - proposedAmount);
  const utilization = utilizationPercent(figures);
  const projected = normalizeFigures({ ...figures, committed: projectedCommitted });
  const projectedUtilization = utilizationPercent(projected);
  const alertLevel = resolveAlertLevel(projectedUtilization, levels);
  const hardStop = Boolean(input.hardStop);
  return {
    allowed: !(hardStop && projectedUtilization > levels.hardStop),
    hardStop,
    planned: figures.planned,
    committed: figures.committed,
    actual: figures.actual,
    available,
    proposedAmount,
    projectedCommitted,
    projectedAvailable,
    utilization,
    projectedUtilization,
    alertLevel,
  };
}

export interface BudgetSnapshotLine {
  id: string;
  costHeadId: string;
  quantity: number;
  plannedRate: number;
  plannedAmount: number;
  committedAmount: number;
  actualAmount: number;
  forecastAmount: number;
}

export interface RevisionChange {
  budgetLineId: string;
  quantity?: number;
  plannedRate?: number;
  plannedAmount?: number;
}

export interface ResolvedRevisionChange {
  budgetLineId: string;
  before: BudgetSnapshotLine;
  after: { quantity: number; plannedRate: number; plannedAmount: number };
  delta: number;
}

export function applyRevisionChanges(
  lines: BudgetSnapshotLine[],
  changes: RevisionChange[],
): { changes: ResolvedRevisionChange[]; totalBefore: number; totalAfter: number; deltaAmount: number } {
  const byId = new Map(lines.map((line) => [line.id, line]));
  const resolved: ResolvedRevisionChange[] = [];
  const seen = new Set<string>();

  for (const change of changes) {
    if (seen.has(change.budgetLineId)) {
      throw new Error(`Duplicate change for budget line ${change.budgetLineId}`);
    }
    seen.add(change.budgetLineId);
    const line = byId.get(change.budgetLineId);
    if (!line) throw new Error(`Budget line ${change.budgetLineId} does not belong to this budget`);

    const quantity = change.quantity !== undefined ? toNumber(change.quantity) : line.quantity;
    const plannedRate = change.plannedRate !== undefined ? toNumber(change.plannedRate) : line.plannedRate;
    const plannedAmount =
      change.plannedAmount !== undefined ? round2(toNumber(change.plannedAmount)) : computeLineAmount(quantity, plannedRate);

    resolved.push({
      budgetLineId: line.id,
      before: line,
      after: {
        quantity: Math.round(quantity * 1000) / 1000,
        plannedRate: round2(plannedRate),
        plannedAmount,
      },
      delta: round2(plannedAmount - line.plannedAmount),
    });
  }

  const totalBefore = round2(lines.reduce((sum, line) => sum + line.plannedAmount, 0));
  const totalAfter = round2(
    lines.reduce((sum, line) => {
      const change = resolved.find((entry) => entry.budgetLineId === line.id);
      return sum + (change ? change.after.plannedAmount : line.plannedAmount);
    }, 0),
  );

  return { changes: resolved, totalBefore, totalAfter, deltaAmount: round2(totalAfter - totalBefore) };
}

export interface CostHeadRollup {
  costHeadId: string;
  planned: number;
  committed: number;
  actual: number;
  forecast: number;
  variance: number;
  utilization: number;
}

export function rollupByCostHead(
  lines: Array<{
    costHeadId: string;
    plannedAmount: unknown;
    committedAmount: unknown;
    actualAmount: unknown;
    forecastAmount: unknown;
  }>,
): CostHeadRollup[] {
  const map = new Map<string, CostHeadRollup>();
  for (const line of lines) {
    const entry =
      map.get(line.costHeadId) ??
      {
        costHeadId: line.costHeadId,
        planned: 0,
        committed: 0,
        actual: 0,
        forecast: 0,
        variance: 0,
        utilization: 0,
      };
    entry.planned += toNumber(line.plannedAmount);
    entry.committed += toNumber(line.committedAmount);
    entry.actual += toNumber(line.actualAmount);
    entry.forecast += toNumber(line.forecastAmount);
    map.set(line.costHeadId, entry);
  }
  return [...map.values()]
    .map((entry) => {
      const figures = normalizeFigures(entry);
      return {
        ...entry,
        planned: figures.planned,
        committed: figures.committed,
        actual: figures.actual,
        forecast: figures.forecast,
        variance: varianceAmount(figures),
        utilization: utilizationPercent(figures),
      };
    })
    .sort((a, b) => b.planned - a.planned);
}
