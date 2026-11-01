import { Test, TestingModule } from '@nestjs/testing';
import { QhseAnalyticsService } from './qhse-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('QhseAnalyticsService', () => {
  let service: QhseAnalyticsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QhseAnalyticsService, PrismaService],
    }).compile();

    service = module.get<QhseAnalyticsService>(QhseAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary with default period', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result).toBeDefined();
      expect(result.periodFrom).toBeDefined();
      expect(result.periodTo).toBeDefined();
      expect(result.totalInspections).toBeDefined();
      expect(result.complianceScore).toBeDefined();
      expect(result.riskLevel).toBeDefined();
    });

    it('should return summary with custom period', async () => {
      const from = new Date(new Date().setMonth(new Date().getMonth() - 3));
      const to = new Date();
      const result = await service.getAnalyticsSummary(from, to);
      expect(result.periodFrom).toBeDefined();
      expect(result.periodTo).toBeDefined();
    });
  });
});