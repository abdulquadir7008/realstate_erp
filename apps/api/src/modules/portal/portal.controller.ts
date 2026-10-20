import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { PortalService } from './portal.service';
import { CustomerAllowed } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
  category: z.enum(['COMPLAINT', 'SERVICE', 'MAINTENANCE', 'HANDOVER', 'WARRANTY', 'FEEDBACK', 'OTHER']).default('SERVICE'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  bookingId: z.string().uuid().optional(),
});

const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(400).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(80).optional(),
  pincode: z.string().trim().max(12).optional(),
});

export type PortalTicketInput = z.infer<typeof ticketSchema>;
export type PortalProfileInput = z.infer<typeof profileSchema>;

@ApiTags('Customer Portal')
@CustomerAllowed()
@Controller('portal')
export class PortalController {
  constructor(private readonly service: PortalService) {}

  @Get('session')
  session() {
    return this.service.session();
  }

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Get('properties')
  properties() {
    return this.service.properties();
  }

  @Get('bookings/:id')
  booking(@Param('id') id: string) {
    return this.service.booking(id);
  }

  @Get('schedule')
  schedule() {
    return this.service.schedule();
  }

  @Get('payments')
  payments() {
    return this.service.payments();
  }

  @Get('invoices')
  invoices() {
    return this.service.invoices();
  }

  @Get('documents')
  documents() {
    return this.service.documents();
  }

  @Get('construction')
  construction() {
    return this.service.construction();
  }

  @Get('tickets')
  tickets() {
    return this.service.tickets();
  }

  @Post('tickets')
  createTicket(@Body(new ZodValidationPipe(ticketSchema)) body: PortalTicketInput) {
    return this.service.createTicket(body);
  }

  @Get('tickets/:id')
  ticket(@Param('id') id: string) {
    return this.service.ticket(id);
  }

  @Post('tickets/:id/messages')
  addMessage(@Param('id') id: string, @Body(new ZodValidationPipe(messageSchema)) body: { body: string }) {
    return this.service.addTicketMessage(id, body.body);
  }

  @Get('notifications')
  notifications() {
    return this.service.notifications();
  }

  @Patch('profile')
  updateProfile(@Body(new ZodValidationPipe(profileSchema)) body: PortalProfileInput) {
    return this.service.updateProfile(body);
  }
}
