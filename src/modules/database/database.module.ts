import { Module, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getDatabaseConfig } from '../../config/database.config';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    this.logger.log('🚀 Initializing Database Module...');

    try {
      // Initialize database connection
      await this.databaseService.initialize();

      // Test database connection
      const isConnected = await this.databaseService.testConnection();

      // Additional Neon health check
      const neonHealth = await this.databaseService.checkNeonHealth();
      const neonStatus = await this.databaseService.getNeonStatus();

      if (isConnected && neonHealth) {
        this.logger.log('✅ Neon database connection established successfully');
        this.logger.log(
          `📍 Neon Region: ${neonStatus.neonRegion || 'Unknown'}`,
        );
        this.logger.log(
          `🆔 Project ID: ${neonStatus.neonProjectId || 'Unknown'}`,
        );
        this.logger.log(
          `🔗 Active Connections: ${neonStatus.connectionCount}/${neonStatus.maxConnections}`,
        );
      } else {
        this.logger.error('❌ Failed to establish Neon database connection');
      }
    } catch (error) {
      this.logger.error('❌ Database module initialization failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔄 Shutting down Database Module...');

    try {
      // Close database connections
      await this.databaseService.closeConnections();

      this.logger.log('✅ Database module shutdown completed');
    } catch (error) {
      this.logger.error('❌ Error during database module shutdown:', error);
    }
  }
}
