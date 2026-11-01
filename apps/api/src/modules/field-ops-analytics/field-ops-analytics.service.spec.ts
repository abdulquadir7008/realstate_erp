import { Test, TestingModule } from '@nestjs/testing';
import { FieldOpsAnalyticsService } from './field-ops-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FieldOpsAnalyticsService', () => {
  let service: FieldOpsAnalyticsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FieldOpsAnalyticsService, PrismaService],
    }).compile();

    service = module.get<FieldOpsAnalyticsService>(FieldOpsAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary with default period', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result).toBeDefined();
      expect(result.periodFrom).toBeDefined();
      expect(result.periodTo).toBeDefined();
      expect(result.totalForms).toBeDefined();
      expect(result.completionRate).toBeDefined();
    });

    it('should return summary with custom period', async () => {
      const from = new Date(new Date().setMonth(new Date().getMonth() - 3));
      const to = new Date();
      const result = await service.getAnalyticsSummary(from, to);
      expect(result.periodFrom).toEqual(from);
      expect(result.periodTo).toEqual(to);
    });

    it('should have valid completion rate', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.completionRate).toBeLessThanOrEqual(100);
    });
  });
});