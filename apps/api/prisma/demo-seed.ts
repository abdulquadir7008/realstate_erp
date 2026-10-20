/**
 * Demo data for the "Test Builders" tenant (john@example.com).
 * Idempotent: safe to run multiple times.
 *   pnpm --filter @re/api exec tsx prisma/demo-seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const STAFF = [
  { email: 'sales@demo.com', firstName: 'Sara', lastName: 'Sales', role: 'SALES_EXECUTIVE', designation: 'Sales Executive' },
  { email: 'pm@demo.com', firstName: 'Praveen', lastName: 'Manager', role: 'PROJECT_MANAGER', designation: 'Project Manager' },
  { email: 'acct@demo.com', firstName: 'Anita', lastName: 'Accounts', role: 'ACCOUNTANT', designation: 'Accountant' },
];

const PORTAL = { email: 'asha@demo.com', firstName: 'Asha', lastName: 'Kumar', password: 'Passw0rd1' };

const LEAD_SEED = [
  { name: 'Vikram Singh', phone: '9810012345', email: 'vikram.singh@example.com', status: 'NEW', source: 'WEBSITE', budget: 9500000, city: 'Mumbai' },
  { name: 'Priya Sharma', phone: '9810023456', email: 'priya.sharma@example.com', status: 'CONTACTED', source: 'REFERRAL', budget: 12500000, city: 'Mumbai' },
  { name: 'Arjun Mehta', phone: '9810034567', email: 'arjun.mehta@example.com', status: 'QUALIFIED', source: 'CALL', budget: 15000000, city: 'Pune' },
  { name: 'Kavita Nair', phone: '9810045678', email: 'kavita.nair@example.com', status: 'SITE_VISIT', source: 'WALK_IN', budget: 8500000, city: 'Mumbai' },
  { name: 'Rahul Verma', phone: '9810056789', email: 'rahul.verma@example.com', status: 'NEGOTIATION', source: 'WEBSITE', budget: 18000000, city: 'Thane' },
  { name: 'Sneha Iyer', phone: '9810067890', email: 'sneha.iyer@example.com', status: 'NEGOTIATION', source: 'REFERRAL', budget: 11000000, city: 'Mumbai' },
  { name: 'Amit Joshi', phone: '9810078901', email: 'amit.joshi@example.com', status: 'NEW', source: 'SOCIAL', budget: 7500000, city: 'Navi Mumbai' },
  { name: 'Neha Gupta', phone: '9810089012', email: 'neha.gupta@example.com', status: 'CONTACTED', source: 'PORTAL', budget: 13500000, city: 'Mumbai' },
  { name: 'Karan Malhotra', phone: '9810090123', email: 'karan.m@example.com', status: 'QUALIFIED', source: 'WEBSITE', budget: 22000000, city: 'Mumbai' },
  { name: 'Divya Rao', phone: '9810101234', email: 'divya.rao@example.com', status: 'LOST', source: 'CALL', budget: 6000000, city: 'Pune' },
  { name: 'Sanjay Pillai', phone: '9810112345', email: 'sanjay.p@example.com', status: 'CONVERTED', source: 'REFERRAL', budget: 16000000, city: 'Mumbai' },
  { name: 'Meera Das', phone: '9810123456', email: 'meera.das@example.com', status: 'SITE_VISIT', source: 'WALK_IN', budget: 9900000, city: 'Thane' },
];

const CUSTOMER_SEED = [
  { firstName: 'Ravi', lastName: 'Kapoor', email: 'ravi.kapoor@example.com', phone: '9820011111', kyc: 'VERIFIED' },
  { firstName: 'Pooja', lastName: 'Reddy', email: 'pooja.reddy@example.com', phone: '9820022222', kyc: 'VERIFIED' },
  { firstName: 'Aditya', lastName: 'Bhat', email: 'aditya.bhat@example.com', phone: '9820033333', kyc: 'PENDING' },
  { firstName: 'Ritu', lastName: 'Jain', email: 'ritu.jain@example.com', phone: '9820044444', kyc: 'VERIFIED' },
  { firstName: 'Mohit', lastName: 'Agarwal', email: 'mohit.agarwal@example.com', phone: '9820055555', kyc: 'VERIFIED' },
  { firstName: 'Shalini', lastName: 'Bose', email: 'shalini.bose@example.com', phone: '9820066666', kyc: 'PENDING' },
];

const TASK_SEED = [
  { name: 'Foundation pour — Tower B', status: 'IN_PROGRESS', priority: 'HIGH', days: 3 },
  { name: 'Slab casting 4th floor', status: 'TODO', priority: 'HIGH', days: 8 },
  { name: 'Brickwork 2nd-3rd floor', status: 'IN_PROGRESS', priority: 'MEDIUM', days: 12 },
  { name: 'Plumbing rough-in — Tower A', status: 'TODO', priority: 'MEDIUM', days: 16 },
  { name: 'Electrical conduit — floors 1-3', status: 'TODO', priority: 'MEDIUM', days: 20 },
  { name: 'Waterproofing — terrace', status: 'BLOCKED', priority: 'URGENT', days: 2 },
  { name: 'External plastering', status: 'TODO', priority: 'LOW', days: 30 },
  { name: 'Lobby finishing samples', status: 'DONE', priority: 'MEDIUM', days: -5 },
  { name: 'Fire NOC paperwork', status: 'TODO', priority: 'HIGH', days: 25 },
  { name: 'Compound wall RCC', status: 'IN_PROGRESS', priority: 'MEDIUM', days: 10 },
];

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);

async function ensureUser(orgId: string, email: string, first: string, last: string, roleCode: string, designation?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  const user = await prisma.user.create({
    data: {
      email,
      firstName: first,
      lastName: last,
      passwordHash: await hash('Passw0rd1', 12),
      scope: 'TENANT',
      organizationId: orgId,
      status: 'ACTIVE',
      designation: designation ?? null,
    },
  });
  const role = await prisma.role.findFirst({ where: { organizationId: orgId, code: roleCode } });
  if (role) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return user;
}

async function main() {
  const org = await prisma.organization.findFirst({ where: { OR: [{ name: 'Test Builders' }, { slug: 'test-builders' }] } });
  if (!org) {
    console.error('Test Builders organization not found. Run the main seed / register first.');
    process.exit(1);
  }
  const orgId = org.id;

  // ---------- staff + portal users
  const staffUsers: Record<string, string> = {};
  for (const s of STAFF) {
    const u = await ensureUser(orgId, s.email, s.firstName, s.lastName, s.role, s.designation);
    staffUsers[s.role] = u.id;
  }

  const portalUser = await ensureUser(orgId, PORTAL.email, PORTAL.firstName, PORTAL.lastName, 'CUSTOMER');

  // ---------- projects / inventory enrichment
  const projects = await prisma.project.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'asc' } });
  const flagship = projects[0];
  const second = projects[1] ?? projects[0];

  const existingUnits = await prisma.unit.count({ where: { organizationId: orgId } });
  const unitStatuses = [
    ...Array(18).fill('AVAILABLE'),
    ...Array(5).fill('BOOKED'),
    ...Array(3).fill('RESERVED'),
    ...Array(2).fill('ON_HOLD'),
    ...Array(4).fill('SOLD'),
  ];
  const configurations = ['2BHK', '3BHK+2T', '3BHK+3T', '4BHK+3T', '1BHK'];

  if (existingUnits < 25 && flagship) {
    let building = await prisma.building.findFirst({ where: { projectId: flagship.id, code: 'T1' } });
    if (!building) {
      building = await prisma.building.create({
        data: { organizationId: orgId, projectId: flagship.id, name: 'Tower One', code: 'T1', type: 'TOWER', totalFloors: 6, order: 1 },
      });
    }
    for (let f = 0; f < 6; f++) {
      let floor = await prisma.floor.findFirst({ where: { buildingId: building.id, label: String(f) } });
      if (!floor) {
        floor = await prisma.floor.create({
          data: { organizationId: orgId, buildingId: building.id, projectId: flagship.id, label: String(f), floorNumber: f, order: f },
        });
      }
      for (let u = 1; u <= 2; u++) {
        const idx = (f * 2 + u - 1) % unitStatuses.length;
        await prisma.unit.create({
          data: {
            organizationId: orgId,
            projectId: flagship.id,
            buildingId: building.id,
            floorId: floor.id,
            unitNumber: `${f}0${u}`,
            type: 'APARTMENT',
            configuration: configurations[(f + u) % configurations.length],
            carpetArea: 650 + ((f + u) % 4) * 180,
            builtUpArea: 850 + ((f + u) % 4) * 220,
            superBuiltUpArea: 980 + ((f + u) % 4) * 240,
            basePrice: 7_500_000 + ((f + u) % 5) * 1_250_000,
            pricePerSqft: 14_500,
            facing: ['EAST', 'WEST', 'NORTH', 'SOUTH'][(f + u) % 4],
            parkingSlots: u === 1 ? ['P2-14'] : [],
            status: unitStatuses[idx],
          },
        });
      }
    }
    console.log('Inventory enriched.');
  }

  const units = await prisma.unit.findMany({
    where: { organizationId: orgId },
    include: { project: true },
    orderBy: { unitNumber: 'asc' },
  });

  // ---------- milestones
  for (const p of projects) {
    const defs = [
      { name: 'Foundation', pct: 100, status: 'COMPLETED', due: daysAgo(120) },
      { name: 'Structure', pct: p.id === flagship.id ? 65 : 35, status: 'IN_PROGRESS', due: daysAhead(45) },
      { name: 'MEP & Finishing', pct: p.id === flagship.id ? 25 : 10, status: 'IN_PROGRESS', due: daysAhead(120) },
      { name: 'Handover', pct: 0, status: 'PENDING', due: daysAhead(240) },
    ];
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      const existing = await prisma.projectMilestone.findFirst({ where: { projectId: p.id, name: d.name } });
      if (!existing) {
        await prisma.projectMilestone.create({
          data: {
            organizationId: orgId,
            projectId: p.id,
            name: d.name,
            order: i,
            dueDate: d.due,
            status: d.status,
            progressPercent: d.pct,
            completedAt: d.status === 'COMPLETED' ? daysAgo(110) : null,
          },
        });
      }
    }
  }

  // ---------- construction tasks
  const taskCount = await prisma.constructionTask.count({ where: { organizationId: orgId } });
  if (taskCount < 8 && flagship) {
    for (const t of TASK_SEED) {
      await prisma.constructionTask.create({
        data: {
          organizationId: orgId,
          projectId: flagship.id,
          name: t.name,
          status: t.status,
          priority: t.priority,
          dueDate: daysAhead(t.days),
          assigneeId: staffUsers['PROJECT_MANAGER'] ?? null,
        } as any,
      });
    }
    await prisma.constructionTask.create({
      data: {
        organizationId: orgId,
        projectId: second.id,
        name: 'Soil testing phase 2',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: daysAhead(14),
      } as any,
    });
  }

  // ---------- customers
  const customers = [];
  for (const c of CUSTOMER_SEED) {
    let customer = await prisma.customer.findFirst({ where: { organizationId: orgId, email: c.email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId: orgId,
          customerCode: `CUS-${Math.floor(1000 + Math.random() * 8999)}`,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          city: 'Mumbai',
          kycStatus: c.kyc as any,
          status: 'ACTIVE',
          source: 'REFERRAL',
        },
      });
    }
    customers.push(customer);
  }

  // portal customer (Asha) linked to the portal login user
  let portalCustomer = await prisma.customer.findFirst({ where: { organizationId: orgId, userId: portalUser.id } });
  if (!portalCustomer) {
    portalCustomer = await prisma.customer.findFirst({ where: { organizationId: orgId, email: PORTAL.email } });
    if (!portalCustomer) {
      portalCustomer = await prisma.customer.create({
        data: {
          organizationId: orgId,
          customerCode: 'CUS-9001',
          firstName: PORTAL.firstName,
          lastName: PORTAL.lastName,
          email: PORTAL.email,
          phone: '9820099999',
          city: 'Mumbai',
          kycStatus: 'VERIFIED',
          status: 'ACTIVE',
          source: 'WEBSITE',
          userId: portalUser.id,
        },
      });
    } else {
      await prisma.customer.update({ where: { id: portalCustomer.id }, data: { userId: portalUser.id } });
      portalCustomer = { ...portalCustomer, userId: portalUser.id };
    }
  }

  // ---------- leads
  const leadCount = await prisma.lead.count({ where: { organizationId: orgId } });
  if (leadCount < 8) {
    let seq = 1;
    for (const l of LEAD_SEED) {
      const leadNumber = `LD-${String(1000 + seq++)}`;
      const status = l.status as any;
      const converted = status === 'CONVERTED';
      const lead = await prisma.lead.create({
        data: {
          organizationId: orgId,
          leadNumber,
          name: l.name,
          email: l.email,
          phone: l.phone,
          city: l.city,
          source: l.source as any,
          status,
          budgetMin: l.budget * 0.8,
          budgetMax: l.budget * 1.2,
          projectId: flagship?.id ?? null,
          assignedTo: staffUsers['SALES_EXECUTIVE'] ?? null,
          score: Math.min(98, 30 + seq * 5),
          nextFollowUpAt: ['LOST', 'CONVERTED'].includes(status) ? null : daysAhead(1 + (seq % 5)),
          lastActivityAt: daysAgo(seq % 9),
          convertedAt: converted ? daysAgo(4) : null,
          notes: `Interest in ${configurations[seq % configurations.length]} units. Budget ~₹${(l.budget / 100000).toFixed(0)}L.`,
        },
      });
      await prisma.leadActivity.createMany({
        data: [
          { organizationId: orgId, leadId: lead.id, type: 'NOTE', subject: 'Lead captured', content: `Received via ${l.source}`, occurredAt: daysAgo(seq % 9) },
          { organizationId: orgId, leadId: lead.id, type: 'CALL', direction: 'OUTBOUND', subject: 'Discovery call', content: 'Discussed requirements and budget.', occurredAt: daysAgo(Math.max(0, (seq % 9) - 1)) },
        ],
      });
      if (!['LOST', 'CONVERTED'].includes(status)) {
        await prisma.followUp.create({
          data: {
            organizationId: orgId,
            leadId: lead.id,
            scheduledAt: daysAhead(1 + (seq % 6)),
            type: seq % 2 ? 'CALL' : 'SITE_VISIT',
            notes: 'Follow up on shortlisted units',
            status: 'PENDING',
            assignedTo: staffUsers['SALES_EXECUTIVE'] ?? null,
          },
        });
      }
    }
  }

  // ---------- payment plan
  let plan = await prisma.paymentPlan.findFirst({ where: { organizationId: orgId, isDefault: true } });
  if (!plan) {
    plan = await prisma.paymentPlan.create({
      data: { organizationId: orgId, projectId: flagship?.id ?? null, name: 'Construction Linked', isDefault: true },
    });
    const ms = [
      { name: 'On Booking', pct: 15, days: 0 },
      { name: 'On Foundation', pct: 15, days: 60 },
      { name: 'On Slab', pct: 20, days: 150 },
      { name: 'On Brickwork', pct: 20, days: 260 },
      { name: 'On Possession', pct: 30, days: 420 },
    ];
    for (let i = 0; i < ms.length; i++) {
      await prisma.paymentPlanMilestone.create({
        data: {
          organizationId: orgId,
          planId: plan.id,
          name: ms[i].name,
          sequence: i,
          basis: 'PERCENT',
          value: ms[i].pct,
          dueOffsetDays: ms[i].days,
        },
      });
    }
  }

  // ---------- bookings + demands + payments
  const bookingCount = await prisma.booking.count({ where: { organizationId: orgId } });
  const bookable = units.filter((u) => ['AVAILABLE', 'RESERVED', 'ON_HOLD'].includes(u.status)).slice(0, 6);
  const allCustomers = [portalCustomer, ...customers].filter(Boolean) as typeof customers;

  if (bookingCount < 5) {
    for (let i = 0; i < bookable.length; i++) {
      const unit = bookable[i];
      const customer = allCustomers[i % allCustomers.length];
      if (!customer) break;
      const price = Number(unit.basePrice ?? 8_000_000);
      const status = i === 0 ? 'CONFIRMED' : i === 1 ? 'AGREEMENT_SIGNED' : i === 2 ? 'PENDING_APPROVAL' : 'CONFIRMED';
      const booking = await prisma.booking.create({
        data: {
          organizationId: orgId,
          bookingNumber: `BKG-${2026}${String(100 + i)}`,
          projectId: unit.projectId,
          unitId: unit.id,
          customerId: customer.id,
          paymentPlanId: plan.id,
          status: status as any,
          bookingDate: daysAgo(30 + i * 12),
          basePrice: price,
          negotiatedPrice: price - 150_000,
          discountAmount: 150_000,
          totalPrice: price - 150_000,
          salesExecutiveId: staffUsers['SALES_EXECUTIVE'] ?? null,
        } as any,
      });
      await prisma.bookingStatusHistory.createMany({
        data: [
          { bookingId: booking.id, fromStatus: null, toStatus: 'DRAFT', changedBy: staffUsers['SALES_EXECUTIVE'] ?? null, createdAt: daysAgo(30 + i * 12) },
          { bookingId: booking.id, fromStatus: 'DRAFT', toStatus: status as any, changedBy: staffUsers['SALES_EXECUTIVE'] ?? null, createdAt: daysAgo(28 + i * 12) },
        ],
      });
      await prisma.unit.update({ where: { id: unit.id }, data: { status: status === 'PENDING_APPROVAL' ? 'RESERVED' : 'BOOKED' } });

      // demands
      const split = [0.15, 0.15, 0.2, 0.2, 0.3];
      for (let d = 0; d < split.length; d++) {
        const amount = Math.round((price - 150_000) * split[d]);
        const dueDate = d === 0 ? daysAgo(28 + i * 12) : daysAhead(d * 45 - i * 10);
        const past = dueDate < new Date();
        let demandStatus: any = 'DUE';
        let paidAmount = 0;
        if (i < 2) {
          // mostly paid customers
          if (d === 0) {
            paidAmount = amount;
            demandStatus = 'PAID';
          } else if (d === 1 && past) {
            paidAmount = Math.round(amount * 0.5);
            demandStatus = 'PARTIAL';
          } else if (past) {
            demandStatus = 'OVERDUE';
          }
        } else if (d === 0 && i < 4) {
          paidAmount = amount;
          demandStatus = 'PAID';
        } else if (past) {
          demandStatus = 'OVERDUE';
        }
        const demand = await prisma.paymentDemand.create({
          data: {
            organizationId: orgId,
            bookingId: booking.id,
            customerId: customer.id,
            projectId: unit.projectId,
            sequence: d,
            title: ['On Booking', 'On Foundation', 'On Slab', 'On Brickwork', 'On Possession'][d],
            demandNumber: `DM-${2026}${String(i)}${String(d).padStart(2, '0')}`,
            dueDate,
            amount,
            taxAmount: 0,
            totalAmount: amount,
            paidAmount,
            status: demandStatus,
          },
        });
        if (paidAmount > 0) {
          const payment = await prisma.payment.create({
            data: {
              organizationId: orgId,
              bookingId: booking.id,
              customerId: customer.id,
              projectId: unit.projectId,
              amount: paidAmount,
              mode: d % 2 ? 'UPI' : 'BANK_TRANSFER',
              status: 'SUCCESS',
              paidAt: daysAgo(Math.max(1, 28 + i * 12 - d * 10)),
              collectedBy: staffUsers['ACCOUNTANT'] ?? null,
            } as any,
          });
          await prisma.paymentAllocation.create({
            data: { paymentId: payment.id, demandId: demand.id, organizationId: orgId, amount: paidAmount },
          });
          const receipt = await prisma.receipt.create({
            data: {
              organizationId: orgId,
              receiptNumber: `RCP-${2026}${String(i)}${String(d).padStart(2, '0')}`,
              bookingId: booking.id,
              paymentId: payment.id,
              customerId: customer.id,
              amount: paidAmount,
              mode: d % 2 ? ('UPI' as any) : ('BANK_TRANSFER' as any),
              issuedAt: daysAgo(Math.max(1, 28 + i * 12 - d * 10)),
              issuedBy: staffUsers['ACCOUNTANT'] ?? null,
            },
          });
          await prisma.payment.update({ where: { id: payment.id }, data: { receipts: { connect: { id: receipt.id } } } } as any);
          await prisma.invoice.create({
            data: {
              organizationId: orgId,
              invoiceNumber: `INV-${2026}${String(i)}${String(d).padStart(2, '0')}`,
              type: 'SALES',
              status: paidAmount >= amount ? 'PAID' : 'PARTIAL',
              customerId: customer.id,
              bookingId: booking.id,
              demandId: demand.id,
              issueDate: daysAgo(Math.max(1, 28 + i * 12 - d * 10)),
              dueDate,
              subtotal: amount,
              total: amount,
              paidAmount,
              items: [{ description: `${['On Booking', 'Foundation', 'Slab', 'Brickwork', 'Possession'][d]} — ${unit.unitNumber}`, qty: 1, rate: amount, amount }],
            } as any,
          });
        }
      }
    }
    console.log('Bookings, demands, payments, receipts and invoices seeded.');
  }

  // ---------- customer-visible documents
  const portalBookings = await prisma.booking.findMany({ where: { customerId: portalCustomer.id } });
  for (let i = 0; i < portalBookings.length; i++) {
    const b = portalBookings[i];
    const docs = [
      { name: 'Booking Confirmation', fileName: 'booking-confirmation.pdf', folder: 'BOOKING' },
      { name: 'Sale Agreement (Draft)', fileName: 'sale-agreement.pdf', folder: 'AGREEMENT' },
      { name: 'Payment Schedule', fileName: 'payment-schedule.pdf', folder: 'PAYMENT' },
    ];
    for (const d of docs) {
      const exists = await prisma.document.findFirst({ where: { organizationId: orgId, bookingId: b.id, name: d.name } });
      if (!exists) {
        const groupId = crypto.randomUUID();
        await prisma.document.create({
          data: {
            organizationId: orgId,
            folder: d.folder as any,
            projectId: b.projectId,
            customerId: portalCustomer.id,
            bookingId: b.id,
            groupId,
            name: d.name,
            fileName: d.fileName,
            mimeType: 'application/pdf',
            sizeBytes: 180_000,
            storageKey: `demo/${d.fileName}`,
            visibility: 'CUSTOMER',
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  // ---------- tickets
  const ticketCount = await prisma.supportTicket.count({ where: { organizationId: orgId, customerId: portalCustomer.id } });
  if (ticketCount === 0) {
    const t = await prisma.supportTicket.create({
      data: {
        organizationId: orgId,
        ticketNumber: 'TKT-1001',
        customerId: portalCustomer.id,
        bookingId: portalBookings[0]?.id ?? null,
        category: 'SERVICE',
        subject: 'Requesting possession timeline update',
        description: 'Could you share the expected possession timeline and pending approvals?',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        slaDueAt: daysAhead(1),
        createdBy: portalUser.id,
      },
    });
    await prisma.ticketMessage.createMany({
      data: [
        { ticketId: t.id, body: 'Could you share the expected possession timeline and pending approvals?', authorRole: 'CUSTOMER', authorId: portalUser.id },
        { ticketId: t.id, body: 'Structure work is at 65%. Possession is on track for Q4 as per the agreement.', authorRole: 'STAFF', authorId: staffUsers['PROJECT_MANAGER'] ?? null },
      ],
    });
  }

  // ---------- notifications
  const notifCount = await prisma.notification.count({ where: { organizationId: orgId } });
  if (notifCount === 0) {
    await prisma.notification.createMany({
      data: [
        { organizationId: orgId, userId: staffUsers['SALES_EXECUTIVE'] ?? null, type: 'LEAD_ASSIGNED', title: 'New lead assigned', body: 'Vikram Singh is waiting for a callback.' },
        { organizationId: orgId, userId: null, roleCode: 'ACCOUNTANT', type: 'PAYMENT_RECEIVED', title: 'Payment received', body: '₹1,35,000 received via UPI.' },
        { organizationId: orgId, userId: portalUser.id, type: 'TICKET_UPDATED', title: 'Support ticket updated', body: 'Your ticket TKT-1001 has a new reply.' },
        { organizationId: orgId, userId: staffUsers['PROJECT_MANAGER'] ?? null, type: 'TASK_ASSIGNED', title: 'Task due soon', body: 'Waterproofing — terrace is due in 2 days.' },
      ],
    });
  }

  console.log('\nDemo data ready for Test Builders.');
  console.log('Staff logins (password: Passw0rd1):');
  console.log('  Owner:      john@example.com');
  console.log('  Sales:      sales@demo.com');
  console.log('  PM:         pm@demo.com');
  console.log('  Accountant: acct@demo.com');
  console.log('  Customer:   asha@demo.com  (customer portal + mobile)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
