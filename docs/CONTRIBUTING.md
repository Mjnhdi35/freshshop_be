# 🤝 Contributing Guide

## Welcome Contributors! 👋

Thank you for your interest in contributing to this project! This guide will help you understand the architecture and contribute effectively.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (Upstash or local)
- Git

### Setup

```bash
# Clone repository
git clone <repository-url>
cd api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
# DATABASE_URL, JWT_SECRET, REDIS_URL, etc.

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

## 🏗️ Architecture Overview

### Core Principles

1. **Runtime Reflection** - No decorators on entities
2. **Clean Architecture** - Separation of concerns
3. **Type Safety** - Full TypeScript support
4. **Metadata Driven** - Automatic field detection

### Key Components

#### 1. **BaseEntity**

```typescript
// All entities extend this for common fields
export abstract class BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  version: number;
  isActive: boolean;
}
```

#### 2. **ReflectionService**

```typescript
// Automatically detects entity capabilities
const config = reflectionService.getQueryConfig(User, userRepository);
// Returns: searchable, filterable, sortable, relations
```

#### 3. **BaseService**

```typescript
// Provides common CRUD operations
export abstract class BaseService<T extends BaseEntity> {
  async create(dto: DeepPartial<T>, context?: QueryContext): Promise<T>;
  async findWithPagination(
    options?: QueryBuilderOptions,
  ): Promise<PaginatedResult<T>>;
  // ... more methods
}
```

## 🔄 Development Workflow

### 1. **Creating a New Entity**

```typescript
// 1. Create entity (no decorators needed!)
@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column('decimal')
  price: number;

  @Column({ nullable: true })
  description?: string;
}
```

### 2. **Creating a Service**

```typescript
// 2. Create service extending BaseService
@Injectable()
export class ProductsService extends BaseService<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly reflectionService: ReflectionService,
    private readonly queryBuilderService: AdvancedQueryBuilderService,
  ) {
    super(productRepository, reflectionService, queryBuilderService);
  }

  protected getEntityClass(): new () => Product {
    return Product;
  }

  protected getEntityName(): string {
    return 'Product';
  }

  // Add custom methods if needed
  async findByCategory(category: string) {
    return this.findWithPagination({
      filters: [{ field: 'category', operator: 'eq', value: category }],
    });
  }
}
```

### 3. **Creating a Controller**

```typescript
// 3. Create controller
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: any) {
    // Convert query params to QueryBuilderOptions
    const options = this.parseQueryParams(query);
    return this.productsService.findWithPagination(options);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOneOrFail(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req: any,
  ) {
    return this.productsService.create(createProductDto, { user: req.user });
  }

  private parseQueryParams(query: any): QueryBuilderOptions {
    // Parse query parameters to QueryBuilderOptions
    // Implementation details...
  }
}
```

### 4. **Creating DTOs**

```typescript
// 4. Create DTOs for validation
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
```

## 📝 Code Standards

### 1. **TypeScript Guidelines**

```typescript
// ✅ Good
interface UserResponse {
  id: string;
  email: string;
  displayName?: string;
}

// ❌ Bad
interface UserResponse {
  id: any;
  email: any;
  displayName: any;
}
```

### 2. **Error Handling**

```typescript
// ✅ Good
async createUser(dto: CreateUserDto): Promise<User> {
  try {
    const user = await this.userRepository.save(dto);
    this.logger.log(`✅ User created: ${user.email}`);
    return user;
  } catch (error) {
    this.logger.error('❌ Failed to create user:', error);
    throw error;
  }
}

// ❌ Bad
async createUser(dto: CreateUserDto): Promise<User> {
  const user = await this.userRepository.save(dto);
  return user; // No error handling
}
```

### 3. **Logging**

```typescript
// ✅ Good
this.logger.log(`✅ User created: ${user.email}`);
this.logger.error('❌ Failed to create user:', error);
this.logger.warn('⚠️ User not found:', userId);

// ❌ Bad
console.log('User created');
console.error('Error');
```

### 4. **Naming Conventions**

```typescript
// ✅ Good
export class UsersService extends BaseService<User> {
  async findByEmail(email: string): Promise<User | null> {
    // Implementation
  }
}

// ❌ Bad
export class usersService extends BaseService<User> {
  async findbyemail(email: string): Promise<User | null> {
    // Implementation
  }
}
```

## 🧪 Testing

### 1. **Unit Tests**

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        // Mock other dependencies
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should create user with audit trail', async () => {
    const userData = { email: 'test@example.com', password: 'password123' };
    const context = { user: { id: 'admin-id' } };

    const result = await service.create(userData, context);

    expect(result.createdBy).toBe('admin-id');
    expect(result.updatedBy).toBe('admin-id');
  });
});
```

### 2. **Integration Tests**

```typescript
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.pagination).toBeDefined();
      });
  });
});
```

### 3. **Running Tests**

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📚 Documentation

### 1. **Code Documentation**

````typescript
/**
 * Service for managing users with advanced querying capabilities
 *
 * @example
 * ```typescript
 * // Search users
 * const users = await usersService.searchUsers('john', {
 *   pagination: { page: 1, limit: 10 }
 * });
 *
 * // Filter by role
 * const admins = await usersService.findByRole('admin');
 * ```
 */
@Injectable()
export class UsersService extends BaseService<User> {
  // Implementation
}
````

### 2. **API Documentation**

- Update `docs/API.md` when adding new endpoints
- Include request/response examples
- Document query parameters and filters

### 3. **Architecture Documentation**

- Update `docs/ARCHITECTURE.md` for architectural changes
- Document new patterns and conventions

## 🔄 Pull Request Process

### 1. **Before Submitting**

```bash
# Run tests
npm run test
npm run test:e2e

# Check linting
npm run lint

# Format code
npm run format

# Build project
npm run build
```

### 2. **PR Template**

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 3. **Review Process**

1. **Automated Checks** - CI/CD pipeline runs tests and linting
2. **Code Review** - At least one reviewer required
3. **Testing** - Manual testing for complex changes
4. **Documentation** - Ensure docs are updated

## 🐛 Bug Reports

### Bug Report Template

```markdown
## Bug Description

Clear description of the bug

## Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3

## Expected Behavior

What should happen

## Actual Behavior

What actually happens

## Environment

- Node.js version:
- Database version:
- Redis version:
- OS:

## Additional Context

Any other relevant information
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description

Clear description of the feature

## Use Case

Why is this feature needed?

## Proposed Solution

How should this feature work?

## Alternatives Considered

Other solutions you've considered

## Additional Context

Any other relevant information
```

## 🏷️ Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Steps

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release tag
4. Deploy to staging
5. Deploy to production

## 🤔 Questions?

### Getting Help

- **Documentation** - Check existing docs first
- **Issues** - Search existing issues
- **Discussions** - Use GitHub discussions for questions
- **Code Review** - Ask questions in PR reviews

### Best Practices

1. **Read First** - Always read existing code and docs
2. **Ask Questions** - Don't hesitate to ask for clarification
3. **Small PRs** - Keep pull requests focused and small
4. **Test Everything** - Write tests for your changes
5. **Document Changes** - Update documentation as needed

## 🎉 Recognition

Contributors will be recognized in:

- `CONTRIBUTORS.md` file
- Release notes
- Project README

Thank you for contributing! 🚀
