import { Module } from '@nestjs/common';
import { SubconLifecycleController } from './subcon-lifecycle.controller';
import { SubconLifecycleService } from './subcon-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [SubconLifecycleController],
  providers: [SubconLifecycleService, PrismaService],
  exports: [SubconLifecycleService],
})
export class SubconLifecycleModule {}