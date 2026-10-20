import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createRoleSchema, updateRoleSchema, CreateRoleInput, UpdateRoleInput } from '@re/shared';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  list() {
    return this.service.list();
  }

  @Get('permissions')
  @RequirePermissions('role:read')
  permissions() {
    return this.service.permissionCatalog();
  }

  @Post()
  @RequirePermissions('role:create')
  create(@Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('role:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('role:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('role:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
