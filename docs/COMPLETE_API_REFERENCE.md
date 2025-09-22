# 📚 NestJS 11 API Reference - Tài liệu chi tiết các tính năng NestJS

## 🎯 Tổng quan

Tài liệu này cung cấp giải thích chi tiết về tất cả các tính năng NestJS 11 được sử dụng trong dự án, bao gồm decorators, interceptors, guards, pipes, và các tính năng framework khác.

## 📖 NestJS Fundamentals

### Kiến trúc cơ bản của NestJS

NestJS được xây dựng dựa trên kiến trúc modular và sử dụng TypeScript để tạo ra các ứng dụng server-side hiệu quả. Framework này kết hợp các khái niệm từ Object-Oriented Programming, Functional Programming và Functional Reactive Programming.

#### Core Concepts

**1. Modules (Mô-đun)**

- Là đơn vị cơ bản của ứng dụng NestJS
- Mỗi module đóng gói một chức năng cụ thể
- Có thể import/export các module khác
- Sử dụng decorator `@Module()` để định nghĩa

**2. Controllers (Bộ điều khiển)**

- Xử lý các HTTP requests
- Định tuyến requests đến các handlers tương ứng
- Sử dụng decorator `@Controller()` để định nghĩa
- Chứa các route handlers

**3. Providers (Nhà cung cấp)**

- Các class có thể được inject vào dependencies
- Bao gồm services, repositories, factories, helpers
- Sử dụng decorator `@Injectable()` để định nghĩa
- Được quản lý bởi NestJS DI container

**4. Dependency Injection (Tiêm phụ thuộc)**

- Pattern thiết kế cho phép tạo các dependencies lỏng lẻo
- NestJS tự động resolve và inject dependencies
- Giúp code dễ test và bảo trì

### Request Lifecycle

```
1. Incoming Request
2. Middleware (Global → Route-specific)
3. Guards (Global → Controller → Route-specific)
4. Interceptors (Pre-controller)
5. Pipes (Validation & Transformation)
6. Controller (Route Handler)
7. Service (Business Logic)
8. Interceptors (Post-controller)
9. Exception Filters (If error occurs)
10. Response (To client)
```

### Platform Abstraction

NestJS hỗ trợ nhiều platform:

- **Express.js**: Platform mặc định, ổn định và phổ biến
- **Fastify**: Platform hiệu suất cao, tương thích với Express API

## 🔧 NestJS Techniques

### 1. Advanced Decorators

#### Custom Parameter Decorators

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// Usage
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

#### Custom Method Decorators

```typescript
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);

// Usage
@Get('public')
@Public()
getPublicData() {
  return { message: 'This is public data' };
}
```

### 2. Dynamic Modules

```typescript
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}

// Usage
@Module({
  imports: [DatabaseModule.forRoot({ host: 'localhost', port: 5432 })],
})
export class AppModule {}
```

### 3. Conditional Providers

```typescript
@Module({
  providers: [
    {
      provide: 'CACHE_SERVICE',
      useFactory: (configService: ConfigService) => {
        return configService.get('NODE_ENV') === 'production'
          ? new RedisCacheService()
          : new MemoryCacheService();
      },
      inject: [ConfigService],
    },
  ],
})
export class CacheModule {}
```

### 4. Custom Providers

```typescript
// Value Provider
const connection = 'mysql://localhost:3306/mydb';

@Module({
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useValue: connection,
    },
  ],
})
export class DatabaseModule {}

// Factory Provider
@Module({
  providers: [
    {
      provide: 'ASYNC_CONNECTION',
      useFactory: async (configService: ConfigService) => {
        const config = configService.get('database');
        return await createConnection(config);
      },
      inject: [ConfigService],
    },
  ],
})
export class DatabaseModule {}

// Class Provider
@Module({
  providers: [
    {
      provide: 'CONFIG_OPTIONS',
      useClass: ConfigOptions,
    },
  ],
})
export class ConfigModule {}
```

## 🔒 Security

### 1. Authentication Strategies

