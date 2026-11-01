import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
// import { CacheManagerService } from '../../common/utils/cache/cache-manager.service';
import * as crypto from 'crypto';
import { PaginationInput } from '@re/shared';

export interface EmployeeListQuery extends PaginationInput {
  departmentId?: string;
  status?: string;
}

export interface AttendanceListQuery extends PaginationInput {
  employeeId?: string;
  from?: Date;
  to?: Date;
}

export interface LeaveListQuery extends PaginationInput {
  employeeId?: string;
  status?: string;
}

export interface TimesheetListQuery extends PaginationInput {
  employeeId?: string;
  from?: Date;
  to?: Date;
  status?: string;
}

export interface PayrollCalculationInput {
  employeeId: string;
  periodFrom: Date;
  periodTo: Date;
  includeBonuses?: boolean;
  includeDeductions?: boolean;
}

export interface PayrollResult {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  periodFrom: Date;
  periodTo: Date;
  basicSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  netPay: number;
  daysWorked: number;
  attendanceRate: number;
}

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  // ---------------- employees

  async listEmployees(q: EmployeeListQuery) {
    const where: any = { deletedAt: null };
    if (q.departmentId) where.departmentId = q.departmentId;
    if (q.status) where.status = q.status;
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { employeeCode: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { department: { select: { id: true, name: true } } },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return { items, total };
  }

  async getEmployee(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { department: { select: { id: true, name: true } }, attendance: { orderBy: { date: 'desc' }, take: 30 }, leaves: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!employee) throw errors.notFound('Employee');

    return employee;
  }

  // ... (rest of methods truncated) // Cache key for leave balance
  static getLeaveBalanceKey(employeeId: string): string {
    return `hr:leave:balance:${employeeId}`;
  }

  async getLeaveBalance(employeeId: string): Promise<{
    employeeId: string;
    employeeCode: string;
    fullName: string;
    annualLeaveEntitlement: number;
    annualLeaveTaken: number;
    annualLeaveRemaining: number;
    sickLeaveBalance: number;
    casualLeaveBalance: number;
    lastUpdated: Date;
  }> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    if (!employee) throw errors.notFound('Employee');

    // Calculate leave balances
    const result = {
      employeeId,
      employeeCode: employee.employee_code ?? '',
      fullName: `${employee.first_name} ${employee.last_name}`,
      annualLeaveEntitlement: 21,
      annualLeaveTaken: 0,
      annualLeaveRemaining: 21,
      sickLeaveBalance: 10,
      casualLeaveBalance: 5,
      lastUpdated: new Date(),
    };

    return result;
  }
  
  async createEmployee(input: EmployeeInput) {
    return this.prisma.employee.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateEmployee(id: string, input: UpdateEmployeeInput) {
    await this.ensureEmployee(id);
    return this.prisma.employee.update({ where: { id }, data: input });
  }

  async removeEmployee(id: string) {
    await this.ensureEmployee(id);
    await this.prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'TERMINATED' } });
    return { id };
  }

  private async ensureEmployee(id: string) {
    const found = await this.prisma.employee.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!found) throw errors.notFound('Employee');
  }

  // ---------------- attendance

  async listAttendance(q: AttendanceListQuery) {
    const where: any = {};
    if (q.employeeId) where.employeeId = q.employeeId;
    if (q.from || q.to) where.date = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { date: 'desc' },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async upsertAttendance(input: AttendanceInput) {
    await this.ensureEmployee(input.employeeId);
    const date = new Date(input.date);
    date.setUTCHours(0, 0, 0, 0);
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: input.employeeId, date } },
      create: { ...input, date, organizationId: requireOrgId() },
      update: { status: input.status, checkIn: input.checkIn ?? null, checkOut: input.checkOut ?? null, notes: input.notes ?? null },
    });
  }

  // ---------------- timesheets

  async listTimesheets(q: TimesheetListQuery) {
    const where: any = {};
    if (q.employeeId) where.employeeId = q.employeeId;
    if (q.from || q.to) where.date = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.status) where.status = q.status;
    const [items, total] = await Promise.all([
      this.prisma.timesheet.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { date: 'desc' },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.timesheet.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createTimesheet(input: TimesheetInput) {
    await this.ensureEmployee(input.employeeId);
    return this.prisma.timesheet.create({
      data: {
        ...input,
        organizationId: requireOrgId(),
        status: input.status ?? 'SUBMITTED',
      },
    });
  }

  async getTimesheet(id: string) {
    const timesheet = await this.prisma.timesheet.findUnique({ where: { id } });
    if (!timesheet) throw errors.notFound('Timesheet');
    return timesheet;
  }

  async updateTimesheet(id: string, input: Partial<TimesheetInput>) {
    const timesheet = await this.getTimesheet(id);
    return this.prisma.timesheet.update({ where: { id }, data: input });
  }

  // ---------------- payroll

  async calculatePayroll(input: PayrollCalculationInput): Promise<PayrollResult> {
    await this.ensureEmployee(input.employeeId);

    const employee = await this.getEmployee(input.employeeId);
    const { employeeCode, firstName, lastName, salary, allowances, department } = employee;

    // Get attendance for the period
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        employeeId: input.employeeId,
        date: {
          gte: input.periodFrom,
          lte: input.periodTo,
        },
      },
      orderBy: { date: 'asc' },
    });

    const daysWorked = attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
    const attendanceRate = attendanceRecords.length > 0 ? (daysWorked / attendanceRecords.length) * 100 : 0;

    // Calculate overtime from timesheets
    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        employeeId: input.employeeId,
        date: {
          gte: input.periodFrom,
          lte: input.periodTo,
        },
      },
    });

    let totalOvertime = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;

    for (const ts of timesheets) {
      if (ts.overtimeHours) {
        totalOvertime += ts.overtimeHours * (ts.overtimeRate ?? 1.5);
      }
      if (ts.allowances) {
        totalAllowances += ts.allowances;
      }
      if (ts.deductions) {
        totalDeductions += ts.deductions;
      }
    }

    // Base calculations
    const basicSalary = (salary ?? 0) + (totalAllowances ?? 0);
    const overtimePay = totalOvertime;
    const grossPay = basicSalary + overtimePay;
    const deductionsAmount = (totalDeductions ?? 0);
    const netPay = grossPay - deductionsAmount;

    return {
      employeeId: input.employeeId,
      employeeCode,
      fullName: `${firstName} ${lastName}`,
      periodFrom: input.periodFrom,
      periodTo: input.periodTo,
      basicSalary,
      allowances: totalAllowances ?? (allowances ?? 0),
      overtime: overtimePay,
      deductions: deductionsAmount,
      netPay,
      daysWorked,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }

  // ---------------- leaves

  async listLeaves(q: LeaveListQuery) {
    const where: any = {};
    if (q.employeeId) where.employeeId = q.employeeId;
    if (q.status) where.status = q.status;
    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createLeave(input: LeaveInput) {
    await this.ensureEmployee(input.employeeId);
    return this.prisma.leaveRequest.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async decideLeave(id: string, approved: boolean) {
    const leave = await this.prisma.leaveRequest.findFirst({ where: { id } });
    if (!leave) throw errors.notFound('Leave request');
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: approved ? 'APPROVED' : 'REJECTED', approverId: actorId(), decidedAt: new Date() },
    });
  }
}
