import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(env().API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: env().CORS_ORIGINS.split(','), credentials: true });

  const config = new DocumentBuilder()
    .setTitle('PropERP API')
    .setDescription('Real Estate ERP & CRM SaaS API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || env().API_PORT;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
