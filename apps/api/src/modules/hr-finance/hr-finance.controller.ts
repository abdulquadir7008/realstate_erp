import 'reflect-metadata';
import { Controller, Post, Body, Param, Get, Query, UseGuards } from '@nestjs/common';
import { HrFinanceService } from './hr-finance.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('hr-finance')
@UseGuards(AuthGuard, RolesGuard)
export class HrFinanceController {
  constructor(private readonly hrFinanceService: HrFinanceService) {}

  // ---------------- Payroll Posting to Finance

  @Post('payroll/post')
  async postPayrollToFinance(@Body() input: {
    employeeId: string;
    periodFrom: Date;
    periodTo: Date;
    netPay: number;
    basicSalary: number;
    allowances: number;
    overtime: number;
    deductions: number;
    payrollId: string;
  }) {
    return this.hrFinanceService.postPayrollToFinance(input);
  }

  // ---------------- Employee Cost Tracking

  @Get('employee/cost-tracking/:employeeId')
  async getEmployeeCostTracking(@Param('employeeId') employeeId: string, @Query('from') from?: Date, @Query('to') to?: Date) {
    return this.hrFinanceService.getEmployeeCostTracking(employeeId, from, to);
  }

  // ---------------- Department Budget Analysis

  @Get('department/budget-analysis/:departmentId')
  async getDepartmentBudgetAnalysis(@Param('departmentId') departmentId: string, @Query('from') from?: Date, @Query('to') to?: Date) {
    return this.hrFinanceService.getDepartmentBudgetAnalysis(departmentId, from, to);
  }
}