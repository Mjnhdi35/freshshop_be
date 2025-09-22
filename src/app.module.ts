import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DatabaseModule } from './modules/database/database.module';
import { UsersModule } from './modules/users';
import { AuthModule } from './modules/auth';
import { RedisModule } from './modules/redis';
import { CommonModule } from './common/common.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HealthModule } from './health/health.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestMetricsMiddleware } from './common/interceptors/request-metrics.middleware';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('RATE_LIMIT_TTL') || 60),
            limit: Number(config.get('RATE_LIMIT_MAX') || 60),
          },
        ],
      }),
    }),
    CommonModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestMetricsMiddleware).forRoutes('*');
  }
}
