import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationInput } from '@re/shared';
import { pageOffset, paginated } from '../../common/utils/pagination';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrgs(p: PaginationInput) {
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip: pageOffset(p.page, p.limit),
        take: p.limit,
        orderBy: { createdAt: p.sortDir ?? 'desc' },
      }),
      this.prisma.organization.count(),
    ]);
    return paginated(items, total, p.page, p.limit);
  }
}

@Injectable()
export class SaasAdminService extends TenantService {}
