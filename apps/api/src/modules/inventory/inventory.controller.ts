import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  buildingSchema,
  floorSchema,
  unitSchema,
  updateUnitSchema,
  updateUnitStatusSchema,
  bulkGenerateUnitsSchema,
  unitQuerySchema,
  paginationSchema,
  BuildingInput,
  FloorInput,
  UnitInput,
  UpdateUnitInput,
  UpdateUnitStatusInput,
  BulkGenerateUnitsInput,
} from '@re/shared';

const buildingQuerySchema = z.object({ projectId: z.string().uuid().optional() });
const floorQuerySchema = z.object({ buildingId: z.string().uuid().optional(), projectId: z.string().uuid().optional() });
const updateBuildingSchema = buildingSchema.partial();
const updateFloorSchema = floorSchema.partial();

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('buildings')
  @RequirePermissions('building:read')
  listBuildings(@Query() q: unknown) {
    return this.service.listBuildings(parseQuery(buildingQuerySchema, q).projectId);
  }

  @Post('buildings')
  @RequirePermissions('building:create')
  createBuilding(@Body(new ZodValidationPipe(buildingSchema)) body: BuildingInput) {
    return this.service.createBuilding(body);
  }

  @Patch('buildings/:id')
  @RequirePermissions('building:update')
  updateBuilding(@Param('id') id: string, @Body(new ZodValidationPipe(updateBuildingSchema)) body: Partial<BuildingInput>) {
    return this.service.updateBuilding(id, body);
  }

  @Delete('buildings/:id')
  @RequirePermissions('building:delete')
  removeBuilding(@Param('id') id: string) {
    return this.service.removeBuilding(id);
  }

  @Get('floors')
  @RequirePermissions('floor:read')
  listFloors(@Query() q: unknown) {
    const parsed = parseQuery(floorQuerySchema, q);
    return this.service.listFloors(parsed.buildingId, parsed.projectId);
  }

  @Post('floors')
  @RequirePermissions('floor:create')
  createFloor(@Body(new ZodValidationPipe(floorSchema)) body: FloorInput) {
    return this.service.createFloor(body);
  }

  @Delete('floors/:id')
  @RequirePermissions('floor:delete')
  removeFloor(@Param('id') id: string) {
    return this.service.removeFloor(id);
  }

  @Get('units')
  @RequirePermissions('unit:read')
  listUnits(@Query() q: unknown) {
    return this.service.listUnits(parseQuery(unitQuerySchema, q));
  }

  @Post('units')
  @RequirePermissions('unit:create')
  createUnit(@Body(new ZodValidationPipe(unitSchema)) body: UnitInput) {
    return this.service.createUnit(body);
  }

  @Post('units/bulk')
  @RequirePermissions('unit:create')
  bulkGenerate(@Body(new ZodValidationPipe(bulkGenerateUnitsSchema)) body: BulkGenerateUnitsInput) {
    return this.service.bulkGenerate(body);
  }

  @Get('units/:id')
  @RequirePermissions('unit:read')
  getUnit(@Param('id') id: string) {
    return this.service.getUnit(id);
  }

  @Patch('units/:id')
  @RequirePermissions('unit:update')
  updateUnit(@Param('id') id: string, @Body(new ZodValidationPipe(updateUnitSchema)) body: UpdateUnitInput) {
    return this.service.updateUnit(id, body);
  }

  @Patch('units/:id/status')
  @RequirePermissions('unit:update')
  updateUnitStatus(@Param('id') id: string, @Body(new ZodValidationPipe(updateUnitStatusSchema)) body: UpdateUnitStatusInput) {
    return this.service.updateUnitStatus(id, body);
  }

  @Delete('units/:id')
  @RequirePermissions('unit:delete')
  removeUnit(@Param('id') id: string) {
    return this.service.removeUnit(id);
  }
}
