import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { EmployeeInput, UpdateEmployeeInput, AttendanceInput, LeaveInput, PaginationInput } from '@re/shared';

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

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

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
    return paginated(items, total, q.page, q.limit);
  }

  async getEmployee(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { department: { select: { id: true, name: true } }, attendance: { orderBy: { date: 'desc' }, take: 30 }, leaves: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!employee) throw errors.notFound('Employee');
    return employee;
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
