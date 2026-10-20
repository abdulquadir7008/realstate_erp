import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  updateOrganizationSchema,
  organizationSettingsSchema,
  branchSchema,
  departmentSchema,
  financialYearSchema,
  taxRateSchema,
  BranchInput,
  DepartmentInput,
  FinancialYearInput,
  TaxRateInput,
} from '@re/shared';

const updateBranchSchema = branchSchema.partial();
const updateDepartmentSchema = departmentSchema.partial();
const updateFinancialYearSchema = financialYearSchema.partial();
const updateTaxRateSchema = taxRateSchema.partial();
const partialSettingsSchema = organizationSettingsSchema.partial();

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}

  @Get()
  @RequirePermissions('organization:read')
  getProfile() {
    return this.service.getProfile();
  }

  @Patch()
  @RequirePermissions('organization:update')
  updateProfile(@Body(new ZodValidationPipe(updateOrganizationSchema)) body: z.infer<typeof updateOrganizationSchema>) {
    return this.service.updateProfile(body);
  }

  @Get('settings')
  @RequirePermissions('settings:read')
  getSettings() {
    return this.service.getSettings();
  }

  @Patch('settings')
  @RequirePermissions('settings:update')
  updateSettings(@Body(new ZodValidationPipe(partialSettingsSchema)) body: z.infer<typeof partialSettingsSchema>) {
    return this.service.updateSettings(body);
  }

  // branches
  @Get('branches')
  @RequirePermissions('branch:read')
  listBranches(@Query() q: unknown) {
    return this.service.listBranches(parseQuery(paginationSchema, q));
  }

  @Post('branches')
  @RequirePermissions('branch:create')
  createBranch(@Body(new ZodValidationPipe(branchSchema)) body: BranchInput) {
    return this.service.createBranch(body);
  }

  @Patch('branches/:id')
  @RequirePermissions('branch:update')
  updateBranch(@Param('id') id: string, @Body(new ZodValidationPipe(updateBranchSchema)) body: z.infer<typeof updateBranchSchema>) {
    return this.service.updateBranch(id, body);
  }

  @Delete('branches/:id')
  @RequirePermissions('branch:delete')
  removeBranch(@Param('id') id: string) {
    return this.service.removeBranch(id);
  }

  // departments
  @Get('departments')
  @RequirePermissions('department:read')
  listDepartments(@Query() q: unknown) {
    return this.service.listDepartments(parseQuery(paginationSchema, q));
  }

  @Post('departments')
  @RequirePermissions('department:create')
  createDepartment(@Body(new ZodValidationPipe(departmentSchema)) body: DepartmentInput) {
    return this.service.createDepartment(body);
  }

  @Patch('departments/:id')
  @RequirePermissions('department:update')
  updateDepartment(@Param('id') id: string, @Body(new ZodValidationPipe(updateDepartmentSchema)) body: z.infer<typeof updateDepartmentSchema>) {
    return this.service.updateDepartment(id, body);
  }

  @Delete('departments/:id')
  @RequirePermissions('department:delete')
  removeDepartment(@Param('id') id: string) {
    return this.service.removeDepartment(id);
  }

  // financial years
  @Get('financial-years')
  @RequirePermissions('settings:read')
  listFinancialYears(@Query() q: unknown) {
    return this.service.listFinancialYears(parseQuery(paginationSchema, q));
  }

  @Post('financial-years')
  @RequirePermissions('settings:create')
  createFinancialYear(@Body(new ZodValidationPipe(financialYearSchema)) body: FinancialYearInput) {
    return this.service.createFinancialYear(body);
  }

  @Patch('financial-years/:id')
  @RequirePermissions('settings:update')
  updateFinancialYear(@Param('id') id: string, @Body(new ZodValidationPipe(updateFinancialYearSchema)) body: z.infer<typeof updateFinancialYearSchema>) {
    return this.service.updateFinancialYear(id, body);
  }

  // tax rates
  @Get('tax-rates')
  @RequirePermissions('settings:read')
  listTaxRates(@Query() q: unknown) {
    return this.service.listTaxRates(parseQuery(paginationSchema, q));
  }

  @Post('tax-rates')
  @RequirePermissions('settings:create')
  createTaxRate(@Body(new ZodValidationPipe(taxRateSchema)) body: TaxRateInput) {
    return this.service.createTaxRate(body);
  }

  @Patch('tax-rates/:id')
  @RequirePermissions('settings:update')
  updateTaxRate(@Param('id') id: string, @Body(new ZodValidationPipe(updateTaxRateSchema)) body: z.infer<typeof updateTaxRateSchema>) {
    return this.service.updateTaxRate(id, body);
  }

  @Delete('tax-rates/:id')
  @RequirePermissions('settings:delete')
  removeTaxRate(@Param('id') id: string) {
    return this.service.removeTaxRate(id);
  }
}
