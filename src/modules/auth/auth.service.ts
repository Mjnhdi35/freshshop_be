import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { BcryptService } from './services/bcrypt.service';
import { TokenService } from './services/token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly bcryptService: BcryptService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    try {
      // Check if user already exists
      const existingUser = await this.usersService.findByEmail(
        registerDto.email,
      );
      if (existingUser) {
        throw new UnauthorizedException('User already exists');
      }

      // Create user (password will be hashed in UsersService.create)
      const user = await this.usersService.create({
        email: registerDto.email,
        password: registerDto.password,
        displayName: registerDto.displayName,
      });

      // Generate token pair and store refresh token in Redis
      const { accessToken, refreshToken } =
        await this.tokenService.generateTokenPair(user);

      this.logger.log(`✅ User registered successfully: ${user.email}`);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          avatar: user.avatar,
          role: user.role,
        },
      };
    } catch (error) {
      this.logger.error('❌ Registration failed:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Find user by email
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Validate password
      const isPasswordValid = await this.bcryptService.comparePassword(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate token pair and store refresh token in Redis
      const { accessToken, refreshToken } =
        await this.tokenService.generateTokenPair(user);

      this.logger.log(`✅ User logged in successfully: ${user.email}`);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          avatar: user.avatar,
          role: user.role,
        },
      };
    } catch (error) {
      this.logger.error('❌ Login failed:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto | null> {
    try {
      const tokenPair =
        await this.tokenService.refreshAccessToken(refreshToken);

      if (!tokenPair) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user info from the new access token
      const payload = await this.tokenService.validateAccessToken(
        tokenPair.accessToken,
      );
      if (!payload) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      this.logger.log(
        `✅ Tokens refreshed successfully for user: ${user.email}`,
      );

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          avatar: user.avatar,
          role: user.role,
        },
      };
    } catch (error) {
      this.logger.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // Revoke refresh token
      await this.tokenService.revokeRefreshToken(userId);

      this.logger.log(`✅ User logged out successfully: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Logout failed for user ${userId}:`, error);
      throw error;
    }
  }

  async logoutAll(userId: string): Promise<void> {
    try {
      // Revoke all refresh tokens
      await this.tokenService.revokeAllTokens(userId);

      this.logger.log(`✅ All sessions logged out for user: ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Logout all failed for user ${userId}:`, error);
      throw error;
    }
  }

  async validateUser(userId: string): Promise<{
    id: string;
    email: string;
    displayName?: string;
    isActive: boolean;
    role: string;
  } | null> {
    try {
      const user = await this.usersService.findOne(userId);

      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        isActive: user.isActive,
        role: user.role,
      };
    } catch (error) {
      this.logger.error('❌ User validation failed:', error);
      return null;
    }
  }

  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    displayName: string;
    avatar?: string;
  }): Promise<any> {
    try {
      // Check if user exists by email
      let user = await this.usersService.findByEmail(googleUser.email);

      if (user) {
        // Update user with Google ID if not already set
        if (!user.googleId) {
          user.googleId = googleUser.googleId;
          user.avatar = googleUser.avatar || user.avatar;
          user = (await this.usersService.update(user.id, {
            avatar: googleUser.avatar,
          })) as any;
        }
      } else {
        // Create new user
        user = await this.usersService.create({
          email: googleUser.email,
          displayName: googleUser.displayName,
          avatar: googleUser.avatar,
          password: '', // No password for Google users
        });
      }

      return user;
    } catch (error) {
      this.logger.error('❌ Failed to find or create Google user:', error);
      throw error;
    }
  }

  async generateTokenPairForUser(
    user: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const { accessToken, refreshToken } =
        await this.tokenService.generateTokenPair(user);

      this.logger.log(`✅ Generated token pair for Google user: ${user.email}`);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(
        '❌ Failed to generate token pair for Google user:',
        error,
      );
      throw error;
    }
  }
}
