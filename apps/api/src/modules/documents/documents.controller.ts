import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import { paginationSchema, documentUploadSchema, documentVersionSchema, DocumentUploadInput, DocumentVersionInput } from '@re/shared';

const documentQuerySchema = paginationSchema.extend({
  folder: z.string().optional(),
  projectId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  visibility: z.string().optional(),
});
const updateDocumentSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  folder: z.string().optional(),
  visibility: z.enum(['INTERNAL', 'CUSTOMER']).optional(),
  expiresAt: z.coerce.date().optional().nullable(),
});

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @RequirePermissions('document:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(documentQuerySchema, q));
  }

  @Post()
  @RequirePermissions('document:create')
  create(@Body(new ZodValidationPipe(documentUploadSchema)) body: DocumentUploadInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('document:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateDocumentSchema)) body: z.infer<typeof updateDocumentSchema>) {
    return this.service.update(id, body);
  }

  @Post(':id/versions')
  @RequirePermissions('document:create')
  addVersion(@Param('id') id: string, @Body(new ZodValidationPipe(documentVersionSchema)) body: DocumentVersionInput) {
    return this.service.addVersion(id, body);
  }

  @Delete(':id')
  @RequirePermissions('document:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
