import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: config.getOrThrow('DATABASE_URL')!,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: true,
  autoLoadEntities: true,
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    max: 2,
    min: 1,
    idleTimeoutMillis: 30000,
  },
});
