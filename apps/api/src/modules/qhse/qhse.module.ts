import { Module } from '@nestjs/common';
import { QhseService } from './qhse.service';
import { QhseController } from './qhse.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [QhseController],
  providers: [QhseService, PrismaService],
  exports: [QhseService],
})
export class QhseModule {}