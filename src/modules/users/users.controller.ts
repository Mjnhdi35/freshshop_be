import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DynamicQueryBuilderService, DynamicQueryOptions } from '../../common';
import { plainToClass } from 'class-transformer';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dynamicQueryBuilder: DynamicQueryBuilderService,
  ) {}

  /**
   * Get all users with dynamic querying (Postman/Frontend friendly)
   *
   * Query Parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - search: string (searches in email, displayName)
   * - sort: string (format: "field:direction" or "field" for ASC)
   * - filter: string (format: "field:operator:value" or "field:value" for eq)
   * - include: string (comma-separated relations)
   * - select: string (comma-separated fields)
   *
   * Examples:
   * GET /users?page=1&limit=10
   * GET /users?search=john
   * GET /users?sort=createdAt:DESC
   * GET /users?filter=role:eq:admin
   * GET /users?filter=isActive:eq:true
   * GET /users?filter=email:like:%gmail%
   * GET /users?include=profile,orders
   * GET /users?select=id,email,displayName
   */
  @Get()
  async findAll(@Query() query: any) {
    try {
      // Parse query parameters to DynamicQueryOptions
      const options = this.parseQueryToOptions(query);

      // Validate options
      const validation = this.dynamicQueryBuilder.validateQueryOptions(
        this.usersService.getEntityClass(),
        options,
      );

      if (!validation.isValid) {
        throw new Error(
          `Invalid query parameters: ${validation.errors.join(', ')}`,
        );
      }

      // Execute dynamic query
      const result = await this.dynamicQueryBuilder.executeDynamicQuery(
        this.usersService['userRepository'],
        this.usersService.getEntityClass(),
        options,
      );

      // Transform to response DTOs
      const transformedData = result.data.map((user) =>
        plainToClass(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
      );

      return {
        data: transformedData,
        pagination: result.pagination,
        message: 'Users retrieved successfully',
        meta: {
          availableFields: this.dynamicQueryBuilder.getAvailableFields(
            this.usersService.getEntityClass(),
          ),
          queryOptions: options,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const user = await this.usersService.findUserById(id);

      if (!user) {
        throw new Error('User not found');
      }

      const userResponse = plainToClass(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });

      return {
        data: userResponse,
        message: 'User retrieved successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create new user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    try {
      const user = await this.usersService.createUser(createUserDto, {
        user: req.user,
      });

      const userResponse = plainToClass(UserResponseDto, user, {
        excludeExtraneousValues: true,
      });

      return {
        data: userResponse,
        message: 'User created successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    try {
      const user = await this.usersService.updateUser(id, updateUserDto, {
        user: req.user,
      });

      return {
        data: user,
        message: 'User updated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    try {
      await this.usersService.removeUser(id, { user: req.user });

      return {
        message: 'User deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Activate user
   */
  @Post(':id/activate')
  async activate(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    try {
      const user = await this.usersService.activateUser(id, { user: req.user });

      return {
        data: user,
        message: 'User activated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deactivate user
   */
  @Post(':id/deactivate')
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
  ) {
    try {
      const user = await this.usersService.deactivateUser(id, {
        user: req.user,
      });

      return {
        data: user,
        message: 'User deactivated successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get available fields for querying
   */
  @Get('meta/fields')
  async getAvailableFields() {
    try {
      const fields = this.dynamicQueryBuilder.getAvailableFields(
        this.usersService.getEntityClass(),
      );

      return {
        data: fields,
        message: 'Available fields retrieved successfully',
        examples: {
          search: 'GET /users?search=john',
          sort: 'GET /users?sort=createdAt:DESC',
          filter: 'GET /users?filter=role:eq:admin',
          pagination: 'GET /users?page=1&limit=10',
          include: 'GET /users?include=profile,orders',
          select: 'GET /users?select=id,email,displayName',
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Parse query parameters to DynamicQueryOptions
   */
  private parseQueryToOptions(query: any): DynamicQueryOptions {
    const options: DynamicQueryOptions = {};

    // Pagination
    if (query.page) options.page = parseInt(query.page, 10);
    if (query.limit) options.limit = Math.min(parseInt(query.limit, 10), 100);

    // Search
    if (query.search) {
      options.search = {
        query: query.search,
        fields: ['email', 'displayName'], // Default search fields
      };
    }

    // Sort
    if (query.sort) {
      const sortParts = query.sort.split(':');
      options.sort = [
        {
          field: sortParts[0],
          direction: (sortParts[1] || 'ASC').toUpperCase() as 'ASC' | 'DESC',
        },
      ];
    }

    // Filters
    if (query.filter) {
      const filterParts = query.filter.split(':');
      if (filterParts.length >= 2) {
        options.filters = [
          {
            field: filterParts[0],
            operator: (filterParts[1] as any) || 'eq',
            value: filterParts[2] || filterParts[1],
          },
        ];
      }
    }

    // Include relations
    if (query.include) {
      options.include = query.include
        .split(',')
        .map((rel: string) => rel.trim());
    }

    // Select fields
    if (query.select) {
      options.select = query.select
        .split(',')
        .map((field: string) => field.trim());
    }

    return options;
  }
}