#### JWT Authentication

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    return this.authService.validateUser(payload.sub);
  }
}
```

#### Local Authentication

```typescript
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```

### 2. Authorization Guards

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### 3. Security Headers

```typescript
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });

  await app.listen(3000);
}
```

### 4. Rate Limiting

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### 5. Input Validation & Sanitization

```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  displayName?: string;
}
```

## 📋 OpenAPI (Swagger) Integration

### 1. Basic Setup

```typescript
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addTag('users')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

### 2. API Documentation Decorators

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return all users.',
    type: [UserResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized.',
  })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request.',
  })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### 3. DTO Documentation

```typescript
export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
```

### 4. Authentication Documentation

```typescript
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
```

## 🍳 NestJS Recipes

### 1. TypeORM Migrations

#### Migration Setup

```typescript
// src/config/migration.config.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export const getMigrationConfig = (configService: ConfigService) => ({
  type: 'postgres',
  url: configService.getOrThrow('DATABASE_URL'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
});

// package.json scripts
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/migration.config.ts",
    "migration:create": "typeorm-ts-node-commonjs migration:create",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/config/migration.config.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/config/migration.config.ts",
    "migration:show": "typeorm-ts-node-commonjs migration:show -d src/config/migration.config.ts"
  }
}
```

#### Creating Migrations

```typescript
// Generate migration automatically
npm run migration:generate src/migrations/CreateUserTable

// Create empty migration
npm run migration:create src/migrations/AddUserIndexes
```

#### Migration Examples

```typescript
// src/migrations/1703123456789-CreateUserTable.ts
import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateUserTable1703123456789 implements MigrationInterface {
  name = 'CreateUserTable1703123456789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['user', 'admin', 'moderator'],
            default: "'user'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_EMAIL', ['email']),
    );
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_ROLE', ['role']),
    );
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_ACTIVE', ['is_active']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

#### Complex Migration Example

```typescript
// src/migrations/1703123456790-AddUserProfileRelation.ts
import { MigrationInterface, QueryRunner, Table, ForeignKey } from 'typeorm';

