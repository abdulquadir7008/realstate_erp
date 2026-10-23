import { Controller, Get, Post, Patch, Delete, Query, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BoqService, BoqLineService, RateMasterService } from './boq.service';
import { RequirePermissions } from '../../common/decorators';
import { paginationSchema, boqSchema, updateBoqSchema, boqLineSchema, updateBoqLineSchema, boqVersionSchema, rateMasterSchema, updateRateMasterSchema, rateVersionSchema, BoqInput, UpdateBoqInput, BoqLineInput, UpdateBoqLineInput, BoqVersionInput, RateMasterInput, UpdateRateMasterInput, RateVersionInput } from '@re/shared';
import { parseQuery } from '../../common/pipes/zod-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { errors } from '../../common/api-error';

@Controller('projects/:projectId')
export class BoqController {
  constructor(
    private readonly boqService: BoqService,
    private readonly boqLineService: BoqLineService,
    private readonly rateMasterService: RateMasterService,
  ) {}

  // ============================================================ BOQ

  @Get('boqs')
  @RequirePermissions('project:read')
  async getBoqs(
    @Param('projectId') projectId: string,
    @Query() q: any,
  ) {
    const p = parseQuery(paginationSchema.extend({
      status: z.string().optional(),
      wbsId: z.string().uuid().optional(),
    }), q);
    return this.boqService.findAll(projectId, p);
  }

  @Post('boqs')
  @RequirePermissions('project:create')
  async createBoq(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(boqSchema)) body: Omit<BoqInput, 'organization' | 'project'>,
  ) {
    return this.boqService.create(projectId, body as any);
  }

  @Get('boqs/:id')
  @RequirePermissions('project:read')
  async getBoq(@Param('id') id: string) {
    return this.boqService.findOne(id);
  }

  @Get('boqs/:id/tree')
  @RequirePermissions('project:read')
  async getBoqTree(@Param('id') id: string) {
    return this.boqService.getTree(id);
  }

  @Patch('boqs/:id')
  @RequirePermissions('project:update')
  async updateBoq(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBoqSchema)) body: UpdateBoqInput,
  ) {
    return this.boqService.update(id, body);
  }

  @Patch('boqs/:id/status')
  @RequirePermissions('project:update')
  async updateBoqStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED']) }))) body: { status: string },
  ) {
    return this.boqService.updateStatus(id, body.status);
  }

  @Post('boqs/:id/versions')
  @RequirePermissions('project:create')
  async createBoqVersion(
    @Param('id') boqId: string,
    @Body(new ZodValidationPipe(boqVersionSchema)) body: Omit<BoqVersionInput, 'version'>,
  ) {
    return this.boqService.createVersion(boqId, body as any);
  }

  @Get('boqs/:id/versions')
  @RequirePermissions('project:read')
  async getBoqVersions(@Param('id') boqId: string) {
    return this.boqService.getVersions(boqId);
  }

  @Post('boqs/:id/recalculate')
  @RequirePermissions('project:update')
  async recalculateBoq(@Param('id') boqId: string) {
    return this.boqService.recalculateTotals(boqId);
  }

  @Post('boqs/import')
  @RequirePermissions('project:create')
  @UseInterceptors(FileInterceptor('file'))
  async importBoq(
    @Param('projectId') projectId: string,
    @UploadedFile() file: any,
    @Query('wbsId') wbsId?: string,
  ) {
    if (!file) throw errors.validation('File is required');
    return this.boqService.importFromExcel(projectId, file.buffer, wbsId);
  }

  @Delete('boqs/:id')
  @RequirePermissions('project:delete')
  async deleteBoq(@Param('id') id: string) {
    return this.boqService.remove(id);
  }

  // ============================================================ BOQ Lines

  @Get('boqs/:boqId/lines')
  @RequirePermissions('project:read')
  async getBoqLines(
    @Param('boqId') boqId: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.boqLineService.findAll(boqId, { parentId: parentId ?? null });
  }

  @Post('boqs/:boqId/lines')
  @RequirePermissions('project:create')
  async createBoqLine(
    @Param('boqId') boqId: string,
    @Body(new ZodValidationPipe(boqLineSchema)) body: BoqLineInput,
  ) {
    return this.boqLineService.create(boqId, body);
  }

  @Get('boqs/:boqId/lines/:id')
  @RequirePermissions('project:read')
  async getBoqLine(@Param('id') id: string) {
    return this.boqLineService.findOne(id);
  }

  @Patch('boqs/:boqId/lines/:id')
  @RequirePermissions('project:update')
  async updateBoqLine(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBoqLineSchema)) body: UpdateBoqLineInput,
  ) {
    return this.boqLineService.update(id, body);
  }

  @Patch('boqs/:boqId/lines/:id/move')
  @RequirePermissions('project:update')
  async moveBoqLine(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({
      newParentId: z.string().uuid().nullable(),
      newOrder: z.coerce.number().int().min(0),
    }))) body: { newParentId: string | null; newOrder: number },
  ) {
    return this.boqLineService.move(id, body.newParentId, body.newOrder);
  }

  @Delete('boqs/:boqId/lines/:id')
  @RequirePermissions('project:delete')
  async deleteBoqLine(@Param('id') id: string) {
    return this.boqLineService.remove(id);
  }

  // ============================================================ Rate Master

  @Get('rate-masters')
  @RequirePermissions('project:read')
  async getRateMasters(
    @Param('projectId') projectId: string,
    @Query() q: any,
  ) {
    const orgId = (await this.boqService['prisma'].project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    }))?.organizationId;
    const p = parseQuery(z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      type: z.string().optional(),
      status: z.string().optional(),
      sortDir: z.enum(['asc', 'desc']).default('desc'),
    }), q);
    return this.rateMasterService.findAll({ ...p, organizationId: orgId });
  }

  @Post('rate-masters')
  @RequirePermissions('project:create')
  async createRateMaster(
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(rateMasterSchema)) body: any,
  ) {
    const project = await this.boqService['prisma'].project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    return this.rateMasterService.create({ ...body, organizationId: project?.organizationId });
  }

  @Get('rate-masters/:id')
  @RequirePermissions('project:read')
  async getRateMaster(@Param('id') id: string) {
    return this.rateMasterService.findOne(id);
  }

  @Get('rate-masters/:id/applicable-rate')
  @RequirePermissions('project:read')
  async getApplicableRate(
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    return this.rateMasterService.getApplicableRate(id, date ? new Date(date) : new Date());
  }

  @Patch('rate-masters/:id')
  @RequirePermissions('project:update')
  async updateRateMaster(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRateMasterSchema)) body: any,
  ) {
    return this.rateMasterService.update(id, body);
  }

  @Patch('rate-masters/:id/status')
  @RequirePermissions('project:update')
  async updateRateMasterStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(z.object({ status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']) }))) body: { status: string },
  ) {
    return this.rateMasterService.updateStatus(id, body.status);
  }

  @Post('rate-masters/:id/versions')
  @RequirePermissions('project:create')
  async createRateVersion(
    @Param('id') rateMasterId: string,
    @Body(new ZodValidationPipe(rateVersionSchema)) body: any,
  ) {
    return this.rateMasterService.createVersion(rateMasterId, body);
  }

  @Get('rate-masters/:id/versions')
  @RequirePermissions('project:read')
  async getRateVersions(@Param('id') rateMasterId: string) {
    return this.rateMasterService.getVersions(rateMasterId);
  }

  @Delete('rate-masters/:id')
  @RequirePermissions('project:delete')
  async deleteRateMaster(@Param('id') id: string) {
    return this.rateMasterService.remove(id);
  }
}