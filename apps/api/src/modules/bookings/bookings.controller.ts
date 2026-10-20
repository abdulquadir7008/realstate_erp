import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  createBookingSchema,
  reserveUnitSchema,
  bookingQuerySchema,
  cancelBookingSchema,
  confirmBookingSchema,
  approveDiscountSchema,
  CreateBookingInput,
  ReserveUnitInput,
  CancelBookingInput,
  ConfirmBookingInput,
  ApproveDiscountInput,
  BookingStatus,
} from '@re/shared';

const statusSchema = z.object({
  status: z.enum(Object.values(BookingStatus) as [string, ...string[]]),
  remarks: z.string().trim().max(500).optional(),
});

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  @RequirePermissions('booking:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(bookingQuerySchema, q));
  }

  @Post()
  @RequirePermissions('booking:create')
  create(@Body(new ZodValidationPipe(createBookingSchema)) body: CreateBookingInput) {
    return this.service.create(body);
  }

  @Post('reserve')
  @RequirePermissions('booking:create')
  reserve(@Body(new ZodValidationPipe(reserveUnitSchema)) body: ReserveUnitInput) {
    return this.service.reserve(body);
  }

  @Get(':id')
  @RequirePermissions('booking:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Post(':id/confirm')
  @RequirePermissions('booking:update')
  confirm(@Param('id') id: string, @Body(new ZodValidationPipe(confirmBookingSchema)) body: ConfirmBookingInput) {
    return this.service.confirm(id, body);
  }

  @Post(':id/cancel')
  @RequirePermissions('booking:update')
  cancel(@Param('id') id: string, @Body(new ZodValidationPipe(cancelBookingSchema)) body: CancelBookingInput) {
    return this.service.cancel(id, body);
  }

  @Post(':id/approve-discount')
  @RequirePermissions('booking:approve')
  approveDiscount(@Param('id') id: string, @Body(new ZodValidationPipe(approveDiscountSchema)) body: ApproveDiscountInput) {
    return this.service.approveDiscount(id, body.approved, body.remarks);
  }

  @Patch(':id/status')
  @RequirePermissions('booking:update')
  setStatus(@Param('id') id: string, @Body(new ZodValidationPipe(statusSchema)) body: { status: string; remarks?: string }) {
    return this.service.setStatus(id, body.status, body.remarks);
  }
}
