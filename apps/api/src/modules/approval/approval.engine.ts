export interface ApprovalActor {
  id: string;
  roleCodes: string[];
  permissions: string[];
}

export interface ApprovalStepLike {
  approverType: string;
  approverRole?: string | null;
  approverUserId?: string | null;
  approverPermission?: string | null;
}

export interface ApprovalThresholdLike {
  scopeType: string;
  scopeId?: string | null;
  minAmount: unknown;
  maxAmount?: unknown | null;
  priority?: number;
}

export interface ThresholdContext {
  projectId?: string | null;
  siteId?: string | null;
  costHeadId?: string | null;
}

const SCOPE_RANK: Record<string, number> = {
  COST_HEAD: 4,
  SITE: 3,
  PROJECT: 2,
  ORGANIZATION: 1,
};

export function stepMatchesActor(step: ApprovalStepLike, actor: ApprovalActor): boolean {
  switch (step.approverType) {
    case 'USER':
      return !!step.approverUserId && step.approverUserId === actor.id;
    case 'ROLE':
      return !!step.approverRole && actor.roleCodes.includes(step.approverRole);
    case 'PERMISSION':
      return !!step.approverPermission && actor.permissions.includes(step.approverPermission);
    default:
      return false;
  }
}

export function scopeRank(scopeType: string): number {
  return SCOPE_RANK[scopeType] ?? 0;
}

export function thresholdApplies(threshold: ApprovalThresholdLike, amount: number, context: ThresholdContext): boolean {
  const min = Number(threshold.minAmount ?? 0);
  const max = threshold.maxAmount === null || threshold.maxAmount === undefined ? null : Number(threshold.maxAmount);
  if (amount < min) return false;
  if (max !== null && amount > max) return false;

  switch (threshold.scopeType) {
    case 'ORGANIZATION':
      return true;
    case 'PROJECT':
      return !!threshold.scopeId && threshold.scopeId === context.projectId;
    case 'SITE':
      return !!threshold.scopeId && threshold.scopeId === context.siteId;
    case 'COST_HEAD':
      return !!threshold.scopeId && threshold.scopeId === context.costHeadId;
    default:
      return false;
  }
}

export function sortThresholds<T extends ApprovalThresholdLike>(thresholds: T[]): T[] {
  return [...thresholds].sort((a, b) => {
    const scopeDiff = scopeRank(b.scopeType) - scopeRank(a.scopeType);
    if (scopeDiff !== 0) return scopeDiff;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}

export function nextPendingSequence(steps: { sequence: number; status: string }[], current: number): number | null {
  const sequences = [
    ...new Set(steps.filter((step) => step.sequence > current && step.status === 'PENDING').map((step) => step.sequence)),
  ].sort((a, b) => a - b);
  return sequences.length > 0 ? sequences[0] : null;
}
