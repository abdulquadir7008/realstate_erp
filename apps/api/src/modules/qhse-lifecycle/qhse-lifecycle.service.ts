import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { requireOrgId, actorId } from '../../common/utils/tenant';

export interface QHSEWorkflowInput {
  projectId: string;
  inspectionId?: string;
  ncrId?: string;
  incidentId?: string;
  actionType: 'INSPECTION' | 'NCR' | 'INCIDENT' | 'COMPLIANCE';
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  dueDate?: Date;
}

export interface QHSEComplianceStatus {
  projectId: string;
  totalInspections: number;
  completedInspections: number;
  openInspections: number;
  criticalInspections: number;
  totalNCRs: number;
  openNCRs: number;
  closedNCRs: number;
  criticalNCRs: number;
  totalIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  complianceScore: number; // 0-100
  openFindings: number;
  recommendations: string[];
}

@Injectable()
export class QHSELifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- QHSE Workflow Initialization

  async initializeQHSEWorkflow(input: QHSEWorkflowInput) {
    // 1. Validate project exists
    const project = await this.prisma.project.findFirst({
      where: { id: input.projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    let createdId: string;
    let itemType: string;

    // 2. Create appropriate record based on action type
    switch (input.actionType) {
      case 'INSPECTION':
        if (!input.inspectionId) {
          const inspection = await this.prisma.inspection.create({
            data: {
              projectId: input.projectId,
              title: `QHSE Inspection - ${new Date().toLocaleDateString()}`,
              description: input.description,
              type: 'SPECIAL',
              severity: input.severity ?? 'MEDIUM',
              status: 'PLANNED',
              scheduledDate: input.dueDate ?? new Date(),
              reportedBy: actorId(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          createdId = inspection.id;
          itemType = 'inspection';
        } else {
          // Update existing inspection
          const inspection = await this.prisma.inspection.findFirst({
            where: { id: input.inspectionId },
          });
          if (!inspection) throw new NotFoundException('Inspection not found');

          const updated = await this.prisma.inspection.update({
            where: { id: input.inspectionId },
            data: {
              severity: input.severity,
              description: input.description,
              updatedAt: new Date(),
            },
          });
          createdId = updated.id;
          itemType = 'inspection';
        }
        break;

      case 'NCR':
        const ncr = await this.prisma.nCR.create({
          data: {
            projectId: input.projectId,
            title: `NCR - ${new Date().toLocaleDateString()}`,
            description: input.description,
            severity: input.severity ?? 'MEDIUM',
            status: 'OPEN',
            reportedBy: actorId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        createdId = ncr.id;
        itemType = 'ncr';
        break;

      case 'INCIDENT':
        const incident = await this.prisma.incident.create({
          data: {
            projectId: input.projectId,
            title: `Incident - ${new Date().toLocaleDateString()}`,
            description: input.description,
            type: 'SAFETY',
            severity: input.severity ?? 'MEDIUM',
            status: 'REPORTED',
            reportedBy: actorId(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        createdId = incident.id;
        itemType = 'incident';
        break;

      case 'COMPLIANCE':
        // Create a compliance record or update project QHSE status
        createdId = crypto.randomUUID();
        itemType = 'compliance';
        break;
    }

    return {
      itemId: createdId,
      itemType,
      projectId: input.projectId,
      actionType: input.actionType,
      description: input.description,
      severity: input.severity,
      assignedTo: input.assignedTo,
      dueDate: input.dueDate,
      message: `QHSE ${input.actionType} workflow initialized`,
    };
  }

  // ---------------- Get QHSE Compliance Status

  async getQHSEComplianceStatus(projectId: string): Promise<QHSEComplianceStatus> {
    const [inspections, ncrs, incidents] = await Promise.all([
      // Inspections summary
      this.prisma.inspection.findMany({
        where: { projectId },
        select: {
          id: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      }),
      // NCRs summary
      this.prisma.nCR.findMany({
        where: { projectId },
        select: {
          id: true,
          severity: true,
          status: true,
          createdAt: true,
        },
      }),
      // Incidents summary
      this.prisma.incident.findMany({
        where: { projectId },
        select: {
          id: true,
          severity: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
        },
      }),
    ]);

    // Calculate counts
    const totalInspections = inspections.length;
    const completedInspections = inspections.filter((i) => i.status === 'CLOSED').length;
    const openInspections = totalInspections - completedInspections;
    const criticalInspections = inspections.filter((i) => i.severity === 'CRITICAL').length;

    const totalNCRs = ncrs.length;
    const closedNCRs = ncrs.filter((n) => n.status === 'CLOSED').length;
    const openNCRs = totalNCRs - closedNCRs;
    const criticalNCRs = ncrs.filter((n) => n.severity === 'CRITICAL').length;

    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED').length;
    const closedIncidents = incidents.filter((i) => i.status === 'CLOSED').length;
    const criticalIncidents = incidents.filter((i) => i.severity === 'CRITICAL').length;

    // Calculate compliance score (0-100)
    let complianceScore = 100;
    const openFindings = openInspections + openNCRs + (totalIncidents - resolvedIncidents);

    if (criticalInspections > 0) complianceScore -= criticalInspections * 10;
    if (criticalNCRs > 0) complianceScore -= criticalNCRs * 10;
    if (criticalIncidents > 0) complianceScore -= criticalIncidents * 10;
    if (openFindings > 10) complianceScore -= 5;
    if (openFindings > 20) complianceScore -= 10;

    complianceScore = Math.max(complianceScore, 0);

    // Generate recommendations
    const recommendations: string[] = [];

    if (criticalInspections > 0) {
      recommendations.push(
        `${criticalInspections} critical inspection(s) - conduct immediate safety audit`
      );
    }

    if (criticalNCRs > 0) {
      recommendations.push(
        `${criticalNCRs} critical NCR(s) - root cause analysis and corrective action required`
      );
    }

    if (criticalIncidents > 0) {
      recommendations.push(
        `${criticalIncidents} critical incident(s) - emergency response review required`
      );
    }

    if (openFindings > 5) {
      recommendations.push(
        `${openFindings} open finding(s) - prioritize resolution plan`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('QHSE compliance is within acceptable parameters');
    }

    return {
      projectId,
      totalInspections,
      completedInspections,
      openInspections,
      criticalInspections,
      totalNCRs,
      openNCRs,
      closedNCRs,
      criticalNCRs,
      totalIncidents,
      resolvedIncidents,
      criticalIncidents,
      complianceScore: Math.round(complianceScore),
      openFindings,
      recommendations,
    };
  }

  // ---------------- Close QHSE Item

  async closeQHSEItem(input: {
    itemId: string;
    itemType: 'INSPECTION' | 'NCR' | 'INCIDENT';
    closureNotes: string;
    closedBy: string;
  }) {
    switch (input.itemType) {
      case 'INSPECTION':
        return this.prisma.inspection.update({
          where: { id: input.itemId },
          data: {
            status: 'CLOSED',
            completedDate: new Date(),
            verifiedBy: input.closedBy,
            findings: input.closureNotes,
            updatedAt: new Date(),
          },
        });

      case 'NCR':
        return this.prisma.nCR.update({
          where: { id: input.itemId },
          data: {
            status: 'CLOSED',
            closedDate: new Date(),
            verifiedBy: input.closedBy,
            correctiveAction: input.closureNotes,
            updatedAt: new Date(),
          },
        });

      case 'INCIDENT':
        return this.prisma.incident.update({
          where: { id: input.itemId },
          data: {
            status: 'CLOSED',
            closedDate: new Date(),
            resolvedBy: input.closedBy,
            resolutionNotes: input.closureNotes,
            updatedAt: new Date(),
          },
        });
    }
  }
}