import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface BudgetAlertNotice {
  organizationId: string;
  budgetId: string;
  budgetLineId: string | null;
  type: string;
  threshold: number;
  message: string;
  details?: unknown;
}

@Injectable()
export class BudgetAlertNotifier {
  private readonly logger = new Logger(BudgetAlertNotifier.name);
  private readonly transporter: any;

  constructor(private readonly prisma: PrismaService) {
    const host = process.env.SMTP_HOST;
    if (host) {
      // Lazy require keeps nodemailer optional at boot for deployments without SMTP.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const port = Number(process.env.SMTP_PORT ?? 587);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASSWORD
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
      });
    }
  }

  /**
   * Delivers a budget threshold alert through in-app notifications and (when SMTP is
   * configured) email to users holding budget:approve. Delivery is best-effort: the
   * budget transaction has already committed and must not fail because of a mail outage.
   */
  async deliver(notice: BudgetAlertNotice): Promise<void> {
    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          organizationId: notice.organizationId,
          deletedAt: null,
          roles: { some: { role: { permissions: { some: { permission: { code: 'budget:approve' } } } } } },
        },
        select: { id: true, email: true },
        take: 100,
      });

      const title = `Budget ${notice.type} alert (${notice.threshold}%)`;
      const data = {
        budgetId: notice.budgetId,
        budgetLineId: notice.budgetLineId,
        level: notice.type,
        threshold: notice.threshold,
        details: notice.details ?? null,
      };

      if (recipients.length === 0) {
        await this.prisma.notification.create({
          data: {
            organizationId: notice.organizationId,
            userId: null,
            roleCode: 'FINANCE_MANAGER',
            type: 'BUDGET_ALERT',
            title,
            body: notice.message,
            channel: 'IN_APP',
            data: data as any,
            sentAt: new Date(),
          },
        });
      } else {
        await this.prisma.notification.createMany({
          data: recipients.map((user) => ({
            organizationId: notice.organizationId,
            userId: user.id,
            type: 'BUDGET_ALERT',
            title,
            body: notice.message,
            channel: 'IN_APP',
            data: data as any,
            sentAt: new Date(),
          })),
        });
      }

      if (!this.transporter) return;
      const to = recipients.map((user) => user.email).filter(Boolean);
      if (to.length === 0) return;

      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'PropERP <no-reply@realestate.local>',
        to,
        subject: `[Budget ${notice.type}] ${notice.message}`,
        text: `${notice.message}\n\nBudget: ${notice.budgetId}\nProjected utilisation: ${notice.threshold}%\n\nThis alert was generated automatically by PropERP.`,
      });
    } catch (error) {
      this.logger.warn(`Budget alert delivery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