export class AddUserProfileRelation1703123456790 implements MigrationInterface {
  name = 'AddUserProfileRelation1703123456790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create profiles table
    await queryRunner.createTable(
      new Table({
        name: 'profiles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'avatar_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'profiles',
      new ForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create unique index for user_id
    await queryRunner.createIndex(
      'profiles',
      new Index('IDX_PROFILES_USER_ID', ['user_id'], { isUnique: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('profiles');
  }
}
```

#### Data Migration Example

```typescript
// src/migrations/1703123456791-MigrateUserData.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserData1703123456791 implements MigrationInterface {
  name = 'MigrateUserData1703123456791';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate existing data
    await queryRunner.query(`
      INSERT INTO profiles (user_id, first_name, last_name, created_at, updated_at)
      SELECT 
        id as user_id,
        SPLIT_PART(display_name, ' ', 1) as first_name,
        SPLIT_PART(display_name, ' ', 2) as last_name,
        created_at,
        updated_at
      FROM users 
      WHERE display_name IS NOT NULL 
      AND display_name != ''
    `);

    // Update user roles based on email domain
    await queryRunner.query(`
      UPDATE users 
      SET role = 'admin' 
      WHERE email LIKE '%@admin.company.com'
    `);

    // Add default profile for users without display_name
    await queryRunner.query(`
      INSERT INTO profiles (user_id, first_name, created_at, updated_at)
      SELECT 
        id as user_id,
        'User' as first_name,
        created_at,
        updated_at
      FROM users 
      WHERE id NOT IN (SELECT user_id FROM profiles)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert data changes
    await queryRunner.query(`DELETE FROM profiles`);
    await queryRunner.query(`UPDATE users SET role = 'user'`);
  }
}
```

#### Schema Change Migration

```typescript
// src/migrations/1703123456792-AddUserIndexes.ts
import { MigrationInterface, QueryRunner, Index } from 'typeorm';

export class AddUserIndexes1703123456792 implements MigrationInterface {
  name = 'AddUserIndexes1703123456792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add composite index
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_ROLE_ACTIVE', ['role', 'is_active']),
    );

    // Add partial index for soft deleted records
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_ACTIVE_EMAIL', ['email'], {
        where: 'deleted_at IS NULL',
      }),
    );

    // Add expression index
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USERS_EMAIL_LOWER', ['LOWER(email)']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_USERS_ROLE_ACTIVE');
    await queryRunner.dropIndex('users', 'IDX_USERS_ACTIVE_EMAIL');
    await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL_LOWER');
  }
}
```

#### Running Migrations

```typescript
// src/config/migration-runner.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MigrationRunnerService {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async runMigrations(): Promise<void> {
    try {
      this.logger.log('Running database migrations...');
      await this.dataSource.runMigrations();
      this.logger.log('Database migrations completed successfully');
    } catch (error) {
      this.logger.error('Migration failed:', error);
      throw error;
    }
  }

  async revertLastMigration(): Promise<void> {
    try {
      this.logger.log('Reverting last migration...');
      await this.dataSource.undoLastMigration();
      this.logger.log('Last migration reverted successfully');
    } catch (error) {
      this.logger.error('Migration revert failed:', error);
      throw error;
    }
  }

  async getMigrationStatus(): Promise<any> {
    const pendingMigrations = await this.dataSource.showMigrations();
    return {
      hasUnrunMigrations: pendingMigrations,
      migrations: await this.dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp DESC',
      ),
    };
  }
}
```

#### Migration in Application Bootstrap

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MigrationRunnerService } from './config/migration-runner.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Run migrations on startup (only in production)
  if (process.env.NODE_ENV === 'production') {
    const migrationRunner = app.get(MigrationRunnerService);
    await migrationRunner.runMigrations();
  }

  await app.listen(3000);
}
bootstrap();
```

#### Migration Best Practices

```typescript
// 1. Always test migrations on a copy of production data
// 2. Write reversible migrations (both up and down methods)
// 3. Use transactions for data migrations
// 4. Add proper indexes for performance
// 5. Use descriptive migration names

// Example: Safe data migration with rollback
export class SafeDataMigration1703123456793 implements MigrationInterface {
  name = 'SafeDataMigration1703123456793';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Use transaction for data safety
    await queryRunner.startTransaction();

    try {
      // Backup existing data
      await queryRunner.query(`
        CREATE TABLE users_backup AS 
        SELECT * FROM users WHERE created_at < '2024-01-01'
      `);

      // Perform data transformation
      await queryRunner.query(`
        UPDATE users 
        SET email = LOWER(email)
        WHERE email != LOWER(email)
      `);

      // Add validation
      const invalidEmails = await queryRunner.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
      `);

      if (invalidEmails[0].count > 0) {
        throw new Error('Invalid email format detected');
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore from backup
    await queryRunner.query(`
      DELETE FROM users WHERE created_at < '2024-01-01'
    `);

    await queryRunner.query(`
      INSERT INTO users 
      SELECT * FROM users_backup
    `);

    await queryRunner.query(`DROP TABLE users_backup`);
  }
}
```

#### Advanced Migration Patterns

```typescript
// 1. Conditional Migration
export class ConditionalMigration1703123456794 implements MigrationInterface {
  name = 'ConditionalMigration1703123456794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding
    const hasColumn = await queryRunner.hasColumn('users', 'phone');
    if (!hasColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'phone',
          type: 'varchar',
          length: '20',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('users', 'phone');
    if (hasColumn) {
      await queryRunner.dropColumn('users', 'phone');
    }
  }
}

// 2. Multi-Database Migration
export class MultiDatabaseMigration1703123456795 implements MigrationInterface {
  name = 'MultiDatabaseMigration1703123456795';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check database type
    const dbType = queryRunner.connection.options.type;

    if (dbType === 'postgres') {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    } else if (dbType === 'mysql') {
      await queryRunner.query(`SET sql_mode = 'STRICT_TRANS_TABLES'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert database-specific changes
    const dbType = queryRunner.connection.options.type;

    if (dbType === 'postgres') {
      await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
    }
  }
}

// 3. Performance-Optimized Migration
export class PerformanceMigration1703123456796 implements MigrationInterface {
  name = 'PerformanceMigration1703123456796';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add index concurrently (PostgreSQL)
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
      ON users (email) 
      WHERE is_active = true
    `);

    // Batch update for large tables
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await queryRunner.query(`
        UPDATE users 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id IN (
          SELECT id FROM users 
          ORDER BY id 
          LIMIT ${batchSize} OFFSET ${offset}
        )
      `);

      hasMore = result.affectedRows === batchSize;
      offset += batchSize;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email_active`);
  }
}
```

#### Migration CLI Commands

```bash
# Generate migration from entity changes
npm run migration:generate src/migrations/UpdateUserTable

# Create empty migration file
npm run migration:create src/migrations/AddUserIndexes

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Run specific migration
npx typeorm migration:run -d src/config/migration.config.ts --transaction each

# Revert to specific migration
npx typeorm migration:revert -d src/config/migration.config.ts --transaction each
```

### 2. Database Transactions

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async createUserWithProfile(
    userData: CreateUserDto,
    profileData: CreateProfileDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, userData);
      const savedUser = await manager.save(user);

      const profile = manager.create(Profile, {
        ...profileData,
        userId: savedUser.id,
      });
      await manager.save(profile);

      return savedUser;
    });
  }
}
```

### 2. File Upload

```typescript
@Controller('upload')
export class UploadController {
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    return files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
    }));
  }
}
```

### 3. WebSocket Integration

```typescript
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): string {
    return `Server received: ${data}`;
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { room: string; user: string }) {
    this.server.to(data.room).emit('userJoined', data.user);
  }
}
```

### 4. Task Scheduling

```typescript
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  @Cron('45 * * * * *')
  handleCron() {
    this.logger.debug('Called every 45 seconds');
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  handleInterval() {
    this.logger.debug('Called every 30 seconds');
  }

  @Interval(10000)
  handleTimeout() {
    this.logger.debug('Called every 10 seconds');
  }
}
```

### 5. Health Checks

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
      () => this.http.pingCheck('api', 'https://api.example.com'),
    ]);
  }
}
```

### 6. Caching Strategy

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  @Cacheable('users')
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  @CacheEvict('users')
  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.save(createUserDto);
  }

  @CacheKey('user')
  @CacheTTL(300)
  async findOne(id: string): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }
}
```

