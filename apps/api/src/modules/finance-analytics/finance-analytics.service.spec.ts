import { Test, TestingModule } from '@nestjs/testing';
import { FinanceAnalyticsService } from './finance-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FinanceAnalyticsService', () => {
  let service: FinanceAnalyticsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceAnalyticsService, PrismaService],
    }).compile();

    service = module.get<FinanceAnalyticsService>(FinanceAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary with default period', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result).toBeDefined();
      expect(result.periodFrom).toBeDefined();
      expect(result.periodTo).toBeDefined();
      expect(result.totalRevenue).toBeDefined();
      expect(result.netProfit).toBeDefined();
      expect(result.grossMargin).toBeDefined();
    });

    it('should return summary with custom period', async () => {
      const from = new Date(new Date().setMonth(new Date().getMonth() - 3));
      const to = new Date();
      const result = await service.getAnalyticsSummary(from, to);
      expect(result.periodFrom).toEqual(from);
      expect(result.periodTo).toEqual(to);
    });

    it('should calculate margins correctly', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result.grossMargin).toBeGreaterThanOrEqual(0);
      expect(result.grossMargin).toBeLessThanOrEqual(100);
    });
  });
});