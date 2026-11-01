import { Test, TestingModule } from '@nestjs/testing';
import { ProjectAnalyticsService } from './project-analytics.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProjectAnalyticsService', () => {
  let service: ProjectAnalyticsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectAnalyticsService, PrismaService],
    }).compile();

    service = module.get<ProjectAnalyticsService>(ProjectAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getAnalyticsSummary', () => {
    it('should return analytics summary with default period', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result).toBeDefined();
      expect(result.periodFrom).toBeDefined();
      expect(result.periodTo).toBeDefined();
      expect(result.totalProjects).toBeDefined();
      expect(result.budgetUtilization).toBeDefined();
    });

    it('should return summary with custom period', async () => {
      const from = new Date(new Date().setMonth(new Date().getMonth() - 3));
      const to = new Date();
      const result = await service.getAnalyticsSummary(from, to);
      expect(result.periodFrom).toEqual(from);
      expect(result.periodTo).toEqual(to);
    });

    it('should have valid budget utilization', async () => {
      const result = await service.getAnalyticsSummary();
      expect(result.budgetUtilization).toBeGreaterThanOrEqual(0);
      expect(result.budgetUtilization).toBeLessThanOrEqual(100);
    });
  });
});