import { Module } from '@nestjs/common';
import { HrSelfServiceController } from './hr-self-service.controller';
import { HrSelfServiceService } from './hr-self-service.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [HrSelfServiceController],
  providers: [HrSelfServiceService, PrismaService],
  exports: [HrSelfServiceService],
})
export class HrSelfServiceModule {}