### 7. Microservices Communication

```typescript
// Client
@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_SERVICE') private client: ClientProxy,
  ) {}

  async getUser(id: string) {
    return this.client.send('get_user', id).toPromise();
  }

  async createUser(userData: CreateUserDto) {
    return this.client.emit('user_created', userData);
  }
}

// Server
@MessagePattern('get_user')
async getUser(id: string) {
  return this.userRepository.findOne({ where: { id } });
}

@EventPattern('user_created')
async handleUserCreated(userData: CreateUserDto) {
  console.log('User created:', userData);
}
```

### 8. Custom Exception Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

## 📁 Cấu trúc dự án

```
src/
├── common/                    # Shared modules
│   ├── base-service/         # Base CRUD operations
│   ├── di/                   # Dependency Injection
│   ├── entities/             # Base entities
│   ├── interceptors/         # Response interceptors
│   ├── interfaces/           # Type definitions
│   ├── metadata/             # Metadata reflection
│   ├── query-builder/        # Advanced querying
│   ├── reflection/           # Runtime reflection
│   └── validation/           # Runtime validation
├── config/                   # Configuration files
├── health/                   # Health check endpoints
├── modules/                  # Feature modules
│   ├── auth/                 # Authentication
│   ├── database/             # Database management
│   ├── redis/                # Redis management
│   └── users/                # User management
└── utils/                    # Utility functions
```

## 🏗️ NestJS Core Features

