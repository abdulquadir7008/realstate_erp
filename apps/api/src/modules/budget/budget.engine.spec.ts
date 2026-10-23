import {
  applyRevisionChanges,
  availableBudget,
  evaluateBudgetCheck,
  resolveAlertLevel,
  rollupByCostHead,
  utilizationPercent,
  varianceAmount,
} from './budget.engine';

describe('budget engine', () => {
  it('computes availability, utilization and variance', () => {
    const figures = { planned: 1000, committed: 300, actual: 200, contingency: 100 };
    expect(availableBudget(figures)).toBe(600);
    expect(utilizationPercent(figures)).toBeCloseTo(45.45, 2);
    expect(varianceAmount(figures)).toBe(500);
  });

  it('resolves alert levels from configurable thresholds', () => {
    expect(resolveAlertLevel(50)).toBeNull();
    expect(resolveAlertLevel(80)).toBe('WARNING');
    expect(resolveAlertLevel(96)).toBe('CRITICAL');
    expect(resolveAlertLevel(100)).toBe('HARD_STOP');
    expect(resolveAlertLevel(99, { warning: 50, critical: 90, hardStop: 99 })).toBe('HARD_STOP');
  });

  it('evaluates a proposal and blocks when a hard stop is exceeded', () => {
    const allowed = evaluateBudgetCheck({ planned: 1000, committed: 400, actual: 100, proposedAmount: 200, hardStop: true });
    expect(allowed.allowed).toBe(true);
    expect(allowed.available).toBe(500);
    expect(allowed.projectedUtilization).toBe(70);
    expect(allowed.alertLevel).toBeNull();

    const blocked = evaluateBudgetCheck({ planned: 1000, committed: 900, actual: 100, proposedAmount: 50, hardStop: true });
    expect(blocked.allowed).toBe(false);
    expect(blocked.alertLevel).toBe('HARD_STOP');

    const warningOnly = evaluateBudgetCheck({ planned: 1000, committed: 900, actual: 100, proposedAmount: 50 });
    expect(warningOnly.allowed).toBe(true);
  });

  it('applies revision changes and totals the delta', () => {
    const lines = [
      {
        id: 'line-1',
        costHeadId: 'head-1',
        quantity: 10,
        plannedRate: 100,
        plannedAmount: 1000,
        committedAmount: 0,
        actualAmount: 0,
        forecastAmount: 1000,
      },
      {
        id: 'line-2',
        costHeadId: 'head-2',
        quantity: 5,
        plannedRate: 50,
        plannedAmount: 250,
        committedAmount: 0,
        actualAmount: 0,
        forecastAmount: 250,
      },
    ];

    const result = applyRevisionChanges(lines, [
      { budgetLineId: 'line-1', quantity: 12 },
      { budgetLineId: 'line-2', plannedAmount: 300 },
    ]);
    expect(result.totalBefore).toBe(1250);
    expect(result.totalAfter).toBe(1500);
    expect(result.deltaAmount).toBe(250);
    expect(result.changes[0].after.plannedAmount).toBe(1200);
    expect(result.changes[1].after.plannedAmount).toBe(300);
  });

  it('rejects duplicate or foreign revision changes', () => {
    const lines = [
      {
        id: 'line-1',
        costHeadId: 'head-1',
        quantity: 1,
        plannedRate: 100,
        plannedAmount: 100,
        committedAmount: 0,
        actualAmount: 0,
        forecastAmount: 100,
      },
    ];
    expect(() =>
      applyRevisionChanges(lines, [
        { budgetLineId: 'line-1', quantity: 2 },
        { budgetLineId: 'line-1', quantity: 3 },
      ]),
    ).toThrow(/Duplicate/);
    expect(() => applyRevisionChanges(lines, [{ budgetLineId: 'missing', quantity: 2 }])).toThrow(/does not belong/);
  });

  it('rolls up totals by cost head', () => {
    const rollup = rollupByCostHead([
      { costHeadId: 'head-1', plannedAmount: 100, committedAmount: 20, actualAmount: 10, forecastAmount: 100 },
      { costHeadId: 'head-1', plannedAmount: 50, committedAmount: 5, actualAmount: 5, forecastAmount: 50 },
      { costHeadId: 'head-2', plannedAmount: 25, committedAmount: 0, actualAmount: 0, forecastAmount: 25 },
    ]);
    expect(rollup).toHaveLength(2);
    expect(rollup[0]).toMatchObject({ costHeadId: 'head-1', planned: 150, committed: 25, actual: 15, variance: 110 });
    expect(rollup[1]).toMatchObject({ costHeadId: 'head-2', planned: 25 });
  });
});
