import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface HrAnalyticsSummary {
  periodFrom: Date;
  periodTo: Date;
  totalEmployees: number;
  activeEmployees: number;
  terminatedEmployees: number;
  newHires: number;
  turnoverRate: number;
  averageTenureMonths: number;
  attendanceRate: number;
  overtimeHours: number;
  payrollCost: number;
  employeeSatisfaction: number; // Survey-based or derived
  turnoverByDepartment: Record<string, number>;
  topDepartments: Array<{
    departmentId: string;
    departmentName: string;
    employeeCount: number;
    turnoverRate: number;
  }>;
  trends: {
    headcountChangeMonthOverMonth: number;
    turnoverTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    attendanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
  predictions: {
    projectedTurnoverNext6Months: number;
    projectedHiresNext6Months: number;
    retentionRiskEmployees: Array<{
      employeeId: string;
      employeeCode: string;
      fullName: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      riskFactors: string[];
    }>;
  };
  recommendations: string[];
}

@Injectable()
export class HrAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Get HR Analytics Summary

  async getAnalyticsSummary(
    periodFrom?: Date,
    periodTo?: Date
  ): Promise<HrAnalyticsSummary> {
    const from = periodFrom ?? new Date(new Date().setMonth(new Date().getMonth() - 3));
    const to = periodTo ?? new Date();

    // Get employees created/active in period
    const employees = await this.prisma.employee.findMany({
      where: {
        createdAt: {
          gte: from,
          lte: to,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        joinDate: true,
        department: true,
      },
    });

    // Get termination data
    const terminatedEmployees = await this.prisma.employee.count({
      where: {
        status: 'TERMINATED',
        terminatedAt: {
          gte: from,
          lte: to,
        },
      },
    });

    // Calculate total employees (active + terminated in period)
    const totalEmployees = employees.length + terminatedEmployees;

    // Active employees count
    const activeEmployees = await this.prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    // New hires (employees joined in period)
    const newHires = employees.length;

    // Calculate turnover rate
    const totalEmployeesInPeriod = totalEmployees;
    const turnoverRate = totalEmployeesInPeriod > 0 ? (terminatedEmployees / totalEmployeesInPeriod) * 100 : 0;

    // Average tenure (in months)
    const now = new Date();
    const totalTenureMonths = employees.reduce(
      (sum, emp) => {
        const join = new Date(emp.joinDate ?? now);
        const months = (now.getTime() - join.getTime()) / (30 * 24 * 60 * 60 * 1000);
        return sum + months;
      },
      0
    );
    const averageTenureMonths = employees.length > 0 ? totalTenureMonths / employees.length : 0;

    // Attendance rate (from attendance records in period)
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        date: {
          gte: from,
          lte: to,
        },
      },
      select: {
        status: true,
        employeeId: true,
      },
    });

    let totalAttendanceDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (a) => a.status === 'PRESENT' || a.status === 'HALF_DAY'
    ).length;
    const attendanceRate = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 100;

    // Overtime hours (from timesheets in period)
    const timesheets = await this.prisma.$queryRaw`
      SELECT SUM(overtimeHours * overtimeRate) as totalOvertime
      FROM "Timesheet"
      WHERE createdAt >= ${from} AND createdAt <= ${to}
    `;

    const overtimeHours = (timesheets[0] as any).totalOvertime ?? 0;

    // Payroll cost in period
    const payrollRecords = await this.prisma.$queryRaw`
      SELECT SUM(netPay) as totalPayroll
      FROM "PayrollCalculation"
      WHERE generatedAt >= ${from} AND generatedAt <= ${to}
    `;

    const payrollCost = (payrollRecords[0] as any).totalPayroll ?? 0;

    // Employee satisfaction (derived from eNPS or survey data - simplified)
    const employeeSatisfaction = 85; // Placeholder

    // Turnover by department
    const turnoverByDepartment = this.calculateTurnoverByDepartment(periodFrom, periodTo);

    // Top departments
    const topDepartments = this.calculateTopDepartments(employees, turnoverByDepartment);

    // Trends
    const headcountChangeMonthOverMonth = this.calculateHeadcountChange(periodFrom, periodTo);
    const turnoverTrend = 'STABLE'; // Simplified - would compare with previous period
    const attendanceTrend = 'STABLE'; // Simplified

    // Predictions
    const projectedTurnoverNext6Months = Math.round(
      (turnoverRate / 100) * employees.length * 2
    );
    const projectedHiresNext6Months = Math.round(
      (turnoverRate / 100) * employees.length * 1.5
    );

    // Risk employees (simplified: employees with short tenure or low attendance)
    const retentionRiskEmployees = this.calculateRetentionRisk(employees);

    // Recommendations
    const recommendations: string[] = [];

    if (turnoverRate > 15) {
      recommendations.push(
        `High turnover rate of ${turnoverRate.toFixed(1)}% - implement retention program`
      );
    }

    if (attendanceRate < 80) {
      recommendations.push(
        `Low attendance rate of ${attendanceRate.toFixed(1)}% - review attendance policy`
      );
    }

    if (projectedTurnoverNext6Months > 5) {
      recommendations.push(
        `${projectedTurnoverNext6Months} projected turnover(s) in 6 months - stay interview program recommended`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'HR metrics are within acceptable parameters'
      );
    }

    return {
      periodFrom: from,
      periodTo: to,
      totalEmployees,
      activeEmployees,
      terminatedEmployees,
      newHires,
      turnoverRate: Math.round(turnoverRate * 100) / 100,
      averageTenureMonths: Math.round(averageTenureMonths * 100) / 100,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      payrollCost: Math.round(payrollCost * 100) / 100,
      employeeSatisfaction,
      turnoverByDepartment,
      topDepartments,
      trends: {
        headcountChangeMonthOverMonth: Math.round(headcountChangeMonthOverMonth * 100) / 100,
        turnoverTrend,
        attendanceTrend,
      },
      predictions: {
        projectedTurnoverNext6Months,
        projectedHiresNext6Months,
        retentionRiskEmployees,
      },
      recommendations,
    };
  }

  private calculateTurnoverByDepartment(
    from: Date,
    to: Date
  ): Record<string, number> {
    // Simplified: would query employees terminated per department
    return {};
  }

  private calculateTopDepartments(
    employees: any[],
    turnoverByDepartment: Record<string, number>
  ) {
    // Simplified
    return [
      {
        departmentId: 'ALL',
        departmentName: 'All Departments',
        employeeCount: employees.length,
        turnoverRate: 0,
      },
    ];
  }

  private calculateHeadcountChange(
    from: Date,
    to: Date
  ): number {
    // Simplified headcount change calculation
    return 0;
  }

  private calculateRetentionRisk(employees: any[]) {
    const riskEmployees = employees
      .filter((emp) => {
        // Employees with less than 6 months tenure or missing contact info
        const joinDate = new Date(emp.joinDate ?? new Date());
        const now = new Date();
        const tenureMonths = (now.getTime() - joinDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
        return tenureMonths < 6;
      })
      .map((emp) => ({
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: `${emp.first_name} ${emp.last_name}`,
        riskLevel: 'HIGH',
        riskFactors: ['Short tenure (< 6 months)'],
      }));

    return riskEmployees;
  }
}