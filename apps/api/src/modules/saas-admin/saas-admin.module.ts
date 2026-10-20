import { Module } from '@nestjs/common';
import { SaasAdminController } from './saas-admin.controller';
import { SaasAdminService, TenantService } from './saas-admin.service';

@Module({
  controllers: [SaasAdminController],
  providers: [SaasAdminService, TenantService],
  exports: [SaasAdminService, TenantService],
})
export class SaasAdminModule {}
