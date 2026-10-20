import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OrganizationModule } from './organization/organization.module';
import { SaasAdminModule } from './saas-admin/saas-admin.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ProjectsModule } from './projects/projects.module';
import { InventoryModule } from './inventory/inventory.module';
import { CustomersModule } from './customers/customers.module';
import { LeadsModule } from './leads/leads.module';
import { BookingsModule } from './bookings/bookings.module';
import { FinanceModule } from './finance/finance.module';
import { HrModule } from './hr/hr.module';
import { ProcurementModule } from './procurement/procurement.module';
import { ConstructionModule } from './construction/construction.module';
import { TicketsModule } from './tickets/tickets.module';
import { DocumentsModule } from './documents/documents.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AiModule } from './ai/ai.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    AuthModule,
    OrganizationModule,
    SaasAdminModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    InventoryModule,
    CustomersModule,
    LeadsModule,
    BookingsModule,
    FinanceModule,
    HrModule,
    ProcurementModule,
    ConstructionModule,
    TicketsModule,
    DocumentsModule,
    WorkflowsModule,
    NotificationsModule,
    ReportsModule,
    AiModule,
    PortalModule,
  ],
})
export class ModulesModule {}