### 1. Decorators (NestJS Decorators)

#### `@Controller()` - Controller Decorator

**Mục đích**: Định nghĩa class là controller và xử lý HTTP requests.

```typescript
@Controller('users')
export class UsersController {
  // Controller methods
}
```

#### `@Injectable()` - Service Decorator

**Mục đích**: Đánh dấu class có thể được inject vào các dependencies khác.

```typescript
@Injectable()
export class UsersService {
  // Service methods
}
```

#### `@Module()` - Module Decorator

**Mục đích**: Định nghĩa module và quản lý dependencies.

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [TypeOrmModule.forFeature([User])],
  exports: [UsersService],
})
export class UsersModule {}
```

#### HTTP Method Decorators

```typescript
@Get()           // GET request
@Post()          // POST request
@Put()           // PUT request
@Patch()         // PATCH request
@Delete()        // DELETE request
@Options()       // OPTIONS request
@Head()          // HEAD request
@All()           // All HTTP methods
```

#### Parameter Decorators

```typescript
@Body()          // Request body
@Param()         // Route parameters
@Query()         // Query parameters
@Headers()       // Request headers
@Req()           // Request object
@Res()           // Response object
@Next()          // Next function
@Ip()            // Client IP
@HostParam()     // Host parameters
@Session()       // Session object
@User()          // User object (custom)
```

### 2. Dependency Injection (NestJS DI)

#### `@Inject()` - Dependency Injection Decorator

**Mục đích**: Inject dependencies vào constructor hoặc properties.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @Inject('CONFIG_OPTIONS')
    private readonly configOptions: any,

    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}
}
```

#### `@Optional()` - Optional Dependency

**Mục đích**: Đánh dấu dependency là optional.

```typescript
constructor(
  @Optional() @Inject('OPTIONAL_SERVICE')
  private readonly optionalService?: OptionalService,
) {}
```

#### `@Self()` - Self Injection

**Mục đích**: Chỉ inject từ current injector.

```typescript
constructor(
  @Self() private readonly selfService: SelfService,
) {}
```

#### `@SkipSelf()` - Skip Self Injection

**Mục đích**: Bỏ qua current injector, inject từ parent.

```typescript
constructor(
  @SkipSelf() private readonly parentService: ParentService,
) {}
```

#### `@Host()` - Host Injection

**Mục đích**: Inject từ host element.

```typescript
constructor(
  @Host() private readonly hostService: HostService,
) {}
```

#### `forwardRef()` - Circular Dependency

**Mục đích**: Giải quyết circular dependencies.

```typescript
@Module({
  imports: [forwardRef(() => AuthModule)],
  exports: [forwardRef(() => UsersService)],
})
export class UsersModule {}
```

### 3. Interceptors (NestJS Interceptors)

#### `@UseInterceptors()` - Interceptor Decorator

**Mục đích**: Áp dụng interceptors cho controllers hoặc methods.

```typescript
@Controller('users')
@UseInterceptors(ResponseInterceptor, LoggingInterceptor)
export class UsersController {
  @UseInterceptors(CacheInterceptor)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

#### `ResponseInterceptor<T>` - Response Standardization

**Mục đích**: Chuẩn hóa tất cả API responses theo format nhất quán.

```typescript
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | PaginatedResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | PaginatedResponse<T>> {
    return next.handle().pipe(
      timeout(30000),
      tap(() => this.logRequest(context)),
      map((data) => this.formatResponse(data)),
      retry({ count: 3, delay: 1000 }),
      catchError((error) => this.handleError(error)),
      finalize(() => this.cleanup()),
      distinctUntilChanged(),
    );
  }
}
```

#### Global Interceptor Registration

```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
```

#### Custom Interceptor Example

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    console.log(`Request: ${request.method} ${request.url}`);

    return next.handle().pipe(
      tap(() => {
        console.log(`Response: ${response.statusCode}`);
      }),
    );
  }
}
```

### 4. Guards (NestJS Guards)

#### `@UseGuards()` - Guard Decorator

