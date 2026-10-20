import { Controller, Get, Query, Req } from '@nestjs/common';
import { TenantService } from './saas-admin.service';
import { RequirePermissions } from '../../common/decorators';
import { paginationSchema } from '@re/shared';
import { parseQuery } from '../../common/pipes/zod-validation.pipe';

@Controller('saas-admin')
@RequirePermissions('organization:read')
export class SaasAdminController {
  constructor(private readonly service: TenantService) {}

  @Get('organizations')
  getOrgs(@Query() q: any, @Req() req: any) {
    const p = parseQuery(paginationSchema, q);
    return this.service.listOrgs(p);
  }
}
