import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { Redis } from '@upstash/redis';
import { brotliCompressSync, brotliDecompressSync } from 'zlib';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;
  // Metrics
  private cacheHits = 0;
  private cacheMisses = 0;
  // In-memory LRU (tầng 1)
  private lru: Map<string, { v: string; ts: number; exp?: number }> = new Map();
  private readonly LRU_MAX_ENTRIES: number;
  private readonly LRU_PREFIX_WHITELIST: string[];
  private readonly LRU_SHORT_TTL_SECONDS: number;

  // Defaults (tối ưu chi phí cho Upstash free 128MB)
  private readonly DEFAULT_TTL_SECONDS: number;
  private readonly MAX_VALUE_BYTES: number;
  private readonly COMPRESSION_THRESHOLD_BYTES: number;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {
    // Configurable qua env nếu cần
    this.DEFAULT_TTL_SECONDS = Number(process.env.REDIS_DEFAULT_TTL || 600);
    this.MAX_VALUE_BYTES = Number(
      process.env.REDIS_MAX_VALUE_BYTES || 32 * 1024,
    );
    this.COMPRESSION_THRESHOLD_BYTES = Number(
      process.env.REDIS_COMPRESSION_THRESHOLD_BYTES || 1024,
    );
    this.LRU_MAX_ENTRIES = Number(process.env.LRU_MAX_ENTRIES || 2000);
    this.LRU_PREFIX_WHITELIST = (process.env.LRU_PREFIX_WHITELIST || 'meta:')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    this.LRU_SHORT_TTL_SECONDS = Number(process.env.LRU_SHORT_TTL || 60);
  }

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
      // LRU layer trước (chỉ áp dụng cho key đủ điều kiện)
      if (this.isLruEligible(key)) {
        const lruVal = this.lruGet(key);
        if (lruVal !== undefined) {
          this.cacheHits++;
          return lruVal;
        }
      }
      const result = (await this.redis.get(key)) as string | null;
      this.logger.debug(`📖 Redis GET: ${key}`);
      if (result === null) this.cacheMisses++;
      else this.cacheHits++;
      if (result !== null && this.isLruEligible(key)) {
        this.lruSet(key, result, await this.ttl(key));
      }
      return result;
    } catch (error) {
      this.logger.error(`❌ Redis GET failed for key ${key}:`, error);
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    try {
      // Enforce TTL mặc định nếu không truyền vào
      const ttl = ttlSeconds ?? this.DEFAULT_TTL_SECONDS;
      // Kích thước guard
      const valueBytes = Buffer.byteLength(value);
      if (valueBytes > this.MAX_VALUE_BYTES) {
        this.logger.warn(
          `⚠️ Redis SET skipped: value too large (${valueBytes}B > ${this.MAX_VALUE_BYTES}B) for key ${key}`,
        );
        return 'SKIPPED_TOO_LARGE';
      }

      let result: string;
      result = (await this.redis.setex(key, ttl, value)) as string;
      this.logger.debug(
        `💾 Redis SETEX: ${key} (TTL: ${ttl}s, ${valueBytes}B)`,
      );
      // update LRU nếu đủ điều kiện
      if (this.isLruEligible(key)) {
        this.lruSet(key, value, ttl);
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
      this.lruDelete(key);
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

  // Tránh KEYS * trong prod: dùng SCAN để an toàn hơn
  async scanKeys(matchPattern: string, count: number = 100): Promise<string[]> {
    try {
      let cursor = '0';
      const keys: string[] = [];
      do {
        const res = (await this.redis.scan(cursor, {
          match: matchPattern,
          count,
        })) as any;
        cursor = res[0];
        const batch = res[1] as string[];
        keys.push(...batch);
      } while (cursor !== '0');
      this.logger.debug(
        `🔎 Redis SCAN: ${matchPattern} -> ${keys.length} keys`,
      );
      return keys;
    } catch (error) {
      this.logger.error(
        `❌ Redis SCAN failed for pattern ${matchPattern}:`,
        error,
      );
      throw error;
    }
  }

  // Helpers: build key theo namespace + parts + optional tags
  buildKey(
    namespace: string,
    parts: Array<string | number>,
    tags?: Record<string, string | number>,
  ): string {
    const ns = namespace.trim().toLowerCase();
    const p = parts
      .filter((x) => x !== undefined && x !== null)
      .map((x) => String(x).replace(/\s+/g, '_'))
      .join(':');
    const t = tags
      ? Object.entries(tags)
          .map(([k, v]) => `${k}=${String(v).replace(/\s+/g, '_')}`)
          .join('|')
      : '';
    return t ? `${ns}:${p}|${t}` : `${ns}:${p}`;
  }

  // JSON + nén brotli (prefix br: / j:)
  async setJson(
    key: string,
    obj: unknown,
    ttlSeconds?: number,
  ): Promise<string> {
    const json = JSON.stringify(obj);
    const bytes = Buffer.byteLength(json);
    if (bytes > this.COMPRESSION_THRESHOLD_BYTES) {
      const compressed = brotliCompressSync(Buffer.from(json));
      const b64 = compressed.toString('base64');
      const payload = `br:${b64}`;
      return this.set(key, payload, ttlSeconds);
    }
    return this.set(key, `j:${json}`, ttlSeconds);
  }

  async getJson<T = any>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    if (raw.startsWith('br:')) {
      const b64 = raw.slice(3);
      const buf = Buffer.from(b64, 'base64');
      const decompressed = brotliDecompressSync(buf).toString();
      return JSON.parse(decompressed) as T;
    }
    if (raw.startsWith('j:')) {
      return JSON.parse(raw.slice(2)) as T;
    }
    // fallback legacy plain json
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  // Expose metrics
  getMetrics() {
    return { hits: this.cacheHits, misses: this.cacheMisses };
  }

  // --- LRU helpers (O(1) trung bình dựa trên Map + thao tác sắp xếp lại) ---
  private lruGet(key: string): string | undefined {
    const entry = this.lru.get(key);
    if (!entry) return undefined;
    // expire check
    if (entry.exp && entry.exp * 1000 < Date.now()) {
      this.lru.delete(key);
      return undefined;
    }
    // move to most recent: delete then set
    this.lru.delete(key);
    this.lru.set(key, { ...entry, ts: Date.now() });
    return entry.v;
  }

  private lruSet(key: string, value: string, ttlSeconds?: number) {
    // evict if over capacity
    if (this.lru.size >= this.LRU_MAX_ENTRIES) {
      const oldestKey = this.lru.keys().next().value as string | undefined;
      if (oldestKey) this.lru.delete(oldestKey);
    }
    // Cho metadata/hot reads: dùng TTL ngắn trong LRU để tự làm mới thường xuyên
    const effectiveTtl = ttlSeconds
      ? Math.min(ttlSeconds, this.LRU_SHORT_TTL_SECONDS)
      : this.LRU_SHORT_TTL_SECONDS;
    const exp = Math.floor(Date.now() / 1000) + effectiveTtl;
    this.lru.set(key, { v: value, ts: Date.now(), exp });
  }

  private lruDelete(key: string) {
    this.lru.delete(key);
  }

  private isLruEligible(key: string): boolean {
    return this.LRU_PREFIX_WHITELIST.some((prefix) => key.startsWith(prefix));
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
