import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import { customerSchema, updateCustomerSchema, customerQuerySchema, CustomerInput, UpdateCustomerInput } from '@re/shared';

@ApiTags('Customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequirePermissions('customer:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(customerQuerySchema, q));
  }

  @Post()
  @RequirePermissions('customer:create')
  create(@Body(new ZodValidationPipe(customerSchema)) body: CustomerInput) {
    return this.service.create(body);
  }

  @Get(':id')
  @RequirePermissions('customer:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('customer:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('customer:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
