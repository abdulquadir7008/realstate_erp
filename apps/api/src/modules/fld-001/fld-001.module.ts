import { Module } from '@nestjs/common';
import { Fld001Controller } from './fld-001.controller';
import { Fld001Service } from './fld-001.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [Fld001Controller],
  providers: [Fld001Service, PrismaService],
  exports: [Fld001Service],
})
export class Fld001Module {}