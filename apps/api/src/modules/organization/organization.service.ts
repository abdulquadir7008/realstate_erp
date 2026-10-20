import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated } from '../../common/utils/pagination';
import { requireOrgId } from '../../common/utils/tenant';
import {
  BranchInput,
  DepartmentInput,
  FinancialYearInput,
  TaxRateInput,
  PaginationInput,
} from '@re/shared';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile() {
    const orgId = requireOrgId();
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw errors.notFound('Organization');
    return org;
  }

  async updateProfile(input: Record<string, unknown>) {
    const orgId = requireOrgId();
    return this.prisma.organization.update({ where: { id: orgId }, data: input as any });
  }

  async getSettings() {
    const org = await this.getProfile();
    return (org.settings as Record<string, unknown>) ?? {};
  }

  async updateSettings(patch: Record<string, unknown>) {
    const orgId = requireOrgId();
    const org = await this.getProfile();
    const current = (org.settings as Record<string, unknown>) ?? {};
    const settings = { ...current, ...patch };
    await this.prisma.organization.update({ where: { id: orgId }, data: { settings: settings as any } });
    return settings;
  }

  // ---------------- branches

  async listBranches(q: PaginationInput) {
    const where: any = { deletedAt: null };
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' } }, { code: { contains: q.search, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this.prisma.branch.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.branch.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createBranch(input: BranchInput) {
    return this.prisma.branch.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateBranch(id: string, input: Partial<BranchInput>) {
    await this.ensureBranch(id);
    return this.prisma.branch.update({ where: { id }, data: input });
  }

  async removeBranch(id: string) {
    await this.ensureBranch(id);
    await this.prisma.branch.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { id };
  }

  private async ensureBranch(id: string) {
    const found = await this.prisma.branch.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!found) throw errors.notFound('Branch');
  }

  // ---------------- departments

  async listDepartments(q: PaginationInput) {
    const where: any = { deletedAt: null };
    if (q.search) where.OR = [{ name: { contains: q.search, mode: 'insensitive' } }, { code: { contains: q.search, mode: 'insensitive' } }];
    const [items, total] = await Promise.all([
      this.prisma.department.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.department.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createDepartment(input: DepartmentInput) {
    return this.prisma.department.create({ data: { ...input, organizationId: requireOrgId() } });
  }

  async updateDepartment(id: string, input: Partial<DepartmentInput>) {
    await this.ensureDepartment(id);
    return this.prisma.department.update({ where: { id }, data: input });
  }

  async removeDepartment(id: string) {
    await this.ensureDepartment(id);
    await this.prisma.department.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { id };
  }

  private async ensureDepartment(id: string) {
    const found = await this.prisma.department.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
    if (!found) throw errors.notFound('Department');
  }

  // ---------------- financial years

  async listFinancialYears(q: PaginationInput) {
    const [items, total] = await Promise.all([
      this.prisma.financialYear.findMany({ skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { startDate: 'desc' } }),
      this.prisma.financialYear.count({}),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createFinancialYear(input: FinancialYearInput) {
    const orgId = requireOrgId();
    if (input.isCurrent) {
      await this.prisma.financialYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    }
    return this.prisma.financialYear.create({ data: { ...input, organizationId: orgId } });
  }

  async updateFinancialYear(id: string, input: Partial<FinancialYearInput>) {
    const found = await this.prisma.financialYear.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw errors.notFound('Financial year');
    if (input.isCurrent) await this.prisma.financialYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    return this.prisma.financialYear.update({ where: { id }, data: input });
  }

  // ---------------- tax rates

  async listTaxRates(q: PaginationInput) {
    const where: any = {};
    const [items, total] = await Promise.all([
      this.prisma.taxRate.findMany({ where, skip: pageOffset(q.page, q.limit), take: q.limit, orderBy: { name: 'asc' } }),
      this.prisma.taxRate.count({ where }),
    ]);
    return paginated(items, total, q.page, q.limit);
  }

  async createTaxRate(input: TaxRateInput) {
    const orgId = requireOrgId();
    if (input.isDefault) await this.prisma.taxRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    return this.prisma.taxRate.create({ data: { ...input, organizationId: orgId } });
  }

  async updateTaxRate(id: string, input: Partial<TaxRateInput>) {
    const found = await this.prisma.taxRate.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw errors.notFound('Tax rate');
    if (input.isDefault) await this.prisma.taxRate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    return this.prisma.taxRate.update({ where: { id }, data: input });
  }

  async removeTaxRate(id: string) {
    const found = await this.prisma.taxRate.findFirst({ where: { id }, select: { id: true } });
    if (!found) throw errors.notFound('Tax rate');
    await this.prisma.taxRate.update({ where: { id }, data: { isActive: false } });
    return { id };
  }
}