**Mục đích**: Áp dụng guards để bảo vệ routes và methods.

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

#### `JwtAuthGuard` - JWT Authentication Guard

**Mục đích**: Xác thực JWT tokens và bảo vệ routes.

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```

#### `RolesGuard` - Role-based Authorization

**Mục đích**: Kiểm tra quyền truy cập dựa trên roles.

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

#### `@Roles()` - Role Decorator

**Mục đích**: Định nghĩa roles cần thiết cho method.

```typescript
@Get()
@Roles(Role.ADMIN, Role.MODERATOR)
@UseGuards(JwtAuthGuard, RolesGuard)
findAll() {
  return this.usersService.findAll();
}
```

#### Global Guard Registration

```typescript
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

### 5. Pipes (NestJS Pipes)

#### `@UsePipes()` - Pipe Decorator

**Mục đích**: Áp dụng pipes để transform và validate data.

```typescript
@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(ValidationPipe, ParseUUIDPipe)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

#### Built-in Pipes

```typescript
// Validation
@UsePipes(ValidationPipe)
@Body() createUserDto: CreateUserDto

// Parse UUID
@Param('id', ParseUUIDPipe) id: string

// Parse Int
@Query('page', ParseIntPipe) page: number

// Parse Float
@Query('price', ParseFloatPipe) price: number

// Parse Bool
@Query('active', ParseBoolPipe) active: boolean

// Parse Array
@Query('tags', ParseArrayPipe) tags: string[]

// Parse Enum
@Query('status', new ParseEnumPipe(UserStatus)) status: UserStatus

// Default Value
@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number
```

#### Custom Validation Pipe

```typescript
@Injectable()
export class CustomValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) {
      throw new BadRequestException('Value is required');
    }

    // Custom validation logic
    if (typeof value !== 'string') {
      throw new BadRequestException('Value must be a string');
    }

    return value;
  }
}
```

#### Global Pipe Registration

```typescript
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

### 6. Exception Filters (NestJS Exception Filters)

#### `@Catch()` - Exception Filter Decorator

**Mục đích**: Bắt và xử lý exceptions trong application.

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
```

#### `@UseFilters()` - Filter Decorator

**Mục đích**: Áp dụng exception filters cho controllers hoặc methods.

```typescript
@Controller('users')
@UseFilters(HttpExceptionFilter)
export class UsersController {
  @UseFilters(CustomExceptionFilter)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

#### Global Exception Filter

```typescript
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

#### Built-in HTTP Exceptions

```typescript
// 400 Bad Request
throw new BadRequestException('Invalid input');

// 401 Unauthorized
throw new UnauthorizedException('Invalid credentials');

// 403 Forbidden
throw new ForbiddenException('Access denied');

// 404 Not Found
throw new NotFoundException('Resource not found');

// 409 Conflict
throw new ConflictException('Resource already exists');

// 422 Unprocessable Entity
throw new UnprocessableEntityException('Validation failed');

// 500 Internal Server Error
throw new InternalServerErrorException('Something went wrong');
```

### 7. Middleware (NestJS Middleware)

#### `@Injectable()` - Middleware Class

**Mục đích**: Xử lý requests trước khi đến controllers.

```typescript
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Request: ${req.method} ${req.url}`);
    next();
  }
}
```

#### Middleware Registration

```typescript
@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

#### Functional Middleware

```typescript
export function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
}

// Usage
consumer.apply(logger).forRoutes('*');
```

### 8. Configuration (NestJS Configuration)

#### `@nestjs/config` - Configuration Module

**Mục đích**: Quản lý configuration và environment variables.

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3000),
      }),
    }),
  ],
})
export class AppModule {}
```

#### `@ConfigService` - Configuration Service

**Mục đích**: Inject và sử dụng configuration values.

```typescript
@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  getDatabaseUrl(): string {
    return this.configService.getOrThrow('DATABASE_URL');
  }

  getPort(): number {
    return this.configService.get<number>('PORT', 3000);
  }
}
```

