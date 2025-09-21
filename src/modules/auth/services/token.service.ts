import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { User } from '../../users/entities/user.entity';
import { JwtUtils, RedisUtils, JwtPayload } from '../../../utils';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.refreshTokenExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
  }

  async generateTokenPair(user: User): Promise<TokenPair> {
    try {
      const payload: JwtPayload = {
        sub: user.id,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          expiresIn: this.accessTokenExpiry,
        }),
        this.jwtService.signAsync(payload, {
          expiresIn: this.refreshTokenExpiry,
        }),
      ]);

      // Store only refresh token in Redis with TTL
      await this.storeRefreshTokenInRedis(user.id, refreshToken);

      this.logger.log(`✅ Generated token pair for user: ${user.email}`);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('❌ Failed to generate token pair:', error);
      throw error;
    }
  }

  async validateAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;
      return payload;
    } catch (error) {
      this.logger.error('❌ Invalid access token:', error);
      return null;
    }
  }

  async validateRefreshToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(token) as JwtPayload;

      const isTokenValid = await this.isRefreshTokenValid(payload.sub, token);

      if (!isTokenValid) {
        this.logger.warn(
          `⚠️ Refresh token not found in Redis for user: ${payload.sub}`,
        );
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.error('❌ Invalid refresh token:', error);
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    try {
      const payload = await this.validateRefreshToken(refreshToken);

      if (!payload) {
        return null;
      }

      const newPayload: JwtPayload = {
        sub: payload.sub,
        role: payload.role,
      };

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, {
          expiresIn: this.accessTokenExpiry,
        }),
        this.jwtService.signAsync(newPayload, {
          expiresIn: this.refreshTokenExpiry,
        }),
      ]);

      await this.storeRefreshTokenInRedis(payload.sub, newRefreshToken);
      await this.removeRefreshToken(payload.sub, refreshToken);

      this.logger.log(`✅ Refreshed tokens for user: ${payload.sub}`);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error('❌ Failed to refresh access token:', error);
      return null;
    }
  }

  async revokeAllTokens(userId: string): Promise<void> {
    try {
      const refreshTokenKey = RedisUtils.getRefreshTokenKey(userId);
      await this.redisService.del(refreshTokenKey);

      this.logger.log(`✅ Revoked all refresh tokens for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to revoke tokens for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    try {
      const refreshTokenKey = RedisUtils.getRefreshTokenKey(userId);
      await this.redisService.del(refreshTokenKey);
      this.logger.log(`✅ Revoked refresh token for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to revoke refresh token for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async storeRefreshTokenInRedis(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    try {
      const refreshTokenKey = `refresh_token:${userId}`;

      const refreshTokenTTL = JwtUtils.parseExpiryToSeconds(
        this.refreshTokenExpiry,
      );

      await this.redisService.set(
        refreshTokenKey,
        refreshToken,
        refreshTokenTTL,
      );

      this.logger.debug(`💾 Stored refresh token in Redis for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to store refresh token in Redis for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async isRefreshTokenValid(
    userId: string,
    token: string,
  ): Promise<boolean> {
    try {
      const refreshTokenKey = `refresh_token:${userId}`;
      const storedToken = await this.redisService.get(refreshTokenKey);
      return storedToken === token;
    } catch (error) {
      this.logger.error(
        `❌ Failed to validate refresh token for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  private async removeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    try {
      const refreshTokenKey = `refresh_token:${userId}`;
      const storedToken = await this.redisService.get(refreshTokenKey);

      if (storedToken === token) {
        await this.redisService.del(refreshTokenKey);
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to remove refresh token for user ${userId}:`,
        error,
      );
    }
  }
}
