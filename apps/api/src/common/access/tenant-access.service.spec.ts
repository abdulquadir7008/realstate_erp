type EnvOverrides = Record<string, string | undefined>;

/**
 * Load a fresh copy of the access service with a specific environment.
 * The configuration module caches parsed env values, so the module registry
 * has to be reset to pick up overrides.
 */
function loadService(envOverrides: EnvOverrides = {}) {
  const saved = { ...process.env };
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('./tenant-access.service');
  const service = new mod.TenantAccessService({} as any);
  return {
    service,
    restore: () => {
      process.env = saved;
    },
  };
}

const NOW = new Date('2026-10-22T00:00:00.000Z');
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

describe('TenantAccessService organization status', () => {
  it('blocks every non-active organization status with a distinct code', () => {
    const { service, restore } = loadService();
    try {
      expect(service.evaluateOrgStatus('PENDING')).toMatchObject({
        allowed: false,
        code: 'ORGANIZATION_PENDING',
      });
      expect(service.evaluateOrgStatus('SUSPENDED')).toMatchObject({
        allowed: false,
        code: 'ORGANIZATION_SUSPENDED',
      });
      expect(service.evaluateOrgStatus('REJECTED')).toMatchObject({
        allowed: false,
        code: 'ORGANIZATION_REJECTED',
      });
      expect(service.evaluateOrgStatus('CANCELLED')).toMatchObject({
        allowed: false,
        code: 'ORGANIZATION_CANCELLED',
      });
    } finally {
      restore();
    }
  });

  it('allows active organizations and unknown statuses', () => {
    const { service, restore } = loadService();
    try {
      expect(service.evaluateOrgStatus('ACTIVE')).toEqual({ allowed: true });
      expect(service.evaluateOrgStatus(null)).toEqual({ allowed: true });
    } finally {
      restore();
    }
  });
});

describe('TenantAccessService subscription state', () => {
  it('allows tenants that have no subscription', () => {
    const { service, restore } = loadService();
    try {
      expect(service.evaluateSubscription(null, NOW)).toEqual({ allowed: true });
    } finally {
      restore();
    }
  });

  it('allows a trial that is still running', () => {
    const { service, restore } = loadService();
    try {
      const decision = service.evaluateSubscription(
        { id: 'sub-1', status: 'TRIALING', trialEndsAt: days(5), currentPeriodEnd: days(5) },
        NOW,
      );
      expect(decision.allowed).toBe(true);
    } finally {
      restore();
    }
  });

  it('blocks a trial that has already ended', () => {
    const { service, restore } = loadService();
    try {
      const decision = service.evaluateSubscription(
        { id: 'sub-1', status: 'TRIALING', trialEndsAt: days(-1), currentPeriodEnd: days(-1) },
        NOW,
      );
      expect(decision).toMatchObject({ allowed: false, code: 'TRIAL_EXPIRED' });
    } finally {
      restore();
    }
  });

  it('blocks cancelled and expired subscriptions', () => {
    const { service, restore } = loadService();
    try {
      expect(
        service.evaluateSubscription(
          { id: 'sub-1', status: 'CANCELLED', trialEndsAt: null, currentPeriodEnd: days(30) },
          NOW,
        ),
      ).toMatchObject({ allowed: false, code: 'SUBSCRIPTION_CANCELLED' });

      expect(
        service.evaluateSubscription(
          { id: 'sub-1', status: 'EXPIRED', trialEndsAt: null, currentPeriodEnd: days(-30) },
          NOW,
        ),
      ).toMatchObject({ allowed: false, code: 'SUBSCRIPTION_EXPIRED' });
    } finally {
      restore();
    }
  });

  it('keeps a past-due tenant inside the grace window but blocks it afterwards', () => {
    const { service, restore } = loadService({ SUBSCRIPTION_GRACE_DAYS: '7' });
    try {
      expect(
        service.evaluateSubscription(
          { id: 'sub-1', status: 'PAST_DUE', trialEndsAt: null, currentPeriodEnd: days(-3) },
          NOW,
        ).allowed,
      ).toBe(true);

      expect(
        service.evaluateSubscription(
          { id: 'sub-1', status: 'PAST_DUE', trialEndsAt: null, currentPeriodEnd: days(-30) },
          NOW,
        ),
      ).toMatchObject({ allowed: false, code: 'SUBSCRIPTION_PAST_DUE' });
    } finally {
      restore();
    }
  });

  it('ignores subscription state entirely when enforcement is disabled', () => {
    const { service, restore } = loadService({ ENFORCE_SUBSCRIPTION: 'false' });
    try {
      expect(
        service.evaluateSubscription(
          { id: 'sub-1', status: 'EXPIRED', trialEndsAt: null, currentPeriodEnd: days(-30) },
          NOW,
        ).allowed,
      ).toBe(true);
    } finally {
      restore();
    }
  });
});

describe('TenantAccessService combined decisions', () => {
  it('reports the organization problem before the subscription problem', () => {
    const { service, restore } = loadService();
    try {
      const decision = service.decide(
        'SUSPENDED',
        { id: 'sub-1', status: 'EXPIRED', trialEndsAt: null, currentPeriodEnd: days(-30) },
        NOW,
      );
      expect(decision).toMatchObject({ allowed: false, code: 'ORGANIZATION_SUSPENDED' });
    } finally {
      restore();
    }
  });

  it('throws an API error carrying the denial code', async () => {
    const { service, restore } = loadService();
    try {
      service.loadState = jest.fn().mockResolvedValue({ orgStatus: 'PENDING', subscription: null }) as any;
      await expect(service.assertAccess('org-1', NOW)).rejects.toMatchObject({
        code: 'ORGANIZATION_PENDING',
      });
      await expect(service.assertAccess('org-1', NOW)).rejects.toThrow('awaiting approval');
    } finally {
      restore();
    }
  });
});
