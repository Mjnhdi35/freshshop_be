import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const createRedisClient = (configService: ConfigService): Redis => {
  return new Redis({
    url: configService.get<string>('UPSTASH_REDIS_REST_URL')!,
    token: configService.get<string>('UPSTASH_REDIS_REST_TOKEN')!,
    // Upstash client supports custom fetch; we can set short timeouts via RequestInit
    // For simplicity, rely on Upstash internal defaults; limit retries via env if needed
  });
};
