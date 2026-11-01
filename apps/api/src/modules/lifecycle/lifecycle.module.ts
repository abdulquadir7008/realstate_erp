import { Module } from '@nestjs/common';
import { LifecycleController } from './lifecycle.controller';
import { LifecycleService } from './lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [LifecycleController],
  providers: [LifecycleService, PrismaService],
  exports: [LifecycleService],
})
export class LifecycleModule {}