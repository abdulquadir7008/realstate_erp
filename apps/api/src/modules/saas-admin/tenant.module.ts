import { Module } from '@nestjs/common';
import { TenantService } from './saas-admin.service';
import { SaasAdminModule as A } from './saas-admin.module';

@Module({ imports: [A], providers: [TenantService], exports: [TenantService] })
export class TenantModule {}
