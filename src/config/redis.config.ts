import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const createRedisClient = (configService: ConfigService): Redis => {
  return new Redis({
    url: configService.get<string>('UPSTASH_REDIS_REST_URL'),
    token: configService.get<string>('UPSTASH_REDIS_REST_TOKEN'),
  });
};
