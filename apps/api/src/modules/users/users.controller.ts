import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  createUserSchema,
  updateUserSchema,
  inviteUserSchema,
  paginationSchema,
  CreateUserInput,
  UpdateUserInput,
  InviteUserInput,
} from '@re/shared';

const listQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  roleCode: z.string().optional(),
});

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions('user:read')
  list(@Query() q: unknown) {
    return this.service.list(parseQuery(listQuerySchema, q));
  }

  @Post()
  @RequirePermissions('user:create')
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.service.create(body);
  }

  @Post('invite')
  @RequirePermissions('user:manage')
  invite(@Body(new ZodValidationPipe(inviteUserSchema)) body: InviteUserInput) {
    return this.service.invite(body);
  }

  @Get(':id')
  @RequirePermissions('user:read')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermissions('user:update')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('user:delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
