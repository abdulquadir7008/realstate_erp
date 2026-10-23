import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SiteWbsController } from './site-wbs.controller';
import { SiteService, WbsService, WbsItemService } from './site-wbs.service';

@Module({
  controllers: [ProjectsController, SiteWbsController],
  providers: [ProjectsService, SiteService, WbsService, WbsItemService],
  exports: [ProjectsService, SiteService, WbsService, WbsItemService],
})
export class ProjectsModule {}
