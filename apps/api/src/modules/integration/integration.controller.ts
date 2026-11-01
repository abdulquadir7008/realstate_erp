import 'reflect-metadata';
import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { AuthGuard, RolesGuard } from '../../common/guards';

@Controller('integration')
@UseGuards(AuthGuard, RolesGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  // ---------------- Procurement-to-Payment

  @Post('po/create-with-flow')
  async createPOWithFlow(@Body() input: {
    poNumber: string;
    projectId: string;
    vendorId: string;
    items: { code: string; description: string; quantity: number; unit: string; rate: number; amount: number }[];
    totalAmount: number;
    taxAmount: number;
    status?: 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
    notes?: string;
  }) {
    return this.integrationService.createPOWithFlow(input);
  }

  @Get('po/payment-flow/:poId')
  async getPOPaymentFlow(@Param('poId') poId: string) {
    return this.integrationService.getPOPaymentFlow(poId);
  }

  // ---------------- Subcontractor Work Order Integration

  @Post('subcontractor/integrate/:poId/:woId')
  async integrateSubcontractorWorkflow(@Param('poId') poId: string, @Param('woId') woId: string) {
    return this.integrationService.integrateSubcontractorWorkflow(poId, woId);
  }

  // ---------------- QHSE Compliance Check for PO

  @Get('qhse/compliance/:poId')
  async checkQHSEComplianceForPO(@Param('poId') poId: string) {
    return this.integrationService.checkQHSEComplianceForPO(poId);
  }
}