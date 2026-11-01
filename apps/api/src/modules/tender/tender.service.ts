import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { toNumber } from '../../modules/budget/budget.engine';
import { CreateTenderDto, UpdateTenderDto, TenderSearchDto } from './dtos';
import { Prisma, BOQStatus, WBSBaselineStatus } from '@prisma/client';

@Injectable()
export class TenderService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search: TenderSearchDto) {
    const orgId = requireOrgId();
    const where: any = { organizationId: orgId, isActive: true };

    if (search.status) where.status = search.status;
    if (search.stage) where.stage = search.stage;
    if (search.goDecision !== undefined) where.goDecision = search.goDecision;
    if (search.clientName) {
      where.clientName = { contains: search.clientName, mode: 'insensitive' };
    }
    if (search.source) where.source = search.source;
    if (search.projectId) where.projectId = search.projectId;
    if (search.assignedTo) where.assignedToId = search.assignedTo;
    if (search.priority) where.priority = search.priority;

    const page = search.page ?? 1;
    const limit = search.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.tender.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { id: true, code: true, name: true } },
          lead: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          qualifications: true,
          risks: true,
          stages: true,
          checklists: true,
          activities: true,
        },
      }),
      this.prisma.tender.count({ where }),
    ]);

    return {
      data: items.map((t: any) => ({
        id: t.id,
        tenderNo: t.tenderNo,
        title: t.title,
        source: t.source,
        clientName: t.clientName,
        estimatedValue: t.estimatedValue,
        currency: t.currency,
        status: t.status,
        stage: t.stage,
        goDecision: t.goDecision,
        priority: t.priority,
        location: t.location,
        createdAt: t.createdAt,
      })),
      meta: { page, limit, total },
    };
  }

  async findOne(id: string) {
    const orgId = requireOrgId();
    const tender = await this.prisma.tender.findFirst({
      where: { id, organizationId: orgId, isActive: true },
      include: {
        project: { select: { id: true, code: true, name: true } },
        lead: { select: { id: true, name: true, status: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, designation: true } },
        qualifications: true,
        risks: true,
        stages: true,
        checklists: true,
        activities: true,
      },
    });

    if (!tender) throw errors.notFound('Tender');
    return tender;
  }

  async create(data: CreateTenderDto) {
    const orgId = requireOrgId();

    // Generate tender number
    const lastTender: any = await this.prisma.tender.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });

    const tenderNo = lastTender && lastTender.tenderNo
      ? `TND-${String(parseInt(lastTender.tenderNo.split('-')[1]) + 1).padStart(3, '0')}`
      : 'TND-001';

    return this.prisma.tender.create({
      data: {
        organizationId: orgId,
        tenderNo,
        title: data.title ?? 'Untitled',
        source: data.source ?? 'INTERNAL_REFERRAL',
        clientName: data.clientName,
        clientContact: data.clientContact,
        issuingAuthority: data.issuingAuthority,
        estimatedValue: data.estimatedValue ?? 0,
        emdAmount: data.emdAmount ?? 0,
        currency: data.currency ?? 'INR',
        tenderFee: data.tenderFee ?? 0,
        publishDate: data.publishDate,
        submissionDueDate: data.submissionDueDate,
        openingDate: data.openingDate,
        preBidMeetingDate: data.preBidMeetingDate,
        location: data.location,
        description: data.description,
        eligibilityNotes: data.eligibilityNotes,
        tags: data.tags ?? [],
        priority: data.priority,
        assignedToId: data.assignedToId,
        leadId: data.leadId,
      },
    });
  }

  async update(id: string, data: UpdateTenderDto) {
    const validData: any = {};

    if (data.title !== undefined) validData.title = data.title;
    if (data.status !== undefined) validData.status = data.status;
    if (data.stage !== undefined) validData.stage = data.stage;
    if (data.priority !== undefined) validData.priority = data.priority;
    if (data.assignedToId !== undefined) validData.assignedToId = data.assignedToId;
    if (data.leadId !== undefined) validData.leadId = data.leadId;
    if (data.clientName !== undefined) validData.clientName = data.clientName;
    if (data.clientContact !== undefined) validData.clientContact = data.clientContact;
    if (data.issuingAuthority !== undefined) validData.issuingAuthority = data.issuingAuthority;
    if (data.estimatedValue !== undefined) validData.estimatedValue = data.estimatedValue;
    if (data.emdAmount !== undefined) validData.emdAmount = data.emdAmount;
    if (data.currency !== undefined) validData.currency = data.currency;
    if (data.tenderFee !== undefined) validData.tenderFee = data.tenderFee;
    if (data.publishDate !== undefined) validData.publishDate = data.publishDate;
    if (data.submissionDueDate !== undefined) validData.submissionDueDate = data.submissionDueDate;
    if (data.openingDate !== undefined) validData.openingDate = data.openingDate;
    if (data.preBidMeetingDate !== undefined) validData.preBidMeetingDate = data.preBidMeetingDate;
    if (data.location !== undefined) validData.location = data.location;
    if (data.description !== undefined) validData.description = data.description;
    if (data.eligibilityNotes !== undefined) validData.eligibilityNotes = data.eligibilityNotes;
    if (data.tags !== undefined) validData.tags = data.tags;
    if (data.outcomeReason !== undefined) validData.outcomeReason = data.outcomeReason;
    if (data.outcomeNotes !== undefined) validData.outcomeNotes = data.outcomeNotes;
    if (data.goDecision !== undefined) validData.goDecision = data.goDecision;
    if (data.goDecisionNotes !== undefined) validData.goDecisionNotes = data.goDecisionNotes;

    return this.prisma.tender.update({
      where: { id },
      data: validData,
    });
  }

  async remove(id: string) {
    const orgId = requireOrgId();
    await this.prisma.tender.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  // Stage advancement
  async advanceStage(id: string, status: string, remarks?: string) {
    const orgId = requireOrgId();
    return this.prisma.$transaction(async (tx: any) => {
      // Create new stage entry
      const stage = await tx.tenderStage.create({
        data: {
          organizationId: orgId,
          tenderId: id,
          name: status,
          status,
          remarks,
          sequence: 0,
        },
      });

      // Update tender main status
      await tx.tender.update({
        where: { id },
        data: { stage },
      });

      return stage;
    });
  }

  async getStages(id: string) {
    const orgId = requireOrgId();
    return this.prisma.tenderStage.findMany({
      where: { organizationId: orgId, tenderId: id },
      orderBy: { sequence: 'asc' },
    });
  }

  // Qualification management
  async addQualification(id: string, data: { criterion: string; requirement?: string; weight: number }) {
    const orgId = requireOrgId();
    return this.prisma.tenderQualification.create({
      data: {
        organizationId: orgId,
        tenderId: id,
        criterion: data.criterion,
        requirement: data.requirement,
        weight: data.weight,
        companyStatus: 'PENDING' as any,
      },
    });
  }

  async updateQualification(id: string, criterion: string, data: { status: string; evidence?: string; remarks?: string }) {
    const orgId = requireOrgId();
    // Find the qualification by criterion
    const qual: any = await this.prisma.tenderQualification.findFirst({
      where: { organizationId: orgId, tenderId: id, criterion },
    });

    if (!qual) throw new NotFoundException('Qualification not found');

    return this.prisma.tenderQualification.update({
      where: { id: qual.id },
      data: {
        companyStatus: data.status as any,
        evidence: data.evidence,
        remarks: data.remarks,
      },
    });
  }

  // Risk management
  async addRisk(id: string, data: { risk: string; category?: string; level?: string; probability?: string; impact?: string; contingency?: number }) {
    const orgId = requireOrgId();
    return this.prisma.tenderRisk.create({
      data: {
        organizationId: orgId,
        tenderId: id,
        risk: data.risk,
        category: data.category,
        level: data.level ?? 'MEDIUM' as any,
        probability: data.probability,
        impact: data.impact,
        contingency: data.contingency ?? 0,
        status: 'OPEN' as any,
      },
    });
  }

  // Stage management
  async addStage(id: string, data: { name: string; isMandatory?: boolean; sequence?: number }) {
    const orgId = requireOrgId();
    // Get current max sequence
    const maxStage: any = await this.prisma.tenderStage.findFirst({
      where: { organizationId: orgId, tenderId: id },
      orderBy: { sequence: 'desc' },
    });

    const sequence = maxStage ? maxStage.sequence + 1 : 0;

    return this.prisma.tenderStage.create({
      data: {
        organizationId: orgId,
        tenderId: id,
        name: data.name,
        isMandatory: data.isMandatory ?? true,
        sequence,
      },
    });
  }

  async updateStage(id: string, stageName: string, data: { status: string; startedAt?: Date; completedAt?: Date; completedBy?: string; remarks?: string }) {
    const orgId = requireOrgId();
    // Find the stage by name
    const stage: any = await this.prisma.tenderStage.findFirst({
      where: { organizationId: orgId, tenderId: id, name: stageName },
    });

    if (!stage) throw new NotFoundException('Stage not found');

    return this.prisma.tenderStage.update({
      where: { id: stage.id },
      data: {
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        completedBy: data.completedBy,
        remarks: data.remarks,
      },
    });
  }

  // Checklist management
  async addChecklistItem(id: string, data: { item: string; isRequired?: boolean }) {
    const orgId = requireOrgId();
    // Get max sortOrder
    const maxItem: any = await this.prisma.tenderChecklistItem.findFirst({
      where: { organizationId: orgId, tenderId: id },
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = maxItem ? maxItem.sortOrder + 1 : 0;

    return this.prisma.tenderChecklistItem.create({
      data: {
        organizationId: orgId,
        tenderId: id,
        item: data.item,
        isRequired: data.isRequired ?? true,
        sortOrder,
        isDone: false,
      },
    });
  }

  async updateChecklistItem(id: string, item: string, data: { isDone: boolean; doneBy?: string; remarks?: string }) {
    const orgId = requireOrgId();
    // Find the checklist item by item name and organization/tender
    const checklistItem: any = await this.prisma.tenderChecklistItem.findFirst({
      where: { organizationId: orgId, tenderId: id, item },
    });

    if (!checklistItem) throw new NotFoundException('Checklist item not found');

    return this.prisma.tenderChecklistItem.update({
      where: { id: checklistItem.id },
      data: {
        isDone: data.isDone,
        doneBy: data.doneBy,
        doneAt: data.isDone ? new Date() : null,
        remarks: data.remarks,
      },
    });
  }

  // Activity management
  async addActivity(id: string, data: { type: string; title: string; description?: string }) {
    const orgId = requireOrgId();
    return this.prisma.tenderActivity.create({
      data: {
        organizationId: orgId,
        tenderId: id,
        type: data.type,
        title: data.title,
        description: data.description,
        performedBy: actorId(),
        performedAt: new Date(),
      },
    });
  }

  // Go/No-Go decision
  async setGoDecision(id: string, decision: 'GO' | 'NO_GO', notes?: string) {
    const orgId = requireOrgId();
    return this.prisma.tender.update({
      where: { id },
      data: {
        goDecision: decision,
        goDecisionBy: actorId(),
        goDecisionAt: new Date(),
        goDecisionNotes: notes,
      },
    });
  }

  // Convert tender to project
  async convertToProject(id: string, data: { projectCode: string; projectName: string; budget?: number }) {
    const orgId = requireOrgId();
    const tender = await this.findOne(id) as import('@prisma/client').Tender;

    if (tender.status !== 'WON') {
      throw new Error('Only won tenders can be converted to projects');
    }

    // Create project from tender
    const project = await this.prisma.project.create({
      data: {
        organizationId: orgId,
        code: data.projectCode,
        name: data.projectName,
        type: 'RESIDENTIAL',
        status: 'PLANNING',
        address: tender.location || '',
        city: tender.location || '',
        totalBudget: data.budget ?? tender.estimatedValue,
        startDate: tender.publishDate,
        managerId: tender.assignedToId,
      },
    });

    // Create BOQ from tender (simplified - using tender estimated values)
    if (tender.estimatedValue && toNumber(tender.estimatedValue) > 0) {
      await this.prisma.bOQ.create({
        data: {
          code: `BOQ-${project.code}`,
          name: `${project.name} BOQ`,
          description: `BOQ derived from tender ${tender.tenderNo}`,
          projectId: project.id,
          status: BOQStatus.DRAFT,
          baselineStatus: WBSBaselineStatus.PROPOSED,
          totalAmount: toNumber(tender.estimatedValue),
          wbsId: null,
          startDate: null,
          endDate: null,
          version: 1,
        } as any,
      });
    }

    return { tender, project };
  }
}