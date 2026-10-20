import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import { notificationQuerySchema } from '@re/shared';

const createNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000).optional(),
  type: z.string().trim().max(60).optional(),
  channel: z.enum(['IN_APP', 'EMAIL', 'PUSH', 'SMS']).optional(),
  userId: z.string().uuid().optional().nullable(),
  roleCode: z.string().trim().max(60).optional().nullable(),
  data: z.record(z.unknown()).optional(),
});

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermissions('notification:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(notificationQuerySchema, q));
  }

  @Get('unread-count')
  @RequirePermissions('notification:read')
  unreadCount() {
    return this.service.unreadCount();
  }

  @Post()
  @RequirePermissions('notification:create')
  create(@Body(new ZodValidationPipe(createNotificationSchema)) body: z.infer<typeof createNotificationSchema>) {
    return this.service.create(body);
  }

  @Post('read-all')
  @RequirePermissions('notification:update')
  markAllRead() {
    return this.service.markAllRead();
  }

  @Post(':id/read')
  @RequirePermissions('notification:update')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }

  @Delete(':id')
  @RequirePermissions('notification:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
