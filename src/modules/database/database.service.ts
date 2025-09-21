import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private isConnected = false;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('🔧 Database Service initializing...');
    await this.initialize();
  }

  async onModuleDestroy() {
    this.logger.log('🔧 Database Service shutting down...');
    await this.closeConnections();
  }

  async initialize(): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
        this.isConnected = true;
        this.logger.log('✅ Database service initialized');
      }
    } catch (error) {
      this.logger.error('❌ Database service initialization failed:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        this.logger.warn(
          '⚠️ Database not initialized, attempting to connect...',
        );
        await this.initialize();
      }

      // Test query optimized for Neon - check current database and user
      const result = await this.dataSource.query(`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          version() as postgres_version,
          now() as current_time
      `);

      this.isConnected = true;
      this.logger.log('✅ Neon database connection test successful');
      this.logger.debug(
        `Connected to: ${result[0]?.database_name} as ${result[0]?.user_name}`,
      );
      this.logger.debug(`PostgreSQL version: ${result[0]?.postgres_version}`);

      return true;
    } catch (error) {
      this.isConnected = false;
      this.logger.error('❌ Neon database connection test failed:', error);
      return false;
    }
  }

  async closeConnections(): Promise<void> {
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.isConnected = false;
        this.logger.log('✅ Database connections closed');
      }
    } catch (error) {
      this.logger.error('❌ Error closing database connections:', error);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.dataSource.isInitialized;
  }

  getDataSource(): DataSource {
    return this.dataSource;
  }

  async executeQuery(query: string, parameters?: any[]): Promise<any> {
    try {
      this.logger.debug(`📝 Executing query: ${query}`);
      const startTime = Date.now();
      const result = await this.dataSource.query(query, parameters);
      const duration = Date.now() - startTime;

      this.logger.debug(
        `✅ Query executed successfully - ${Array.isArray(result) ? result.length : 1} rows affected in ${duration}ms`,
      );

      // Log slow queries for Neon optimization
      if (duration > 1000) {
        this.logger.warn(
          `🐌 Slow query detected: ${duration}ms - ${query.substring(0, 100)}...`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error('❌ Query execution failed:', error);
      throw error;
    }
  }

  // Neon-specific methods
  async getNeonStatus(): Promise<{
    isActive: boolean;
    connectionCount: number;
    maxConnections: number;
    neonRegion?: string;
    neonProjectId?: string;
  }> {
    try {
      const connectionInfo = await this.getConnectionInfo();

      // Get connection pool info from TypeORM
      const pool = (this.dataSource.driver as any).master?.pool;
      const connectionCount = pool ? pool.totalCount : 0;
      const maxConnections = pool ? pool.options.max : 0;

      return {
        isActive: this.isConnected,
        connectionCount,
        maxConnections,
        neonRegion: connectionInfo.neonRegion,
        neonProjectId: connectionInfo.neonProjectId,
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Neon status:', error);
      return {
        isActive: false,
        connectionCount: 0,
        maxConnections: 0,
      };
    }
  }

  async checkNeonHealth(): Promise<boolean> {
    try {
      // Check if we can execute a simple query
      await this.dataSource.query('SELECT 1');

      // Check Neon-specific features
      const result = await this.dataSource.query(`
        SELECT 
          current_setting('server_version') as version,
          current_setting('timezone') as timezone,
          pg_is_in_recovery() as is_replica
      `);

      this.logger.debug(
        `Neon health check - Version: ${result[0]?.version}, Timezone: ${result[0]?.timezone}`,
      );

      return true;
    } catch (error) {
      this.logger.error('❌ Neon health check failed:', error);
      return false;
    }
  }

  async getConnectionInfo(): Promise<{
    isConnected: boolean;
    isInitialized: boolean;
    driver: string;
    database: string;
    host: string;
    port: number;
    neonRegion?: string;
    neonProjectId?: string;
  }> {
    const options = this.dataSource.options as any;

    // Extract Neon-specific info from connection string if available
    let neonRegion: string | undefined;
    let neonProjectId: string | undefined;

    if (options.url) {
      const url = new URL(options.url);
      // Neon URLs typically contain region and project info
      const hostname = url.hostname;
      if (hostname.includes('neon.tech')) {
        const parts = hostname.split('.');
        if (parts.length >= 3) {
          neonProjectId = parts[0];
          neonRegion = parts[1];
        }
      }
    }

    return {
      isConnected: this.isConnected,
      isInitialized: this.dataSource.isInitialized,
      driver: options.type || 'postgres',
      database: options.database || 'unknown',
      host: options.host || 'unknown',
      port: options.port || 5432,
      neonRegion,
      neonProjectId,
    };
  }
}
