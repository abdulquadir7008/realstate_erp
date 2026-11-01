import { Body, Controller, Get, Param, Post, Put, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { TenderService } from './tender.service';
import { CreateTenderDto, UpdateTenderDto, TenderSearchDto } from './dtos';
import { errors } from '../../common/api-error';

@ApiTags('Tender')
@Controller('tenders')
export class TenderController {
  constructor(private readonly tenderService: TenderService) {}

  @Get()
  @ApiOperation({ summary: 'List tenders with filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of tenders' })
  async list(@Query() search: TenderSearchDto) {
    return this.tenderService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tender by ID' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tender details' })
  @ApiResponse({ status: 404, description: 'Tender not found' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenderService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tender' })
  @ApiResponse({ status: 201, description: 'Tender created' })
  async create(@Body() data: CreateTenderDto) {
    return this.tenderService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tender' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tender updated' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() data: UpdateTenderDto) {
    return this.tenderService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tender' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tender deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenderService.remove(id);
  }

  // Stage-related endpoints
  @Put(':id/stage')
  @ApiOperation({ summary: 'Move tender to next stage' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  async advanceStage(@Param('id', ParseUUIDPipe) id: string, @Body() body: { status: string; remarks?: string }) {
    return this.tenderService.advanceStage(id, body.status, body.remarks);
  }

  @Get(':id/stages')
  @ApiOperation({ summary: 'Get tender stages with history' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tender stages' })
  async getStages(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenderService.getStages(id);
  }

  // Qualification-related endpoints
  @Post(':id/qualifications')
  @ApiOperation({ summary: 'Add a qualification criterion' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 201, description: 'Qualification added' })
  async addQualification(@Param('id', ParseUUIDPipe) id: string, @Body() data: { criterion: string; requirement?: string; weight: number }) {
    return this.tenderService.addQualification(id, data);
  }

  @Put(':id/qualifications/:criterion')
  @ApiOperation({ summary: 'Update qualification status' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Qualification updated' })
  async updateQualification(@Param('id', ParseUUIDPipe) id: string, @Param('criterion') criterion: string, @Body() data: { status: string; evidence?: string; remarks?: string }) {
    return this.tenderService.updateQualification(id, criterion, data);
  }

  // Risk-related endpoints
  @Post(':id/risks')
  @ApiOperation({ summary: 'Add a risk entry' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 201, description: 'Risk added' })
  async addRisk(@Param('id', ParseUUIDPipe) id: string, @Body() data: { risk: string; category?: string; level?: string; contingency?: number }) {
    return this.tenderService.addRisk(id, data);
  }

  // Stage management endpoints
  @Post(':id/stages')
  @ApiOperation({ summary: 'Add a tender stage' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 201, description: 'Stage added' })
  async addStage(@Param('id', ParseUUIDPipe) id: string, @Body() data: { name: string; isMandatory?: boolean; sequence?: number }) {
    return this.tenderService.addStage(id, data);
  }

  @Put(':id/stages/:stageName')
  @ApiOperation({ summary: 'Update stage status' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Stage status updated' })
  async updateStage(@Param('id', ParseUUIDPipe) id: string, @Param('stageName') stageName: string, @Body() data: { status: string; startedAt?: Date; completedAt?: Date; completedBy?: string; remarks?: string }) {
    return this.tenderService.updateStage(id, stageName, data);
  }

  // Checklist-related endpoints
  @Post(':id/checklist')
  @ApiOperation({ summary: 'Add a checklist item' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 201, description: 'Checklist item added' })
  async addChecklistItem(@Param('id', ParseUUIDPipe) id: string, @Body() data: { item: string; isRequired?: boolean }) {
    return this.tenderService.addChecklistItem(id, data);
  }

  @Put(':id/checklist/:item')
  @ApiOperation({ summary: 'Update checklist item completion' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Checklist item updated' })
  async updateChecklistItem(@Param('id', ParseUUIDPipe) id: string, @Param('item') item: string, @Body() data: { isDone: boolean; doneBy?: string; remarks?: string }) {
    return this.tenderService.updateChecklistItem(id, item, data);
  }

  // Activity-related endpoints
  @Post(':id/activities')
  @ApiOperation({ summary: 'Add a tender activity' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 201, description: 'Activity added' })
  async addActivity(@Param('id', ParseUUIDPipe) id: string, @Body() data: { type: string; title: string; description?: string }) {
    return this.tenderService.addActivity(id, data);
  }

  // Go/No-Go decision
  @Put(':id/go-decision')
  @ApiOperation({ summary: 'Set Go/No-Go decision' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 200, description: 'Go/No-Go decision set' })
  async setGoDecision(@Param('id', ParseUUIDPipe) id: string, @Body() data: { decision: 'GO' | 'NO_GO'; notes?: string }) {
    return this.tenderService.setGoDecision(id, data.decision, data.notes);
  }

  // Conversion to project
  @Post(':id/convert-to-project')
  @ApiOperation({ summary: 'Convert won tender to project' })
  @ApiParam({ name: 'id', example: 'uuid' })
  @ApiResponse({ status: 201, description: 'Project created from tender' })
  async convertToProject(@Param('id', ParseUUIDPipe) id: string, @Body() data: { projectCode: string; projectName: string; budget?: number }) {
    return this.tenderService.convertToProject(id, data);
  }
}