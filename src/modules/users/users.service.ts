import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BcryptService } from '../auth/services/bcrypt.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToClass } from 'class-transformer';
import {
  AdvancedQueryBuilderService,
  BaseService,
  QueryBuilderOptions,
  QueryContext,
  ReflectionService,
} from '../../common';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly bcryptService: BcryptService,
    reflectionService: ReflectionService,
    queryBuilderService: AdvancedQueryBuilderService,
  ) {
    super(userRepository, reflectionService, queryBuilderService);
  }

  async createUser(
    createUserDto: CreateUserDto,
    context?: QueryContext,
  ): Promise<User> {
    try {
      const userData: any = { ...createUserDto };

      // Hash password only if provided (not for Google users)
      if (createUserDto.password) {
        userData.password = await this.bcryptService.hashPassword(
          createUserDto.password,
        );
      } else {
        userData.password = null; // No password for Google users
      }

      return await super.create(userData, context);
    } catch (error) {
      this.logger.error('❌ Failed to create user:', error);
      throw error;
    }
  }

  async findAllUsers(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.find();
      return users.map((user) =>
        plainToClass(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
      );
    } catch (error) {
      this.logger.error('❌ Failed to find users:', error);
      throw error;
    }
  }

  async findUserById(id: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to find user ${id}:`, error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({
        where: { email },
        withDeleted: false,
      });
      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to find user by email ${email}:`, error);
      throw error;
    }
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { googleId } });
      return user;
    } catch (error) {
      this.logger.error(
        `❌ Failed to find user by Google ID ${googleId}:`,
        error,
      );
      throw error;
    }
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    context?: QueryContext,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Hash password if provided
      if (updateUserDto.password) {
        updateUserDto.password = await this.bcryptService.hashPassword(
          updateUserDto.password,
        );
      }

      Object.assign(user, updateUserDto);
      const updatedUser = await this.userRepository.save(user);

      this.logger.log(`✅ User updated: ${updatedUser.email}`);
      return plainToClass(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async removeUser(id: string, context?: QueryContext): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      await this.userRepository.remove(user);
      this.logger.log(`✅ User deleted: ${user.email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async activateUser(
    id: string,
    context?: QueryContext,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      user.isActive = true;
      const updatedUser = await this.userRepository.save(user);

      this.logger.log(`✅ User activated: ${updatedUser.email}`);
      return plainToClass(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to activate user ${id}:`, error);
      throw error;
    }
  }

  async deactivateUser(
    id: string,
    context?: QueryContext,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      user.isActive = false;
      const updatedUser = await this.userRepository.save(user);

      this.logger.log(`✅ User deactivated: ${updatedUser.email}`);
      return plainToClass(UserResponseDto, updatedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to deactivate user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get entity class for BaseService (public access)
   */
  getEntityClass(): new () => User {
    return User;
  }

  /**
   * Get entity name for BaseService
   */
  protected getEntityName(): string {
    return 'User';
  }

  /**
   * Advanced query with filters, search, pagination
   */
  async findWithAdvancedQuery(
    options: QueryBuilderOptions,
    context?: QueryContext,
  ) {
    return await this.findWithPagination(options, { context });
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string, options?: Partial<QueryBuilderOptions>) {
    const searchOptions: QueryBuilderOptions = {
      ...options,
      search: {
        query,
        fields: ['email', 'displayName'],
        mode: 'partial',
        caseSensitive: false,
      },
    };

    return await this.findWithPagination(searchOptions);
  }

  /**
   * Filter users by role
   */
  async findByRole(role: string, options?: Partial<QueryBuilderOptions>) {
    const filterOptions: QueryBuilderOptions = {
      ...options,
      filters: [
        {
          field: 'role',
          operator: 'eq',
          value: role,
        },
      ],
    };

    return await this.findWithPagination(filterOptions);
  }

  /**
   * Get active users
   */
  async findActiveUsers(options?: Partial<QueryBuilderOptions>) {
    const filterOptions: QueryBuilderOptions = {
      ...options,
      filters: [
        {
          field: 'isActive',
          operator: 'eq',
          value: true,
        },
      ],
    };

    return await this.findWithPagination(filterOptions);
  }
}
