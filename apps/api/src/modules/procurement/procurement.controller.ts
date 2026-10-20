import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ProcurementService } from './procurement.service';
import { RequirePermissions } from '../../common/decorators';
import { ZodValidationPipe, parseQuery } from '../../common/pipes/zod-validation.pipe';
import {
  paginationSchema,
  vendorSchema,
  updateVendorSchema,
  materialSchema,
  updateMaterialSchema,
  materialCategorySchema,
  warehouseSchema,
  updateWarehouseSchema,
  stockMoveSchema,
  requisitionSchema,
  decideRequisitionSchema,
  purchaseOrderSchema,
  grnSchema,
  VendorInput,
  UpdateVendorInput,
  MaterialInput,
  UpdateMaterialInput,
  MaterialCategoryInput,
  WarehouseInput,
  UpdateWarehouseInput,
  StockMoveInput,
  RequisitionInput,
  PurchaseOrderInput,
  GrnInput,
} from '@re/shared';

const vendorQuerySchema = paginationSchema.extend({ category: z.string().optional(), status: z.string().optional() });
const materialQuerySchema = paginationSchema.extend({ categoryId: z.string().uuid().optional(), warehouseId: z.string().uuid().optional() });
const poQuerySchema = paginationSchema.extend({ status: z.string().optional(), vendorId: z.string().uuid().optional(), projectId: z.string().uuid().optional() });
const requisitionQuerySchema = paginationSchema.extend({ status: z.string().optional(), projectId: z.string().uuid().optional() });
const grnQuerySchema = paginationSchema.extend({ projectId: z.string().uuid().optional() });
const poStatusSchema = z.object({ status: z.enum(['DRAFT', 'ISSUED', 'PARTIAL', 'RECEIVED', 'CANCELLED']) });

@ApiTags('Procurement')
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  // vendors
  @Get('vendors')
  @RequirePermissions('vendor:read')
  listVendors(@Query() q: unknown) {
    return this.service.listVendors(parseQuery(vendorQuerySchema, q));
  }

  @Post('vendors')
  @RequirePermissions('vendor:create')
  createVendor(@Body(new ZodValidationPipe(vendorSchema)) body: VendorInput) {
    return this.service.createVendor(body);
  }

  @Get('vendors/:id')
  @RequirePermissions('vendor:read')
  getVendor(@Param('id') id: string) {
    return this.service.getVendor(id);
  }

  @Patch('vendors/:id')
  @RequirePermissions('vendor:update')
  updateVendor(@Param('id') id: string, @Body(new ZodValidationPipe(updateVendorSchema)) body: UpdateVendorInput) {
    return this.service.updateVendor(id, body);
  }

  @Delete('vendors/:id')
  @RequirePermissions('vendor:delete')
  removeVendor(@Param('id') id: string) {
    return this.service.removeVendor(id);
  }

  // materials
  @Get('materials')
  @RequirePermissions('material:read')
  listMaterials(@Query() q: unknown) {
    return this.service.listMaterials(parseQuery(materialQuerySchema, q));
  }

  @Post('materials')
  @RequirePermissions('material:create')
  createMaterial(@Body(new ZodValidationPipe(materialSchema)) body: MaterialInput) {
    return this.service.createMaterial(body);
  }

  @Patch('materials/:id')
  @RequirePermissions('material:update')
  updateMaterial(@Param('id') id: string, @Body(new ZodValidationPipe(updateMaterialSchema)) body: UpdateMaterialInput) {
    return this.service.updateMaterial(id, body);
  }

  @Delete('materials/:id')
  @RequirePermissions('material:delete')
  removeMaterial(@Param('id') id: string) {
    return this.service.removeMaterial(id);
  }

  @Get('material-categories')
  @RequirePermissions('material:read')
  listMaterialCategories(@Query() q: unknown) {
    return this.service.listMaterialCategories(parseQuery(paginationSchema, q));
  }

  @Post('material-categories')
  @RequirePermissions('material:create')
  createMaterialCategory(@Body(new ZodValidationPipe(materialCategorySchema)) body: MaterialCategoryInput) {
    return this.service.createMaterialCategory(body);
  }

  // warehouses
  @Get('warehouses')
  @RequirePermissions('material:read')
  listWarehouses(@Query() q: unknown) {
    return this.service.listWarehouses(parseQuery(paginationSchema, q));
  }

  @Post('warehouses')
  @RequirePermissions('material:create')
  createWarehouse(@Body(new ZodValidationPipe(warehouseSchema)) body: WarehouseInput) {
    return this.service.createWarehouse(body);
  }

  @Patch('warehouses/:id')
  @RequirePermissions('material:update')
  updateWarehouse(@Param('id') id: string, @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseInput) {
    return this.service.updateWarehouse(id, body);
  }

  // stock
  @Get('stock')
  @RequirePermissions('material:read')
  listStock(@Query() q: unknown) {
    return this.service.listStock(parseQuery(materialQuerySchema, q));
  }

  @Post('stock-moves')
  @RequirePermissions('material:update')
  createStockMove(@Body(new ZodValidationPipe(stockMoveSchema)) body: StockMoveInput) {
    return this.service.createStockMove(body);
  }

  // requisitions
  @Get('requisitions')
  @RequirePermissions('purchase:read')
  listRequisitions(@Query() q: unknown) {
    return this.service.listRequisitions(parseQuery(requisitionQuerySchema, q));
  }

  @Post('requisitions')
  @RequirePermissions('purchase:create')
  createRequisition(@Body(new ZodValidationPipe(requisitionSchema)) body: RequisitionInput) {
    return this.service.createRequisition(body);
  }

  @Post('requisitions/:id/decide')
  @RequirePermissions('purchase:approve')
  decideRequisition(@Param('id') id: string, @Body(new ZodValidationPipe(decideRequisitionSchema)) body: z.infer<typeof decideRequisitionSchema>) {
    return this.service.decideRequisition(id, body.approved);
  }

  // purchase orders
  @Get('purchase-orders')
  @RequirePermissions('purchase:read')
  listPurchaseOrders(@Query() q: unknown) {
    return this.service.listPurchaseOrders(parseQuery(poQuerySchema, q));
  }

  @Post('purchase-orders')
  @RequirePermissions('purchase:create')
  createPurchaseOrder(@Body(new ZodValidationPipe(purchaseOrderSchema)) body: PurchaseOrderInput) {
    return this.service.createPurchaseOrder(body);
  }

  @Get('purchase-orders/:id')
  @RequirePermissions('purchase:read')
  getPurchaseOrder(@Param('id') id: string) {
    return this.service.getPurchaseOrder(id);
  }

  @Patch('purchase-orders/:id/status')
  @RequirePermissions('purchase:update')
  setPoStatus(@Param('id') id: string, @Body(new ZodValidationPipe(poStatusSchema)) body: z.infer<typeof poStatusSchema>) {
    return this.service.setPurchaseOrderStatus(id, body.status);
  }

  // GRN
  @Get('grn')
  @RequirePermissions('purchase:read')
  listGrns(@Query() q: unknown) {
    return this.service.listGrns(parseQuery(grnQuerySchema, q));
  }

  @Post('grn')
  @RequirePermissions('purchase:create')
  createGrn(@Body(new ZodValidationPipe(grnSchema)) body: GrnInput) {
    return this.service.createGrn(body);
  }
}
