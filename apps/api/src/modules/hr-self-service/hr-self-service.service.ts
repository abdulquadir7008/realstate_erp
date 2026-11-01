import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface SelfServiceEmployeeQuery extends PageOffsetInput {
  employeeId?: string;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  periodFrom: Date;
  periodTo: Date;
  basicSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  generatedAt: Date;
}

export interface LeaveBalance {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  annualLeaveEntitlement: number;
  annualLeaveTaken: number;
  annualLeaveRemaining: number;
  sickLeaveBalance: number;
  casualLeaveBalance: number;
  lastUpdated: Date;
}

export interface ProfileUpdateInput {
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
}

@Injectable()
export class HrSelfServiceService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- employee gets own profile

  async getMyProfile(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: { select: { id: true, name: true } } },
    });
    if (!employee) throw errors.notFound('Employee');
    return employee;
  }

  // ---------------- employee list (manager view)

  async listEmployees(q: SelfServiceEmployeeQuery) {
    const where: any = {};
    if (q.employeeId) where.id = q.employeeId;
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { firstName: 'asc' },
        include: { department: { select: { id: true, name: true } } },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  // ---------------- get own payslip history

  async getPayslipHistory(employeeId: string, q: PageOffsetInput) {
    const where: any = { employeeId };
    const [items, total] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT 
          pc.id,
          pc.employee_id as employeeId,
          emp.employee_code as employeeCode,
          emp.first_name || ' ' || emp.last_name as fullName,
          pc.period_from as periodFrom,
          pc.period_to as periodTo,
          pc.basic_salary as basicSalary,
          pc.allowances as allowances,
          pc.overtime_hours * pc.overtime_rate as overtime,
          pc.deductions as deductions,
          (pc.basic_salary + pc.allowances + (pc.overtime_hours * pc.overtime_rate) - pc.deductions) as grossPay,
          (pc.basic_salary + pc.allowances + (pc.overtime_hours * pc.overtime_rate) - pc.deductions) as netPay,
          pc.generated_at as generatedAt
        FROM "PayrollCalculation" pc
        JOIN "Employee" emp ON pc.employee_id = emp.id
        WHERE pc.employee_id = ${employeeId}
        ORDER BY pc.generated_at DESC
        LIMIT ${q.limit ?? 10}
        OFFSET ${pageOffset(q.page, q.limit) ?? 0}
      `,
    ]);
    return paginated(items as Payslip[], total, q.page, q.limit);
  }

  // ---------------- get leave balance

  async getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    if (!employee) throw errors.notFound('Employee');

    // Calculate leave balances - would typically have a leave tracker table
    // For now, return structure with placeholder values
    return {
      employeeId,
      employeeCode: employee.employee_code ?? '',
      fullName: `${employee.first_name} ${employee.last_name}`,
      annualLeaveEntitlement: 21, // Default 21 days
      annualLeaveTaken: 0, // Would query from leave requests
      annualLeaveRemaining: 21,
      sickLeaveBalance: 10, // Default
      casualLeaveBalance: 5, // Default
      lastUpdated: new Date(),
    };
  }

  // ---------------- update employee profile (self-service)

  async updateProfile(employeeId: string, input: ProfileUpdateInput) {
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: { select: { id: true, name: true } } },
    });
  }

  // ---------------- employee applies for leave (self-service)

  async applyForLeave(employeeId: string, input: {
    leaveType: 'ANNUAL' | 'SICK' | 'CASUAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
    startDate: Date;
    endDate: Date;
    reason: string;
    totalDays: number;
  }) {
    // Validate employee exists
    await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    // Create leave request
    return this.prisma.leaveRequest.create({
      data: {
        organizationId: requireOrgId(),
        employeeId,
        leaveType: input.leaveType,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays: input.totalDays,
        reason: input.reason,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // ---------------- get pending leave requests (for managers)

  async listPendingLeaves(limit?: number) {
    const leaves = await this.prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      skip: 0,
      take: limit ?? 50,
      orderBy: { createdAt: 'asc' },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    });
    return leaves;
  }
}

interface PageOffsetInput {
  page?: number;
  limit?: number;
}