import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpAdapterHost } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { env } from './config/configuration';
import { PrismaService } from './prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(env().API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env().CORS_ORIGINS.split(','), credentials: true });

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(jwt, prisma, reflector), new PermissionsGuard(reflector));

  const config = new DocumentBuilder()
    .setTitle('PropERP API')
    .setDescription('Real Estate ERP & CRM SaaS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(env().API_PORT, '0.0.0.0');
}

bootstrap();