### 9. TypeORM Integration (NestJS TypeORM)

#### `@nestjs/typeorm` - TypeORM Module

**Mục đích**: Tích hợp TypeORM với NestJS cho database operations.

```typescript
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Product],
      synchronize: false,
      logging: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
})
export class AppModule {}
```

#### `@Entity()` - Entity Decorator

**Mục đích**: Định nghĩa database entities.

```typescript
@Entity('users')
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### `@InjectRepository()` - Repository Injection

**Mục đích**: Inject TypeORM repositories vào services.

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }
}
```

### 10. JWT Authentication (NestJS JWT)

#### `@nestjs/jwt` - JWT Module

**Mục đích**: Xử lý JWT authentication và authorization.

```typescript
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

#### `@nestjs/passport` - Passport Integration

**Mục đích**: Tích hợp Passport.js với NestJS.

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    return this.authService.validateUser(payload.sub);
  }
}
```

### 11. Validation (NestJS Validation)

#### `class-validator` - Validation Decorators

**Mục đích**: Validate DTOs và request data.

```typescript
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsEnum(['user', 'admin', 'moderator'])
  @IsOptional()
  role?: string;
}
```

#### `class-transformer` - Transformation Decorators

**Mục đích**: Transform data types và structures.

```typescript
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  displayName: string;

  @Exclude()
  password: string;

  @Transform(({ value }) => value.toISOString())
  @Expose()
  createdAt: Date;
}
```

### 12. Swagger Documentation (NestJS Swagger)

#### `@nestjs/swagger` - API Documentation

**Mục đích**: Tự động generate API documentation.

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully.' })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

#### Swagger Setup

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

### 13. Caching (NestJS Caching)

#### `@nestjs/cache-manager` - Caching Module

**Mục đích**: Implement caching với Redis hoặc memory.

```typescript
@Module({
  imports: [
    CacheModule.register({
      store: redisStore,
      host: 'localhost',
      port: 6379,
      ttl: 300, // 5 minutes
    }),
  ],
})
export class AppModule {}
```

#### `@CacheKey()` và `@CacheTTL()` - Cache Decorators

**Mục đích**: Cache method results.

```typescript
@Injectable()
export class UsersService {
  @Cacheable('users')
  @CacheTTL(300)
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  @CacheEvict('users')
  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.userRepository.save(createUserDto);
  }
}
```

### 14. Rate Limiting (NestJS Rate Limiting)

#### `@nestjs/throttler` - Rate Limiting Module

**Mục đích**: Implement rate limiting cho API endpoints.

```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

#### `@Throttle()` - Rate Limit Decorator

**Mục đích**: Customize rate limits cho specific endpoints.

```typescript
@Controller('auth')
export class AuthController {
  @Throttle(3, 60) // 3 requests per minute
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

### 15. Health Checks (NestJS Health Checks)

#### `@nestjs/terminus` - Health Check Module

**Mục đích**: Implement health check endpoints.

```typescript
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.pingCheck('redis'),
    ]);
  }
}
```

### 16. Request Lifecycle (NestJS Request Lifecycle)

#### Request Processing Order

**Mục đích**: Hiểu rõ thứ tự xử lý request trong NestJS.

```typescript
// 1. Middleware
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log('1. Middleware');
    next();
  }
}

// 2. Guards
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    console.log('2. Guards');
    return true;
  }
}

// 3. Interceptors (pre)
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log('3. Interceptors (pre)');
    return next.handle();
  }
}

// 4. Pipes
@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    console.log('4. Pipes');
    return value;
  }
}

// 5. Controller
@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    console.log('5. Controller');
    return [];
  }
}

// 6. Interceptors (post)
// 7. Exception Filters (if error)
// 8. Response to client
```

### 17. Custom Decorators (NestJS Custom Decorators)

#### `@User()` - Custom Parameter Decorator

**Mục đích**: Extract user từ request object.

```typescript
export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

// Usage
@Get('profile')
getProfile(@User() user: User) {
  return user;
}

@Get('profile/email')
getUserEmail(@User('email') email: string) {
  return { email };
}
```

#### `@Roles()` - Custom Method Decorator

**Mục đích**: Set roles cho methods.

```typescript
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Usage
@Get()
@Roles('admin', 'moderator')
findAll() {
  return this.usersService.findAll();
}
```

### 18. Event Emitters (NestJS Event Emitters)

#### `@nestjs/event-emitter` - Event System

**Mục đích**: Implement event-driven architecture.

```typescript
@Injectable()
export class UsersService {
  constructor(private eventEmitter: EventEmitter2) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = await this.userRepository.save(createUserDto);

    // Emit event
    this.eventEmitter.emit('user.created', user);

    return user;
  }
}

@Injectable()
export class UserCreatedListener {
  @OnEvent('user.created')
  handleUserCreated(user: User) {
    console.log('User created:', user.email);
    // Send welcome email, etc.
  }
}
```

## 🚀 NestJS Best Practices

### 1. Module Organization

```typescript
// Feature Module Structure
@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### 2. Service Design

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }
}
```

### 3. Controller Design

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ResponseInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'moderator')
  async findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @Post()
  @UsePipes(ValidationPipe)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

