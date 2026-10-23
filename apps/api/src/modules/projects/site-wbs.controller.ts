import { Controller, Get, Post, Patch, Delete, Query, Param, Body } from '@nestjs/common';
import { SiteService, WbsService, WbsItemService } from './site-wbs.service';
import { RequirePermissions } from '../../common/decorators';
import { paginationSchema, siteSchema, updateSiteSchema, wbsSchema, updateWbsSchema, wbsItemSchema, updateWbsItemSchema, wbsVersionSchema, SiteInput, UpdateSiteInput, WbsInput, UpdateWbsInput, WbsItemInput, UpdateWbsItemInput, WbsVersionInput } from '@re/shared';
import { parseQuery } from '../../common/pipes/zod-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { WBSStatus } from '@prisma/client';

@Controller('projects/:projectId')
export class SiteWbsController {
  constructor(
    private readonly siteService: SiteService,
    private readonly wbsService: WbsService,
    private readonly wbsItemService: WbsItemService,
  ) {}

  // ============================================================ Sites

  @Get('sites')
  @RequirePermissions('project:read')
  async getSites(
    @Param('projectId') projectId: string,
    @Query() q: any,
  ) {
    const p = parseQuery(paginationSchema, q);
    return this.siteService.findAll(projectId, p);
  }

  @Post('sites')
  @RequirePermissions('project:create')
  async createSite(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(siteSchema)) body: SiteInput,
  ) {
    return this.siteService.create(projectId, body);
  }

  @Get('sites/:id')
  @RequirePermissions('project:read')
  async getSite(@Param('id') id: string) {
    return this.siteService.findOne(id);
  }

  @Patch('sites/:id')
  @RequirePermissions('project:update')
  async updateSite(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSiteSchema)) body: UpdateSiteInput,
  ) {
    return this.siteService.update(id, body);
  }

  @Delete('sites/:id')
  @RequirePermissions('project:delete')
  async deleteSite(@Param('id') id: string) {
    return this.siteService.remove(id);
  }

  // ============================================================ WBS

  @Get('wbs')
  @RequirePermissions('project:read')
  async getWbsList(
    @Param('projectId') projectId: string,
    @Query() q: any,
  ) {
    const p = parseQuery(paginationSchema.extend({
      siteId: z.string().uuid().optional(),
      status: z.string().optional(),
    }), q);
    return this.wbsService.findAll(projectId, p);
  }

  @Post('wbs')
  @RequirePermissions('project:create')
  async createWbs(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(wbsSchema)) body: WbsInput,
  ) {
    return this.wbsService.create(projectId, body);
  }

  @Get('wbs/:id')
  @RequirePermissions('project:read')
  async getWbs(@Param('id') id: string) {
    return this.wbsService.findOne(id);
  }

  @Get('wbs/:id/tree')
  @RequirePermissions('project:read')
  async getWbsTree(@Param('id') id: string) {
    return this.wbsService.getTree(id);
  }

  @Patch('wbs/:id')
  @RequirePermissions('project:update')
  async updateWbs(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWbsSchema)) body: UpdateWbsInput,
  ) {
    return this.wbsService.update(id, body);
  }

  @Patch('wbs/:id/status')
  @RequirePermissions('project:update')
  async updateWbsStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']) }))) body: { status: WBSStatus },
  ) {
    return this.wbsService.updateStatus(id, body.status);
  }

  @Post('wbs/:id/versions')
  @RequirePermissions('project:create')
  async createWbsVersion(
    @Param('id') wbsId: string,
    @Body(new ZodValidationPipe(wbsVersionSchema)) body: WbsVersionInput,
  ) {
    return this.wbsService.createVersion(wbsId, body);
  }

  @Get('wbs/:id/versions')
  @RequirePermissions('project:read')
  async getWbsVersions(@Param('id') wbsId: string) {
    return this.wbsService.getVersions(wbsId);
  }

  @Delete('wbs/:id')
  @RequirePermissions('project:delete')
  async deleteWbs(@Param('id') id: string) {
    return this.wbsService.remove(id);
  }

  // ============================================================ WBS Items

  @Get('wbs/:wbsId/items')
  @RequirePermissions('project:read')
  async getWbsItems(
    @Param('wbsId') wbsId: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.wbsItemService.findAll(wbsId, { parentId: parentId ?? null });
  }

  @Post('wbs/:wbsId/items')
  @RequirePermissions('project:create')
  async createWbsItem(
    @Param('wbsId') wbsId: string,
    @Body(new ZodValidationPipe(wbsItemSchema)) body: WbsItemInput,
  ) {
    return this.wbsItemService.create(wbsId, body);
  }

  @Get('wbs/:wbsId/items/:id')
  @RequirePermissions('project:read')
  async getWbsItem(@Param('id') id: string) {
    return this.wbsItemService.findOne(id);
  }

  @Patch('wbs/:wbsId/items/:id')
  @RequirePermissions('project:update')
  async updateWbsItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWbsItemSchema)) body: UpdateWbsItemInput,
  ) {
    return this.wbsItemService.update(id, body);
  }

  @Patch('wbs/:wbsId/items/:id/move')
  @RequirePermissions('project:update')
  async moveWbsItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({
      newParentId: z.string().uuid().nullable(),
      newOrder: z.coerce.number().int().min(0),
    }))) body: { newParentId: string | null; newOrder: number },
  ) {
    return this.wbsItemService.move(id, body.newParentId, body.newOrder);
  }

  @Delete('wbs/:wbsId/items/:id')
  @RequirePermissions('project:delete')
  async deleteWbsItem(@Param('id') id: string) {
    return this.wbsItemService.remove(id);
  }

  // ============================================================ WBS Versions

  @Get('wbs/:id/versions')
  @RequirePermissions('project:read')
  async getVersions(@Param('id') wbsId: string) {
    return this.wbsService.getVersions(wbsId);
  }
}