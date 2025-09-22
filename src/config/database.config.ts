import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: config.getOrThrow('DATABASE_URL')!,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false, // Disable synchronize for production safety
  logging: config.get('NODE_ENV') !== 'production',
  autoLoadEntities: true,
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    // Neon-friendly pool tuning
    max: Number(config.get('DB_POOL_MAX') || 5),
    min: Number(config.get('DB_POOL_MIN') || 1),
    idleTimeoutMillis: Number(config.get('DB_IDLE_TIMEOUT_MS') || 10000),
    connectionTimeoutMillis: Number(
      config.get('DB_CONNECTION_TIMEOUT_MS') || 5000,
    ),
  },
});
