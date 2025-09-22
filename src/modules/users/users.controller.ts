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

    // Constants
    const MAX_LIMIT = 100;
    const DEFAULT_SORT_DIRECTION: 'ASC' | 'DESC' = 'ASC';
    const DEFAULT_SEARCH_FIELDS = ['email', 'displayName'];

    // Helper parsers
    const toInt = (val: any): number | undefined => {
      const num = parseInt(val, 10);
      return Number.isFinite(num) ? num : undefined;
    };

    const clampLimit = (val: any): number | undefined => {
      const n = toInt(val);
      if (n === undefined) return undefined;
      return Math.min(n, MAX_LIMIT);
    };

    // Pagination
    const page = toInt(query.page);
    const limit = clampLimit(query.limit);
    if (page !== undefined) options.page = page;
    if (limit !== undefined) options.limit = limit;

    // Search
    const searchQuery: unknown = query.search;
    if (typeof searchQuery === 'string' && searchQuery.trim().length > 0) {
      options.search = {
        query: searchQuery.trim(),
        fields: DEFAULT_SEARCH_FIELDS,
      };
    }

    // Sort (format: field[:direction])
    const sortInput: unknown = query.sort;
    if (typeof sortInput === 'string' && sortInput.trim().length > 0) {
      const [fieldRaw, dirRaw] = sortInput.split(':');
      const field = fieldRaw?.trim();
      const direction = (dirRaw || DEFAULT_SORT_DIRECTION).toUpperCase();
      if (field) {
        options.sort = [
          {
            field,
            direction: (direction === 'DESC' ? 'DESC' : 'ASC') as
              | 'ASC'
              | 'DESC',
          },
        ];
      }
    }

    // Filter (format: field:operator:value)
    const filterInput: unknown = query.filter;
    if (typeof filterInput === 'string' && filterInput.trim().length > 0) {
      const [field, operator, value] = filterInput.split(':');
      if (field && operator) {
        options.filters = [
          {
            field: field.trim(),
            operator: (operator as any) || 'eq',
            value: (value ?? operator).trim(),
          },
        ];
      }
    }

    // Include relations: comma separated
    const includeInput: unknown = query.include;
    if (typeof includeInput === 'string' && includeInput.trim().length > 0) {
      options.include = includeInput
        .split(',')
        .map((rel) => rel.trim())
        .filter((rel) => rel.length > 0);
    }

    // Select fields: comma separated
    const selectInput: unknown = query.select;
    if (typeof selectInput === 'string' && selectInput.trim().length > 0) {
      options.select = selectInput
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    }

    return options;
  }
}