### 4. Error Handling

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
    });
  }
}
```

### 5. Configuration Management

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        PORT: Joi.number().default(3000),
      }),
    }),
  ],
})
export class AppModule {}
```

## 📚 NestJS Ecosystem Packages

### Core Packages

- `@nestjs/core` - Core NestJS framework
- `@nestjs/common` - Common utilities and decorators
- `@nestjs/platform-express` - Express.js platform adapter
- `@nestjs/platform-fastify` - Fastify platform adapter

### Database & ORM

- `@nestjs/typeorm` - TypeORM integration
- `@nestjs/mongoose` - Mongoose integration
- `@nestjs/sequelize` - Sequelize integration
- `@nestjs/prisma` - Prisma integration

### Authentication & Security

- `@nestjs/jwt` - JWT authentication
- `@nestjs/passport` - Passport.js integration
- `@nestjs/throttler` - Rate limiting
- `@nestjs/cache-manager` - Caching

### Documentation & Validation

- `@nestjs/swagger` - API documentation
- `class-validator` - Validation decorators
- `class-transformer` - Transformation decorators

### Monitoring & Health

- `@nestjs/terminus` - Health checks
- `@nestjs/prometheus` - Prometheus metrics
- `@nestjs/schedule` - Task scheduling

### Microservices

- `@nestjs/microservices` - Microservices support
- `@nestjs/websockets` - WebSocket support
- `@nestjs/bull` - Queue management

## 🎯 NestJS Development Guidelines

### 1. Project Structure

```
src/
├── common/           # Shared modules
├── modules/          # Feature modules
├── config/           # Configuration
├── main.ts           # Application entry point
└── app.module.ts     # Root module
```

### 2. Naming Conventions

- Controllers: `UsersController`
- Services: `UsersService`
- Modules: `UsersModule`
- DTOs: `CreateUserDto`, `UpdateUserDto`
- Entities: `User`
- Guards: `JwtAuthGuard`
- Interceptors: `ResponseInterceptor`
- Pipes: `ValidationPipe`

### 3. Module Design

- Keep modules focused and cohesive
- Use `forwardRef()` for circular dependencies
- Export services that other modules need
- Import only necessary dependencies

### 4. Error Handling

- Use built-in HTTP exceptions
- Implement global exception filters
- Provide meaningful error messages
- Log errors with context

### 5. Testing

- Write unit tests for services
- Write integration tests for controllers
- Use `@nestjs/testing` utilities
- Mock external dependencies

## 📖 Additional Resources

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS GitHub Repository](https://github.com/nestjs/nest)
- [NestJS Examples](https://github.com/nestjs/nest/tree/master/sample)
- [NestJS Best Practices](https://docs.nestjs.com/fundamentals/testing)

---

**Built with ❤️ using NestJS 11 and modern TypeScript practices.**
