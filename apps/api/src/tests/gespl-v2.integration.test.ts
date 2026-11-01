import { Test, INestApplication } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import * as pactum from 'pactum';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('GESPL V2 Integration Test Suite', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [],
      providers: [PrismaService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(new AuthGuard(), new RolesGuard());
    await app.init();
    pactum.request.setBaseUrl('http://localhost:3000');
  });

  afterAll(async () => {
    await app.close();
  });

  // ============ Subcontractor Management Tests ============

  describe('Subcontractor Management', () => {
    describe('Work Orders', () => {
      it('should create a work order', () => {
        return pactum
          .request()
          .post('/subcontractormgmt/workorders')
          .json({
            code: 'WO-2026-001',
            name: 'Subcontractor A',
            description: 'Electrical subcontractor',
            projectId: 'proj-001',
          })
          .expectStatus(201)
          .stores('createdWorkOrder');
      });

      it('should list work orders', () => {
        return pactum
          .request()
          .get('/subcontractormgmt/workorders')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('RA Billing', () => {
      it('should create an RA bill', () => {
        return pactum
          .request()
          .post('/subcontractormgmt/ra-billing')
          .json({
            workOrderId: 'createdWorkOrder',
            billNo: 'RA-001',
            billDate: new Date(),
            certifiedQty: 100,
            certifiedAmount: 50000,
            retentionAmount: 5000,
            balanceQty: 10,
            balanceAmount: 5000,
            status: 'DRAFT',
          })
          .expectStatus(201)
          .stores('createdRABill');
      });
    });

    describe('Retention', () => {
      it('should create retention record', () => {
        return pactum
          .request()
          .post('/subcontractormgmt/retention')
          .json({
            workOrderId: 'createdWorkOrder',
            retentionRate: 10,
            retentionAmount: 5000,
            status: 'HELD',
          })
          .expectStatus(201)
          .stores('createdRetention');
      });
    });

    describe('Cost Link', () => {
      it('should create cost link', () => {
        return pactum
          .request()
          .post('/subcontractormgmt/cost-link')
          .json({
            workOrderId: 'createdWorkOrder',
            projectId: 'proj-001',
            costHead: 'SUBCONTRACTOR',
            billedAmount: 50000,
            retainedAmount: 5000,
            netAmount: 45000,
            status: 'PENDING',
          })
          .expectStatus(201)
          .stores('createdCostLink');
      });
    });
  });

  // ============ Finance Tests ============

  describe('Finance & Accounts', () => {
    describe('Cash Flow', () => {
      it('should list cash flow forecast', () => {
        return pactum
          .request()
          .get('/finance/cash-flow-forecast')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('Margin Forecast', () => {
      it('should get margin forecast', () => {
        return pactum
          .request()
          .get('/finance/margin-forecast?projectId=proj-001')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('Budget Alerts', () => {
      it('should list budget alerts', () => {
        return pactum
          .request()
          .get('/finance/budget-alerts?projectId=proj-001')
          .expectStatus(200)
          .has('data');
      });
    });
  });

  // ============ HR Tests ============

  describe('HR & Workforce', () => {
    describe('Employee Master', () => {
      it('should list employees', () => {
        return pactum
          .request()
          .get('/hr/employees')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('Attendance', () => {
      it('should upsert attendance', () => {
        return pactum
          .request()
          .post('/hr/attendance')
          .json({
            employeeId: 'emp-001',
            date: new Date(),
            status: 'PRESENT',
            checkIn: new Date(),
            checkOut: new Date(),
          })
          .expectStatus(201);
      });
    });

    describe('Timesheets', () => {
      it('should create timesheet', () => {
        return pactum
          .request()
          .post('/timesheets')
          .json({
            employeeId: 'emp-001',
            date: new Date(),
            hoursWorked: 8,
            description: 'Regular work',
          })
          .expectStatus(201);
      });
    });

    describe('Payroll', () => {
      it('should calculate payroll', () => {
        return pactum
          .request()
          .post('/payroll/calculate')
          .json({
            employeeId: 'emp-001',
            periodFrom: new Date(),
            periodTo: new Date(Date.now() + 86400000),
          })
          .expectStatus(200)
          .has('netPay');
      });
    });
  });

  // ============ QHSE Tests ============

  describe('QHSE', () => {
    describe('Inspections', () => {
      it('should create inspection', () => {
        return pactum
          .request()
          .post('/qhse/inspections')
          .json({
            projectId: 'proj-001',
            title: 'Safety Inspection',
            type: 'DAILY',
            severity: 'MEDIUM',
            scheduledDate: new Date(),
            reportedBy: 'emp-001',
          })
          .expectStatus(201);
      });
    });

    describe('NCR', () => {
      it('should create NCR', () => {
        return pactum
          .request()
          .post('/qhse/ncr')
          .json({
            projectId: 'proj-001',
            title: 'Non-conformance',
            description: 'Missing safety guard',
            severity: 'HIGH',
            reportedBy: 'emp-001',
          })
          .expectStatus(201);
      });
    });

    describe('Incidents', () => {
      it('should create incident', () => {
        return pactum
          .request()
          .post('/qhse/incidents')
          .json({
            projectId: 'proj-001',
            title: 'Safety incident',
            description: 'Fall from height',
            type: 'SAFETY',
            severity: 'CRITICAL',
            reportedBy: 'emp-001',
          })
          .expectStatus(201);
      });
    });

    describe('Dashboard', () => {
      it('should get QHSE dashboard summary', () => {
        return pactum
          .request()
          .get('/qhse/dashboard/summary')
          .expectStatus(200)
          .has('data');
      });

      it('should generate compliance report', () => {
        return pactum
          .request()
          .get('/qhse/report/compliance?projectId=proj-001')
          .expectStatus(200)
          .has('complianceScore');
      });
    });
  });

  // ============ Field Data Entry Tests ============

  describe('Field Data Entry', () => {
    describe('Forms', () => {
      it('should create field form', () => {
        return pactum
          .request()
          .post('/fld-001/forms')
          .json({
            formType: 'DAILY_REPORT',
            projectId: 'proj-001',
            title: 'Daily Report',
            data: { report: 'Daily site report' },
            submittedBy: 'emp-001',
          })
          .expectStatus(201);
      });

      it('should list field forms', () => {
        return pactum
          .request()
          .get('/fld-001/forms')
          .expectStatus(200)
          .has('data');
      });

      it('should handle offline sync', () => {
        return pactum
          .request()
          .post('/fld-001/sync/handle')
          .json({
            userId: 'emp-001',
            formIds: ['form-001'],
          })
          .expectStatus(200);
      });
    });
  });

  // ============ Document Control Tests ============

  describe('Document Control', () => {
    describe('Documents', () => {
      it('should create document', () => {
        return pactum
          .request()
          .post('/documents')
          .json({
            fileName: 'safety-plan.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1024,
            storageKey: 'doc-001',
            projectId: 'proj-001',
          })
          .expectStatus(201);
      });

      it('should list documents', () => {
        return pactum
          .request()
          .get('/documents')
          .expectStatus(200)
          .has('data');
      });

      it('should add version', () => {
        return pactum
          .request()
          .post('/documents/doc-001/versions')
          .json({
            fileName: 'safety-plan-v2.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            storageKey: 'doc-001-v2',
          })
          .expectStatus(201);
      });

      it('should list versions', () => {
        return pactum
          .request()
          .get('/documents/doc-001/versions')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('Dashboard', () => {
      it('should get document summary', () => {
        return pactum
          .request()
          .get('/documents')
          .expectStatus(200)
          .has('data');
      });
    });
  });

  // ============ HR Self-Service Tests ============

  describe('HR Self-Service', () => {
    describe('Profile', () => {
      it('should get employee profile', () => {
        return pactum
          .request()
          .get('/hr-self-service/profile/me?employeeId=emp-001')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('Payslips', () => {
      it('should get payslip history', () => {
        return pactum
          .request()
          .get('/hr-self-service/payslips/history?employeeId=emp-001')
          .expectStatus(200)
          .has('data');
      });
    });

    describe('Leave', () => {
      it('should get leave balance', () => {
        return pactum
          .request()
          .get('/hr-self-service/leave/balance?employeeId=emp-001')
          .expectStatus(200)
          .has('data');
      });

      it('should apply for leave', () => {
        return pactum
          .request()
          .post('/hr-self-service/leave/apply')
          .json({
            leaveType: 'ANNUAL',
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000),
            reason: 'Vacation',
            totalDays: 1,
          })
          .expectStatus(201);
      });
    });
  });
});