import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptService {
  private readonly logger = new Logger(BcryptService.name);
  private readonly saltRounds: number;

  constructor(private readonly configService: ConfigService) {
    this.saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 10);
  }

  /**
   * Hash a password using bcrypt
   * @param password - Plain text password
   * @returns Promise<string> - Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      this.logger.debug('✅ Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      this.logger.error('❌ Failed to hash password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare a plain text password with a hashed password
   * @param password - Plain text password
   * @param hashedPassword - Hashed password to compare against
   * @returns Promise<boolean> - True if passwords match
   */
  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      this.logger.debug(
        `🔐 Password comparison result: ${isMatch ? 'match' : 'no match'}`,
      );
      return isMatch;
    } catch (error) {
      this.logger.error('❌ Failed to compare passwords:', error);
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Check if a string is already hashed (starts with $2b$)
   * @param password - String to check
   * @returns boolean - True if already hashed
   */
  isHashed(password: string): boolean {
    return password.startsWith('$2b$');
  }

  /**
   * Hash password only if it's not already hashed
   * @param password - Plain text or hashed password
   * @returns Promise<string> - Hashed password
   */
  async hashIfNeeded(password: string): Promise<string> {
    if (this.isHashed(password)) {
      this.logger.debug('🔒 Password already hashed, skipping');
      return password;
    }

    return this.hashPassword(password);
  }

  /**
   * Get the salt rounds used for hashing
   * @returns number - Salt rounds
   */
  getSaltRounds(): number {
    return this.saltRounds;
  }
}
