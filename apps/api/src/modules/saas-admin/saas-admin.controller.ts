import { Controller, Get, Patch, Post, Query, Param, Body, Req } from '@nestjs/common';
import { TenantService } from './saas-admin.service';
import { RequirePermissions, SaasOnly, CurrentUser } from '../../common/decorators';
import { paginationSchema, organizationStatusSchema, OrganizationStatusInput, SessionUser } from '@re/shared';
import { parseQuery, ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('saas-admin')
@SaasOnly()
@RequirePermissions('organization:read')
export class SaasAdminController {
  constructor(private readonly service: TenantService) {}

  @Get('organizations')
  getOrgs(@Query() q: any, @Req() req: any) {
    const p = parseQuery(paginationSchema, q);
    return this.service.listOrgs(p);
  }

  @Get('organizations/:id')
  getOrg(@Param('id') id: string) {
    return this.service.getOrg(id);
  }

  @Post('organizations/:id/status')
  @RequirePermissions('organization:manage')
  setOrgStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(organizationStatusSchema)) body: OrganizationStatusInput,
    @CurrentUser() actor: SessionUser,
  ) {
    return this.service.setOrgStatus(id, body.status, actor?.id ?? null, body.reason ?? null);
  }
}
