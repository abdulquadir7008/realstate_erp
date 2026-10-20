import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { DocumentUploadInput, DocumentVersionInput, PaginationInput } from '@re/shared';

export interface DocumentListQuery extends PaginationInput {
  folder?: string;
  projectId?: string;
  customerId?: string;
  bookingId?: string;
  visibility?: string;
}

export interface UpdateDocumentInput {
  name?: string;
  folder?: string;
  visibility?: string;
  expiresAt?: Date | null;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: DocumentListQuery) {
    const where: any = { deletedAt: null };
    if (q.folder) where.folder = q.folder;
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.visibility) where.visibility = q.visibility;
    if (q.search) where.name = { contains: escapeLike(q.search), mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.document.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async get(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!doc) throw errors.notFound('Document');
    return doc;
  }

  async create(input: DocumentUploadInput) {
    const { fileName, mimeType, sizeBytes, storageKey, ...meta } = input;
    return this.prisma.document.create({
      data: {
        ...meta,
        organizationId: requireOrgId(),
        groupId: randomUUID(),
        fileName,
        mimeType,
        sizeBytes,
        storageKey,
        version: 1,
        uploadedBy: actorId(),
      },
    });
  }

  async update(id: string, input: UpdateDocumentInput) {
    await this.get(id);
    return this.prisma.document.update({ where: { id }, data: input as any });
  }

  async addVersion(id: string, input: DocumentVersionInput) {
    const doc = await this.get(id);
    const version = doc.version + 1;
    return this.prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: {
          version,
          fileName: input.fileName,
          sizeBytes: input.sizeBytes,
          storageKey: input.storageKey,
          status: 'ACTIVE',
        },
      });
      return tx.documentVersion.create({
        data: {
          documentId: id,
          version,
          fileName: input.fileName,
          sizeBytes: input.sizeBytes,
          storageKey: input.storageKey,
          note: input.note ?? null,
          uploadedBy: actorId(),
        },
      });
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }
}
