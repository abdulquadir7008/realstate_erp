import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
@Injectable()
export class HrFinanceService {
  constructor(
    private readonly prisma: PrismaService
  ) {}

  // ---------------- Payroll Posting to Finance

  async postPayrollToFinance(input: {
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
    // 1. Validate employee exists
    const employee = await this.prisma.employee.findFirst({
      where: { id: input.employeeId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // 2. Create finance posting entry
    const posting = await this.prisma.$executeRaw`
      INSERT INTO "FinancePosting" (
        employee_id,
        period_from,
        period_to,
        net_pay,
        basic_salary,
        allowances,
        overtime,
        deductions,
        payroll_id,
        posted_by,
        posted_at
      ) VALUES (
        ${input.employeeId},
        ${input.periodFrom},
        ${input.periodTo},
        ${input.netPay},
        ${input.basicSalary},
        ${input.allowances},
        ${input.overtime},
        ${input.deductions},
        ${input.payrollId},
        ${actorId()},
        now()
      )
    `;

    // 2. Create ledger entry for the payment
    const ledgerEntry = await this.prisma.ledgerEntry.create({
      data: {
        organizationId: requireOrgId(),
        accountId: 'cash', // Would need to lookup actual cash account
        type: 'PAYMENT',
        amount: input.netPay,
        referenceType: 'PAYROLL',
        referenceId: input.payrollId,
        note: `Payroll posting for ${input.employeeId} - ${input.periodFrom} to ${input.periodTo}`,
        occurredAt: new Date(),
        createdBy: actorId(),
      },
    });

    // 3. Update employee status or create payment record
    // For now, return the posting and ledger entry

    return {
      posting,
      ledgerEntry,
      message: 'Payroll posted to finance successfully',
    };
  }

  // ---------------- Employee Cost Tracking

  async getEmployeeCostTracking(employeeId: string, from?: Date, to?: Date) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId },
      include: {
        projectCostLedgers: {
          where: {
            createdAt: {
              gte: from ?? new Date(new Date().setMonth(new Date().getMonth() - 3)),
              lte: to ?? new Date(),
            },
          },
        },
        ledgerEntries: {
          where: {
            occurredAt: {
              gte: from ?? new Date(new Date().setMonth(new Date().getMonth() - 3)),
              lte: to ?? new Date(),
            },
          },
        },
      },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Calculate totals
    const totalDeductions = employee.ledgerEntries?.reduce(
      (sum, entry) => sum + entry.amount,
      0
    ) ?? 0;

    const totalProjectCosts = employee.projectCostLedgers?.reduce(
      (sum, entry) => sum + entry.amount,
      0
    ) ?? 0;

    // Get payroll history
    const payrollHistory = await this.prisma.$queryRaw`
      SELECT 
        pc.id,
        pc.period_from as periodFrom,
        pc.period_to as periodTo,
        pc.net_pay as netPay,
        pc.basic_salary as basicSalary,
        pc.allowances as allowances,
        pc.overtime_hours * pc.overtime_rate as overtime,
        pc.deductions as deductions,
        pc.generated_at as generatedAt
      FROM "PayrollCalculation" pc
      WHERE pc.employee_id = ${employeeId}
      ORDER BY pc.generated_at DESC
      LIMIT 12
    `;

    return {
      employeeId,
      employeeCode: employee.employee_code,
      fullName: `${employee.first_name} ${employee.last_name}`,
      totalDeductions,
      totalProjectCosts,
      payrollHistory: payrollHistory as any[],
      costBreakdown: this.calculateCostBreakdown(
        employee.ledgerEntries ?? [],
        employee.projectCostLedgers ?? []
      ),
    };
  }

  private calculateCostBreakdown(
    ledgerEntries: any[],
    projectCostLedgers: any[]
  ) {
    const breakdown = {
      PAYROLL: 0,
      PROJECT_COSTS: 0,
      OTHER: 0,
    };

    for (const entry of ledgerEntries) {
      breakdown.PAYROLL += entry.amount ?? 0;
    }

    for (const entry of projectCostLedgers) {
      breakdown.PROJECT_COSTS += entry.amount ?? 0;
    }

    return breakdown;
  }

  // ---------------- Department Budget Analysis

  async getDepartmentBudgetAnalysis(departmentId: string, from?: Date, to?: Date) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId },
      include: {
        employees: {
          include: {
            projectCostLedgers: {
              where: {
                createdAt: {
                  gte: from ?? new Date(new Date().setMonth(new Date().getMonth() - 3)),
                  lte: to ?? new Date(),
                },
              },
            },
            ledgerEntries: {
              where: {
                occurredAt: {
                  gte: from ?? new Date(new Date().setMonth(new Date().getMonth() - 3)),
                  lte: to ?? new Date(),
                },
              },
            },
          },
        },
      },
    });
    if (!department) throw new NotFoundException('Department not found');

    // Calculate department totals
    const totalPayroll = department.employees.reduce(
      (sum, emp) =>
        sum +
        (emp.ledgerEntries?.reduce((s, e) => s + e.amount, 0) ?? 0),
      0
    );

    const totalProjectCosts = department.employees.reduce(
      (sum, emp) =>
        sum +
        (emp.projectCostLedgers?.reduce((s, e) => s + e.amount, 0) ?? 0),
      0
    );

    const totalOther = department.employees.reduce(
      (sum, emp) =>
        sum +
        (emp.ledgerEntries?.reduce((s, e) => s + e.amount, 0) ?? 0) +
        (emp.projectCostLedgers?.reduce((s, e) => s + e.amount, 0) ?? 0),
      0
    );

    return {
      departmentId,
      departmentName: department.name,
      totalPayroll,
      totalProjectCosts,
      totalOther,
      analysisPeriod: {
        from: from ?? new Date(new Date().setMonth(new Date().getMonth() - 3)),
        to: to ?? new Date(),
      },
    };
  }
}