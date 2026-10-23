import { extractEntityId, inferAuditAction, inferEntityType, sanitizeAuditPayload } from './audit.util';

describe('audit util', () => {
  it('redacts sensitive fields recursively', () => {
    const result = sanitizeAuditPayload({ email: 'a@b.com', password: 'x', nested: { refreshToken: 't', ok: 1 } }) as any;
    expect(result.email).toBe('a@b.com');
    expect(result.password).toBe('[redacted]');
    expect(result.nested.refreshToken).toBe('[redacted]');
    expect(result.nested.ok).toBe(1);
  });

  it('serialises values with toJSON and drops functions', () => {
    class DecimalLike {
      constructor(private readonly value: number) {}
      toJSON() {
        return this.value.toFixed(2);
      }
    }
    const result = sanitizeAuditPayload({
      threshold: new DecimalLike(93.75),
      handler: () => undefined,
      ok: true,
    }) as any;
    expect(result.threshold).toBe('93.75');
    expect(result.handler).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it('infers actions from method and path', () => {
    expect(inferAuditAction('POST', '/api/v1/budgets')).toBe('CREATE');
    expect(inferAuditAction('PATCH', '/api/v1/budgets/1')).toBe('UPDATE');
    expect(inferAuditAction('DELETE', '/api/v1/budgets/1')).toBe('DELETE');
    expect(inferAuditAction('POST', '/api/v1/approvals/instances/1/approve')).toBe('APPROVE');
    expect(inferAuditAction('POST', '/api/v1/notifications/read-all')).toBe('READ_ALL');
  });

  it('infers entity types from routes', () => {
    expect(inferEntityType('/api/v1/budgets/1')).toBe('ProjectBudget');
    expect(inferEntityType('/api/v1/budget-commitments')).toBe('BudgetCommitment');
    expect(inferEntityType('/api/v1/approvals/instances/1/approve')).toBe('ApprovalInstance');
    expect(inferEntityType('/api/v1/approvals/workflows')).toBe('ApprovalWorkflow');
    expect(inferEntityType('/api/v1/approvals/thresholds/1')).toBe('ApprovalThreshold');
    expect(inferEntityType('/api/v1/some-new-thing')).toBe('SomeNewThing');
  });

  it('extracts entity ids from params, body and envelope', () => {
    expect(extractEntityId({ id: 'a' }, {})).toBe('a');
    expect(extractEntityId({}, { id: 'b' })).toBe('b');
    expect(extractEntityId({}, { data: { commitment: { id: 'c' } } })).toBe('c');
  });
});
