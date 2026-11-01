import { Module } from '@nestjs/common';
import { FieldOpsController } from './field-ops.controller';
import { FieldOpsService } from './field-ops.service';
import { Fld001Service } from '../fld-001/fld-001.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FieldOpsController],
  providers: [FieldOpsService, Fld001Service, PrismaService],
  exports: [FieldOpsService],
})
export class FieldOpsModule {}