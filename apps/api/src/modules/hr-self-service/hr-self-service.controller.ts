import 'reflect-metadata';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { HrSelfServiceService } from './hr-self-service.service';
import { SelfServiceEmployeeQuery } from './hr-self-service.service';

@Controller('hr-self-service')
@UseGuards(AuthGuard, RolesGuard)
export class HrSelfServiceController {
  constructor(private readonly hrSelfService: HrSelfServiceService) {}

  // ---------------- employee profile

  @Get('profile/me')
  async getMyProfile(@Query('employeeId') employeeId: string) {
    return this.hrSelfService.getMyProfile(employeeId);
  }

  // ---------------- employee list (manager/admin view)

  @Get('employees')
  async listEmployees(@Query() q: SelfServiceEmployeeQuery) {
    return this.hrSelfService.listEmployees(q);
  }

  // ---------------- payslip history

  @Get('payslips/history')
  async getPayslipHistory(@Query() q: PageOffsetInput, @Query('employeeId') employeeId: string) {
    return this.hrSelfService.getPayslipHistory(employeeId, q);
  }

  // ---------------- leave balance

  @Get('leave/balance')
  async getLeaveBalance(@Query('employeeId') employeeId: string) {
    return this.hrSelfService.getLeaveBalance(employeeId);
  }

  // ---------------- update profile (self-service)

  @Put('profile')
  async updateProfile(@Body() input: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }) {
    // Would need employeeId from auth context
    // For now, return structure
    return { message: 'Profile update endpoint - employeeId required from auth token' };
  }

  // ---------------- apply for leave (self-service)

  @Post('leave/apply')
  async applyForLeave(@Body() input: {
    leaveType: 'ANNUAL' | 'SICK' | 'CASUAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
    startDate: Date;
    endDate: Date;
    reason: string;
    totalDays: number;
  }) {
    // Would need employeeId from auth context
    // For now, return structure
    return { message: 'Apply leave endpoint - employeeId required from auth token', input };
  }

  // ---------------- list pending leaves (manager view)

  @Get('leave/pending')
  async listPendingLeaves(@Query('limit') limit?: number) {
    return this.hrSelfService.listPendingLeaves(limit);
  }
}