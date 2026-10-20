import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated } from '../../common/utils/pagination';
import { requireOrgId } from '../../common/utils/tenant';
import { currentUserId } from '../../prisma/tenant-context';
import { NotificationChannel, PaginationInput } from '@re/shared';

export interface NotificationListQuery extends PaginationInput {
  unreadOnly?: boolean;
  type?: string;
}

export interface CreateNotificationInput {
  title: string;
  body?: string;
  type?: string;
  channel?: string;
  userId?: string | null;
  roleCode?: string | null;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: NotificationListQuery) {
    const userId = currentUserId();
    const where: any = {
      OR: [{ userId }, { userId: null }],
    };
    if (q.unreadOnly) where.readAt = null;
    if (q.type) where.type = q.type;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async unreadCount() {
    const userId = currentUserId();
    const count = await this.prisma.notification.count({ where: { OR: [{ userId }, { userId: null }], readAt: null } });
    return { count };
  }

  async create(input: CreateNotificationInput) {
    const channel = (input.channel ?? 'IN_APP') as NotificationChannel;
    return this.prisma.notification.create({
      data: {
        organizationId: requireOrgId(),
        userId: input.userId ?? null,
        roleCode: input.roleCode ?? null,
        type: input.type ?? 'GENERAL',
        title: input.title,
        body: input.body ?? null,
        channel,
        data: (input.data ?? {}) as any,
        sentAt: new Date(),
      },
    });
  }

  async markRead(id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id } });
    if (!notif) throw errors.notFound('Notification');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async markAllRead() {
    const userId = currentUserId();
    await this.prisma.notification.updateMany({ where: { OR: [{ userId }, { userId: null }], readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }

  async remove(id: string) {
    const notif = await this.prisma.notification.findFirst({ where: { id } });
    if (!notif) throw errors.notFound('Notification');
    await this.prisma.notification.delete({ where: { id } });
    return { id };
  }
}
