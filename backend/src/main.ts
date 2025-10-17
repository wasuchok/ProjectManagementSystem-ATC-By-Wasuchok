import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix('/api/v1')


  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT') || 3000;

  const config = new DocumentBuilder()
    .setTitle('Project Management System ATC By Wasuchok Jainam')
    .setDescription('The Project Management System API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
