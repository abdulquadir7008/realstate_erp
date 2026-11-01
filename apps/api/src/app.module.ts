import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { env } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AccessModule } from './common/access/access.module';
import { AuthModule } from './modules/auth/auth.module';
import { ModulesModule } from './modules/modules.module';
import { AuditModule } from './modules/audit/audit.module';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PerformanceMiddleware } from './common/utils/performance/performance-middleware';
import { QueryInterceptor } from './common/utils/performance/query-interceptor.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HealthController } from './health.controller';
// import { CacheModule } from '@nestjs/cache-manager';
import { CompressionMiddleware } from './common/middleware/compression.middleware';
import { CacheManagerService } from './common/utils/cache/cache-manager.service';
import { HrSelfServiceService } from './modules/hr-self-service/hr-self-service.service';
import { IntegrationModule } from './modules/integration/integration.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';
import { SubconLifecycleModule } from './modules/subcon-lifecycle/subcon-lifecycle.module';
import { QHSELifecycleModule } from './modules/qhse-lifecycle/qhse-lifecycle.module';
import { FieldOpsModule } from './modules/field-ops/field-ops.module';
import { HrFinanceModule } from './modules/hr-finance/hr-finance.module';
import { QhseAnalyticsModule } from './modules/qhse-analytics/qhse-analytics.module';
import { FinanceAnalyticsModule } from './modules/finance-analytics/finance-analytics.module';
import { HrAnalyticsModule } from './modules/hr-analytics/hr-analytics.module';
import { FieldOpsAnalyticsModule } from './modules/field-ops-analytics/field-ops-analytics.module';
import { ProjectAnalyticsModule } from './modules/project-analytics/project-analytics.module';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: env().JWT_ACCESS_SECRET, signOptions: { expiresIn: env().JWT_ACCESS_TTL as any } }),
    }),
    PrismaModule,
    AccessModule,
    AuthModule,
    ModulesModule,
    AuditModule,
    // CacheModule.register({
    //   ttl: 300, // 5 minutes
    //   max: 100, // max 100 keys
    //   stroke: 'key', // use key as string identifier
    // }),
    IntegrationModule,
    LifecycleModule,
    SubconLifecycleModule,
    QHSELifecycleModule,
    FieldOpsModule,
    HrFinanceModule,
    QhseAnalyticsModule,
    FinanceAnalyticsModule,
    HrAnalyticsModule,
    FieldOpsAnalyticsModule,
    ProjectAnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor, multi: true },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor, multi: true },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor, multi: true },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    CacheManagerService,
    PerformanceMiddleware,
    QueryInterceptor,
  ],
})
export class AppModule {}