import { Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { errors } from '../../common/api-error';
import { pageOffset, paginated, escapeLike } from '../../common/utils/pagination';
import { requireOrgId, actorId } from '../../common/utils/tenant';
import { nextCode } from '../../common/utils/sequence';
import { CustomerInput, UpdateCustomerInput, PaginationInput } from '@re/shared';

export interface CustomerListQuery extends PaginationInput {
  status?: string;
  kycStatus?: string;
  assignedTo?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: CustomerListQuery) {
    const where: any = { deletedAt: null };
    if (q.status) where.status = q.status;
    if (q.kycStatus) where.kycStatus = q.kycStatus;
    if (q.assignedTo) where.assignedTo = q.assignedTo;
    if (q.from || q.to) where.createdAt = { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
    if (q.search) {
      const s = escapeLike(q.search);
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { customerCode: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: pageOffset(q.page, q.limit),
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { bookings: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginated(
      items.map(({ _count, ...c }) => ({ ...c, bookingCount: _count.bookings })),
      total,
      q.page,
      q.limit,
    );
  }

  async get(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        bookings: {
          select: { id: true, bookingNumber: true, status: true, totalPrice: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw errors.notFound('Customer');
    return customer;
  }

  async create(input: CustomerInput) {
    const orgId = requireOrgId();
    const customerCode = await nextCode(this.prisma, 'CUSTOMER');
    if (input.email) {
      const dup = await this.prisma.customer.findFirst({ where: { email: input.email.toLowerCase(), deletedAt: null } });
      if (dup) throw errors.conflict('A customer with this email already exists');
    }
    const customer = await this.prisma.customer.create({
      data: { ...this.toData(input) as any, organizationId: orgId, customerCode, createdBy: actorId() },
    });

    if (input.password && input.email) {
      const email = input.email.toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (!existing) {
        const role = await this.prisma.role.findFirst({ where: { code: 'CUSTOMER', OR: [{ organizationId: orgId }, { organizationId: null }] } });
        const user = await this.prisma.user.create({
          data: {
            organizationId: orgId,
            email,
            firstName: input.firstName,
            lastName: input.lastName ?? null,
            phone: input.phone ?? null,
            passwordHash: await hash(input.password, 12),
            status: 'ACTIVE',
          },
        });
        if (role) {
          await this.prisma.userRole.create({ data: { userId: user.id, roleId: role.id, orgId } });
        }
        await this.prisma.customer.update({ where: { id: customer.id }, data: { userId: user.id } });
      }
    }
    return this.prisma.customer.findUnique({ where: { id: customer.id } });
  }

  async update(id: string, input: UpdateCustomerInput) {
    await this.get(id);
    return this.prisma.customer.update({ where: { id }, data: this.toData(input) as any });
  }

  async remove(id: string) {
    await this.get(id);
    const bookings = await this.prisma.booking.count({ where: { customerId: id, deletedAt: null } });
    if (bookings > 0) throw errors.conflict('Customer has bookings and cannot be deleted');
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } });
    return { id };
  }

  private toData(input: Partial<CustomerInput> & { kycStatus?: string; status?: string }) {
    const data: any = {};
    const keys = [
      'type',
      'firstName',
      'lastName',
      'companyName',
      'email',
      'phone',
      'altPhone',
      'pan',
      'gstin',
      'dob',
      'address',
      'city',
      'state',
      'country',
      'pincode',
      'assignedTo',
      'notes',
      'source',
      'kycStatus',
      'status',
    ] as const;
    for (const key of keys) if ((input as any)[key] !== undefined) data[key] = (input as any)[key];
    return data;
  }
}
