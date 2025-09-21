import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async onModuleInit() {
    this.logger.log('🔧 Redis Service initializing...');
    await this.initialize();
  }

  async onModuleDestroy() {
    this.logger.log('🔧 Redis Service shutting down...');
    this.isConnected = false;
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.ping();
      this.isConnected = true;
      this.logger.log('✅ Redis service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Redis service initialization failed:', error);
      throw error;
    }
  }

  async ping(): Promise<string> {
    try {
      const result = await this.redis.ping();
      this.logger.debug('🏓 Redis ping successful');
      return result;
    } catch (error) {
      this.logger.error('❌ Redis ping failed:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = (await this.redis.get(key)) as string | null;
      this.logger.debug(`📖 Redis GET: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis GET failed for key ${key}:`, error);
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    try {
      let result: string;
      if (ttlSeconds) {
        result = (await this.redis.setex(key, ttlSeconds, value)) as string;
        this.logger.debug(`💾 Redis SETEX: ${key} (TTL: ${ttlSeconds}s)`);
      } else {
        result = (await this.redis.set(key, value)) as string;
        this.logger.debug(`💾 Redis SET: ${key}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis SET failed for key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      const result = await this.redis.del(key);
      this.logger.debug(`🗑️ Redis DEL: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis DEL failed for key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      const result = await this.redis.exists(key);
      this.logger.debug(`🔍 Redis EXISTS: ${key} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis EXISTS failed for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, seconds: number): Promise<number> {
    try {
      const result = await this.redis.expire(key, seconds);
      this.logger.debug(`⏰ Redis EXPIRE: ${key} = ${seconds}s`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis EXPIRE failed for key ${key}:`, error);
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const result = await this.redis.ttl(key);
      this.logger.debug(`⏱️ Redis TTL: ${key} = ${result}s`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis TTL failed for key ${key}:`, error);
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.redis.keys(pattern);
      this.logger.debug(
        `🔑 Redis KEYS: ${pattern} (found ${result.length} keys)`,
      );
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis KEYS failed for pattern ${pattern}:`, error);
      throw error;
    }
  }

  async flushall(): Promise<string> {
    try {
      const result = await this.redis.flushall();
      this.logger.warn('🧹 Redis FLUSHALL executed');
      return result;
    } catch (error) {
      this.logger.error('❌ Redis FLUSHALL failed:', error);
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      const result = (await this.redis.hget(key, field)) as string | null;
      this.logger.debug(`📖 Redis HGET: ${key}.${field}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis HGET failed for ${key}.${field}:`, error);
      throw error;
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      const result = await this.redis.hset(key, { [field]: value });
      this.logger.debug(`💾 Redis HSET: ${key}.${field}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis HSET failed for ${key}.${field}:`, error);
      throw error;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      const result = (await this.redis.hgetall(key)) as Record<string, string>;
      this.logger.debug(`📖 Redis HGETALL: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis HGETALL failed for key ${key}:`, error);
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    try {
      const result = await this.redis.hdel(key, field);
      this.logger.debug(`🗑️ Redis HDEL: ${key}.${field}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis HDEL failed for ${key}.${field}:`, error);
      throw error;
    }
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      const result = await this.redis.lpush(key, ...values);
      this.logger.debug(`📝 Redis LPUSH: ${key} (${values.length} values)`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis LPUSH failed for key ${key}:`, error);
      throw error;
    }
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    try {
      const result = await this.redis.rpush(key, ...values);
      this.logger.debug(`📝 Redis RPUSH: ${key} (${values.length} values)`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis RPUSH failed for key ${key}:`, error);
      throw error;
    }
  }

  async lpop(key: string): Promise<string | null> {
    try {
      const result = (await this.redis.lpop(key)) as string | null;
      this.logger.debug(`📤 Redis LPOP: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis LPOP failed for key ${key}:`, error);
      throw error;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      const result = (await this.redis.rpop(key)) as string | null;
      this.logger.debug(`📤 Redis RPOP: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis RPOP failed for key ${key}:`, error);
      throw error;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      const result = await this.redis.lrange(key, start, stop);
      this.logger.debug(`📖 Redis LRANGE: ${key} [${start}:${stop}]`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis LRANGE failed for key ${key}:`, error);
      throw error;
    }
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.redis.sadd(key, members);
      this.logger.debug(`📝 Redis SADD: ${key} (${members.length} members)`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis SADD failed for key ${key}:`, error);
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      const result = await this.redis.smembers(key);
      this.logger.debug(`📖 Redis SMEMBERS: ${key}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis SMEMBERS failed for key ${key}:`, error);
      throw error;
    }
  }

  async sismember(key: string, member: string): Promise<number> {
    try {
      const result = await this.redis.sismember(key, member);
      this.logger.debug(`🔍 Redis SISMEMBER: ${key}.${member}`);
      return result;
    } catch (error) {
      this.logger.error(
        `❌ Redis SISMEMBER failed for ${key}.${member}:`,
        error,
      );
      throw error;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.redis.srem(key, members);
      this.logger.debug(`🗑️ Redis SREM: ${key} (${members.length} members)`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis SREM failed for key ${key}:`, error);
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      this.logger.debug(`➕ Redis INCR: ${key} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis INCR failed for key ${key}:`, error);
      throw error;
    }
  }

  async decr(key: string): Promise<number> {
    try {
      const result = await this.redis.decr(key);
      this.logger.debug(`➖ Redis DECR: ${key} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis DECR failed for key ${key}:`, error);
      throw error;
    }
  }

  async incrby(key: string, increment: number): Promise<number> {
    try {
      const result = await this.redis.incrby(key, increment);
      this.logger.debug(`➕ Redis INCRBY: ${key} +${increment} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis INCRBY failed for key ${key}:`, error);
      throw error;
    }
  }

  async decrby(key: string, decrement: number): Promise<number> {
    try {
      const result = await this.redis.decrby(key, decrement);
      this.logger.debug(`➖ Redis DECRBY: ${key} -${decrement} = ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis DECRBY failed for key ${key}:`, error);
      throw error;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getRedisClient(): Redis {
    return this.redis;
  }

  async getInfo(): Promise<{
    isConnected: boolean;
    version?: string;
    uptime?: string;
    memory?: string;
  }> {
    try {
      return {
        isConnected: this.isConnected,
        version: 'Upstash Redis',
        uptime: 'N/A',
        memory: 'N/A',
      };
    } catch (error) {
      this.logger.error('❌ Failed to get Redis info:', error);
      return {
        isConnected: this.isConnected,
      };
    }
  }
}
