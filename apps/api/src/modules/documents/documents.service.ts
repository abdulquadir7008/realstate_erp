import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface DocumentListQuery extends PaginationInput {
  folder?: string;
  projectId?: string;
  customerId?: string;
  bookingId?: string;
  visibility?: string;
  tags?: string[];
  version?: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  note?: string;
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
}

export interface UpdateDocumentInput {
  name?: string;
  folder?: string;
  visibility?: string;
  expiresAt?: Date | null;
  tags?: string[];
}

export interface DocumentTag {
  id: string;
  documentId: string;
  tag: string;
  createdAt: Date;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- document list query

  async list(q: DocumentListQuery) {
    const where: any = { deletedAt: null };
    if (q.folder) where.folder = q.folder;
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.visibility) where.visibility = q.visibility;
    if (q.tags && q.tags.length > 0) where.tags = { hasSome: q.tags };
    if (q.version) where.version = q.version;
    if (q.search) where.name = { contains: escapeLike(q.search), mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.document.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  // ---------------- document get with full version history

  async get(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { versions: { orderBy: { version: 'desc' } } },
    });
    if (!doc) throw errors.notFound('Document');
    return doc;
  }

  // ---------------- document create with version 1

  async create(input: {
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
    return this.prisma.document.create({
      data: {
        organizationId: requireOrgId(),
        groupId: randomUUID(),
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        folder: input.folder ?? null,
        projectId: input.projectId ?? null,
        customerId: input.customerId ?? null,
        bookingId: input.bookingId ?? null,
        tags: input.tags ?? [],
        visibility: input.visibility ?? 'ORG',
        version: 1,
        uploadedBy: actorId(),
      },
    });
  }

  // ---------------- document update metadata

  async update(id: string, input: UpdateDocumentInput) {
    await this.get(id);
    return this.prisma.document.update({
      where: { id },
      data: {
        name: input.name ?? null,
        folder: input.folder ?? null,
        visibility: input.visibility ?? null,
        expiresAt: input.expiresAt ?? null,
        tags: input.tags ?? null,
        updatedAt: new Date(),
      },
    });
  }

  // ---------------- version-controlled add version

  async addVersion(id: string, input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    note?: string;
  }) {
    const doc = await this.get(id);
    const version = doc.version + 1;
    await this.prisma.document.update({
      where: { id },
      data: {
        version,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        status: 'ACTIVE',
      },
    });
    return this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        note: input.note ?? null,
        uploadedBy: actorId(),
      },
    });
  }

  // ---------------- list document versions

  async listVersions(id: string) {
    await this.get(id); // verify document exists
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
    });
  }

  // ---------------- document tagging

  async addTag(id: string, tag: string) {
    await this.get(id);
    // Check if tag already exists
    const existingTag = await this.prisma.documentTag.findFirst({
      where: { documentId: id, tag },
    });
    if (existingTag) throw new BadRequestException('Tag already exists for this document');
    return this.prisma.documentTag.create({
      data: {
        documentId: id,
        tag,
        createdAt: new Date(),
      },
    });
  }

  async removeTag(id: string, tag: string) {
    await this.get(id);
    await this.prisma.documentTag.delete({
      where: { documentId: id, tag },
    });
    return { id, tag };
  }

  // ---------------- search documents by tag

  async searchByTag(tag: string) {
    return this.prisma.document.findMany({
      where: { tags: { has: tag }, deletedAt: null },
      include: { project: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------- document remove (soft delete)

  async remove(id: string) {
    await this.get(id);
    await this.prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  // ---------------- version rollback

  async rollbackVersion(id: string, targetVersion: number, rolledBy: string) {
    const doc = await this.get(id);
    if (targetVersion > doc.version || targetVersion < 1) {
      throw new BadRequestException('Invalid target version');
    }
    // Get the target version details
    const targetVersionRecord = await this.prisma.documentVersion.findFirst({
      where: { documentId: id, version: targetVersion },
    });
    if (!targetVersionRecord) {
      throw new BadRequestException('Target version not found');
    }
    // Update document to the target version's state
    await this.prisma.document.update({
      where: { id },
      data: {
        version: targetVersion,
        fileName: targetVersionRecord.fileName,
        mimeType: targetVersionRecord.mimeType,
        sizeBytes: targetVersionRecord.sizeBytes,
        storageKey: targetVersionRecord.storageKey,
        updatedAt: new Date(),
      },
    });
    // Create a new version record for the rollback
    await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: doc.version + 1,
        fileName: targetVersionRecord.fileName,
        mimeType: targetVersionRecord.mimeType,
        sizeBytes: targetVersionRecord.sizeBytes,
        storageKey: targetVersionRecord.storageKey,
        note: `Rolled back to version ${targetVersion} by ${rolledBy}`,
        uploadedBy: rolledBy,
      },
    });
    return { id, targetVersion, rolledBy };
  }
}