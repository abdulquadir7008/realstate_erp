import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  ticketSchema,
  updateTicketSchema,
  ticketMessageSchema,
  handoverSchema,
  updateHandoverSchema,
  TicketInput,
  UpdateTicketInput,
  TicketMessageInput,
  HandoverInput,
  UpdateHandoverInput,
} from '@re/shared';

const ticketQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});
const handoverQuerySchema = paginationSchema.extend({ status: z.string().optional() });

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly service: TicketsService) {}

  @Get()
  @RequirePermissions('ticket:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(ticketQuerySchema, q));
  }

  @Post()
  @RequirePermissions('ticket:create')
  create(@Body(new ZodValidationPipe(ticketSchema)) body: TicketInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('ticket:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('ticket:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateTicketSchema)) body: UpdateTicketInput) {
    return this.service.update(id, body);
  }

  @Post(':id/messages')
  @RequirePermissions('ticket:update')
  addMessage(@Param('id') id: string, @Body(new ZodValidationPipe(ticketMessageSchema)) body: TicketMessageInput) {
    return this.service.addMessage(id, body);
  }

  @Get('handovers/list')
  @RequirePermissions('handover:read')
  listHandovers(@Query() q: unknown) {
    return this.service.listHandovers(parseQuery(handoverQuerySchema, q));
  }

  @Post('handovers')
  @RequirePermissions('handover:create')
  createHandover(@Body(new ZodValidationPipe(handoverSchema)) body: HandoverInput) {
    return this.service.createHandover(body);
  }

  @Patch('handovers/:id')
  @RequirePermissions('handover:update')
  updateHandover(@Param('id') id: string, @Body(new ZodValidationPipe(updateHandoverSchema)) body: UpdateHandoverInput) {
    return this.service.updateHandover(id, body);
  }
}
