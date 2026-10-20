import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { currentOrgId } from './tenant-context';

type AnyRecord = Record<string, any>;

const TENANT_FIELD = 'organizationId';

const MODEL_META = new Map<string, { hasOrg: boolean }>();
for (const model of Prisma.dmmf.datamodel.models) {
  const meta = { hasOrg: model.fields.some((f) => f.name === TENANT_FIELD) };
  MODEL_META.set(model.name, meta);
  MODEL_META.set(model.name.charAt(0).toLowerCase() + model.name.slice(1), meta);
}

function hasOrgField(model: string): boolean {
  return MODEL_META.get(model)?.hasOrg ?? false;
}

function isModelDelegate(prop: string): boolean {
  return MODEL_META.has(prop);
}

function isUniqueMethod(method: string): boolean {
  return method === 'findUnique' || method === 'findUniqueOrThrow' || method === 'delete' || method === 'update' || method === 'upsert';
}

function injectWhere(args: AnyRecord, orgId: string, unique: boolean): AnyRecord {
  const where = args.where ?? {};
  if (unique) {
    return { ...args, where: { ...where, [TENANT_FIELD]: orgId } };
  }
  return { ...args, where: { AND: [where, { [TENANT_FIELD]: orgId }] } };
}

function injectOrgArgs(model: string, method: string, args: AnyRecord, orgId: string): AnyRecord {
  if (!args) args = {};
  if (!hasOrgField(model)) return args;

  switch (method) {
    case 'create': {
      const data = args.data ?? {};
      if (Array.isArray(data)) {
        return { ...args, data: data.map((d: AnyRecord) => ({ ...d, [TENANT_FIELD]: d[TENANT_FIELD] ?? orgId })) };
      }
      return { ...args, data: { ...data, [TENANT_FIELD]: data[TENANT_FIELD] ?? orgId } };
    }
    case 'createMany': {
      const data = Array.isArray(args.data) ? args.data : [];
      return { ...args, data: data.map((d: AnyRecord) => ({ ...d, [TENANT_FIELD]: d[TENANT_FIELD] ?? orgId })) };
    }
    case 'findMany':
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'updateMany':
    case 'deleteMany':
      return injectWhere(args, orgId, false);
    case 'findUnique':
    case 'findUniqueOrThrow':
    case 'delete':
    case 'update':
      return injectWhere(args, orgId, true);
    case 'upsert': {
      return {
        ...args,
        where: { ...(args.where ?? {}), [TENANT_FIELD]: orgId },
        create: { ...(args.create ?? {}), [TENANT_FIELD]: (args.create as AnyRecord)?.[TENANT_FIELD] ?? orgId },
      };
    }
    default:
      return args;
  }
}

export function scopeDelegate(delegate: AnyRecord, model: string): AnyRecord {
  return new Proxy(delegate, {
    get(target, prop) {
      const value = (target as AnyRecord)[prop as string];
      if (typeof prop !== 'string' || typeof value !== 'function') return value;
      return (...callArgs: any[]) => {
        const method = prop;
        const args: AnyRecord = callArgs[0] ?? {};
        const orgId = currentOrgId();
        if (!orgId || !hasOrgField(model)) {
          return value.apply(target, callArgs);
        }
        const injected = injectOrgArgs(model, method, args, orgId);
        callArgs[0] = injected;
        return value.apply(target, callArgs);
      };
    },
  });
}

export function tenantProxy<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, prop) {
      const value = (target as AnyRecord)[prop as string];
      if (typeof prop !== 'string') return value;
      if (prop.startsWith('$')) {
        if (prop === '$transaction') {
          return async (...args: any[]) => {
            const [argA, argB] = args;
            if (typeof argA === 'function') {
              return (target as any).$transaction(async (tx: any) => argA(tenantProxy(tx)), argB);
            }
            return (target as any).$transaction(argA, argB);
          };
        }
        if (typeof value === 'function') {
          return (...callArgs: any[]) => value.apply(target, callArgs);
        }
        return value;
      }
      if (isModelDelegate(prop) && value && typeof value === 'object') {
        return scopeDelegate(value, prop);
      }
      return value;
    },
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  declare readonly db: PrismaService;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    const proxy = tenantProxy(this) as unknown as PrismaService;
    Object.defineProperty(this, 'db', { value: proxy, writable: false, configurable: true, enumerable: false });
    return proxy;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Run several operations inside one transaction with a fixed tenant context. */
  async withTenant<T>(orgId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const { runWithTenant, currentUserId } = await import('./tenant-context');
    return this.$transaction(async (tx) => {
      return runWithTenant({ orgId, userId: currentUserId(), email: null }, () => fn(tx));
    });
  }
}
