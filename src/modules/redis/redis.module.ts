import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { createRedisClient } from '../../config/redis.config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) =>
        createRedisClient(configService),
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(private readonly redisService: RedisService) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing Redis Module...');

    try {
      // Test Redis connection
      const pingResult = await this.redisService.ping();
      const info = await this.redisService.getInfo();

      this.logger.log('✅ Redis module initialized successfully');
      this.logger.log(`🏓 Redis ping: ${pingResult}`);

      if (info.version) {
        this.logger.log(`📊 Redis version: ${info.version}`);
      }
      if (info.memory) {
        this.logger.log(`💾 Redis memory usage: ${info.memory}`);
      }
    } catch (error) {
      this.logger.error('❌ Redis module initialization failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔄 Shutting down Redis Module...');

    try {
      this.logger.log('✅ Redis module shutdown completed');
    } catch (error) {
      this.logger.error('❌ Error during Redis module shutdown:', error);
    }
  }
}
