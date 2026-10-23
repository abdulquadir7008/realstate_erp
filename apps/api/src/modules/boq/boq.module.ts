import { Module } from '@nestjs/common';
import { BoqController } from './boq.controller';
import { BoqService, BoqLineService, RateMasterService } from './boq.service';

@Module({
  controllers: [BoqController],
  providers: [BoqService, BoqLineService, RateMasterService],
  exports: [BoqService, BoqLineService, RateMasterService],
})
export class BoqModule {}