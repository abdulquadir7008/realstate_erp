import { Module } from '@nestjs/common';
import { QHSELifecycleController } from './qhse-lifecycle.controller';
import { QHSELifecycleService } from './qhse-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [QHSELifecycleController],
  providers: [QHSELifecycleService, PrismaService],
  exports: [QHSELifecycleService],
})
export class QHSELifecycleModule {}