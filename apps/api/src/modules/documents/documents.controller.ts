import 'reflect-metadata';
import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentListQuery } from './documents.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('documents')
@UseGuards(AuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ---------------- document list

  @Get()
  async list(@Query() q: DocumentListQuery) {
    return this.documentsService.list(q);
  }

  // ---------------- document get with version history

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.documentsService.get(id);
  }

  // ---------------- document create

  @Post()
  async create(@Body() input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    folder?: string;
    projectId?: string;
    customerId?: string;
    bookingId?: string;
    tags?: string[];
    visibility?: string;
  }) {
    return this.documentsService.create(input);
  }

  // ---------------- document update metadata

  @Put(':id')
  async update(@Param('id') id: string, @Body() input: UpdateDocumentInput) {
    return this.documentsService.update(id, input);
  }

  // ---------------- add new version

  @Post(':id/versions')
  async addVersion(@Param('id') id: string, @Body() input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    note?: string;
  }) {
    return this.documentsService.addVersion(id, input);
  }

  // ---------------- list document versions

  @Get(':id/versions')
  async listVersions(@Param('id') id: string) {
    return this.documentsService.listVersions(id);
  }

  // ---------------- add tag

  @Post(':id/tags')
  async addTag(@Param('id') id: string, @Body() tag: string) {
    return this.documentsService.addTag(id, tag);
  }

  // ---------------- remove tag

  @Delete(':id/tags/:tag')
  async removeTag(@Param('id') id: string, @Param('tag') tag: string) {
    return this.documentsService.removeTag(id, tag);
  }

  // ---------------- search by tag

  @Get('tag/:tag')
  async searchByTag(@Param('tag') tag: string) {
    return this.documentsService.searchByTag(tag);
  }

  // ---------------- document remove (soft delete)

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }

  // ---------------- version rollback

  @Post(':id/rollback')
  async rollbackVersion(@Param('id') id: string, @Body() input: {
    targetVersion: number;
    rolledBy: string;
  }) {
    return this.documentsService.rollbackVersion(id, input.targetVersion, input.rolledBy);
  }
}