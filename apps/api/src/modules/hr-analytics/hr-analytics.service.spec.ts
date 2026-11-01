import { Test, TestingModule } from '@nestjs/testing';
import { HrAnalyticsService } from './hr-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('HrAnalyticsService', () => {
  let service: HrAnalyticsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HrAnalyticsService, PrismaService],
    }).compile();

    service = module.get<HrAnalyticsService>(HrAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary with default period', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result).toBeDefined();
      expect(result.periodFrom).toBeDefined();
      expect(result.periodTo).toBeDefined();
      expect(result.totalEmployees).toBeDefined();
      expect(result.turnoverRate).toBeDefined();
      expect(result.attendanceRate).toBeDefined();
    });

    it('should return summary with custom period', async () => {
      const from = new Date(new Date().setMonth(new Date().getMonth() - 3));
      const to = new Date();
      const result = await service.getAnalyticsSummary(from, to);
      expect(result.periodFrom).toEqual(from);
      expect(result.periodTo).toEqual(to);
    });

    it('should have valid turnover rate range', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result.turnoverRate).toBeGreaterThanOrEqual(0);
      expect(result.turnoverRate).toBeLessThanOrEqual(100);
    });
  });
});