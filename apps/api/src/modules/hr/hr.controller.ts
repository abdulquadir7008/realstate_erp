import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  employeeSchema,
  updateEmployeeSchema,
  attendanceSchema,
  leaveSchema,
  EmployeeInput,
  UpdateEmployeeInput,
  AttendanceInput,
  LeaveInput,
} from '@re/shared';

const employeeQuerySchema = paginationSchema.extend({ departmentId: z.string().uuid().optional(), status: z.string().optional() });
const attendanceQuerySchema = paginationSchema.extend({ employeeId: z.string().uuid().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() });
const leaveQuerySchema = paginationSchema.extend({ employeeId: z.string().uuid().optional(), status: z.string().optional() });
const decideLeaveSchema = z.object({ approved: z.boolean() });

@ApiTags('HR')
@Controller('hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @Get('employees')
  @RequirePermissions('employee:read')
  listEmployees(@Query() q: unknown) {
    return this.service.listEmployees(parseQuery(employeeQuerySchema, q));
  }

  @Post('employees')
  @RequirePermissions('employee:create')
  createEmployee(@Body(new ZodValidationPipe(employeeSchema)) body: EmployeeInput) {
    return this.service.createEmployee(body);
  }

  @Get('employees/:id')
  @RequirePermissions('employee:read')
  getEmployee(@Param('id') id: string) {
    return this.service.getEmployee(id);
  }

  @Patch('employees/:id')
  @RequirePermissions('employee:update')
  updateEmployee(@Param('id') id: string, @Body(new ZodValidationPipe(updateEmployeeSchema)) body: UpdateEmployeeInput) {
    return this.service.updateEmployee(id, body);
  }

  @Delete('employees/:id')
  @RequirePermissions('employee:delete')
  removeEmployee(@Param('id') id: string) {
    return this.service.removeEmployee(id);
  }

  @Get('attendance')
  @RequirePermissions('employee:read')
  listAttendance(@Query() q: unknown) {
    return this.service.listAttendance(parseQuery(attendanceQuerySchema, q));
  }

  @Post('attendance')
  @RequirePermissions('employee:create')
  upsertAttendance(@Body(new ZodValidationPipe(attendanceSchema)) body: AttendanceInput) {
    return this.service.upsertAttendance(body);
  }

  @Get('leaves')
  @RequirePermissions('employee:read')
  listLeaves(@Query() q: unknown) {
    return this.service.listLeaves(parseQuery(leaveQuerySchema, q));
  }

  @Post('leaves')
  @RequirePermissions('employee:create')
  createLeave(@Body(new ZodValidationPipe(leaveSchema)) body: LeaveInput) {
    return this.service.createLeave(body);
  }

  @Post('leaves/:id/decide')
  @RequirePermissions('employee:approve')
  decideLeave(@Param('id') id: string, @Body(new ZodValidationPipe(decideLeaveSchema)) body: z.infer<typeof decideLeaveSchema>) {
    return this.service.decideLeave(id, body.approved);
  }
}
