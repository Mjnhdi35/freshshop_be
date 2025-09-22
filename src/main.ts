import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.use(helmet());
  app.use(
    compression({
      level: Number(process.env.COMPRESS_LEVEL || 6),
      threshold: Number(process.env.COMPRESS_THRESHOLD_BYTES || 1024),
    }),
  );
  await app.listen(configService.getOrThrow<number>('PORT'));
}
bootstrap();
