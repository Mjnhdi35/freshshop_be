# 🏗️ Tài liệu Kiến trúc (Architecture)

Lưu ý nhanh (tiếng Việt):

- Cốt lõi là cách tiếp cận meta-driven (reflection runtime) để tự động phát hiện khả năng truy vấn trên entity mà không cần thêm decorator tùy biến.
- Áp dụng SOLID: mỗi lớp/mô-đun 1 nhiệm vụ (SRP). Reflection → QueryBuilder → BaseService xếp lớp rõ ràng.
- Tối ưu chi phí: giới hạn pool DB nhỏ, TTL/limit qua ENV, HTTP compression, cache 2 tầng (LRU memory + Redis TTL/nén/size limit), log lỗi có cấu trúc, metrics middleware.
- Interceptor chỉ chuẩn hóa response. Retry/metrics chuyển sang middleware/dịch vụ quan trắc.

## Overview

This API uses a **metadata-driven, runtime reflection** approach for dynamic querying. The system automatically detects entity capabilities without requiring decorators on entities.

## Cost & Performance Optimizations

- L1 In-memory LRU cache cho JWT/session trong `RedisService`
- L2 Redis (Upstash) với TTL bắt buộc, nén Brotli >1KB, size limit 32KB
- Rate limiting toàn cục bằng `@nestjs/throttler`
- HTTP compression và security headers (helmet)
- Neon Postgres pool tối ưu: pool nhỏ, idle/connection timeout ngắn

## 🎯 Core Principles

### 1. **Runtime Reflection over Decorators**

- No decorators needed on entities
- Automatic field detection using TypeORM metadata
- Dynamic validation based on column types

### 2. **Clean & Simple**

- Single responsibility services
- Minimal configuration required
- Easy to understand and maintain

### 3. **Type-Safe**

- Full TypeScript support
- Compile-time type checking
- Runtime validation
- Env-driven configuration (không dùng magic number)

## 🏛️ Architecture Layers

```
┌─────────────────────────────────────┐
│           Controllers               │
├─────────────────────────────────────┤
│           Services                  │
│  ┌─────────────────────────────────┐│
│  │        BaseService              ││
│  │  - CRUD operations              ││
│  │  - Audit trail                  ││
│  │  - Soft delete                  ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│        Query Layer                  │
│  ┌─────────────────────────────────┐│
│  │   AdvancedQueryBuilder          ││
│  │  - Dynamic filtering            ││
│  │  - Search capabilities          ││
│  │  - Pagination                   ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│       Reflection Layer              │
│  ┌─────────────────────────────────┐│
│  │     ReflectionService           ││
│  │  - Runtime field detection      ││
│  │  - Type validation              ││
│  │  - Capability analysis          ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│         Data Layer                  │
│  ┌─────────────────────────────────┐│
│  │        TypeORM                  ││
│  │  - Entity management            ││
│  │  - Database operations          ││
│  │  - Metadata extraction          ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## 🔧 Core Components

### 1. **BaseEntity**

```typescript
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ name: 'version', default: 1 })
  version: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
```

### 2. **ReflectionService**

Automatically detects entity capabilities:

```typescript
// Auto-detects based on column types
const config = reflectionService.getQueryConfig(User, userRepository);
// Returns:
// {
//   searchable: ['email', 'displayName'], // string columns
//   filterable: ['email', 'role', 'isActive'], // all columns
//   sortable: ['email', 'createdAt', 'role'], // comparable types
//   relations: ['profile'], // TypeORM relations
//   defaultSort: { field: 'createdAt', direction: 'DESC' },
//   defaultLimit: 20,
//   maxLimit: 100
// }
```

### 3. **BaseService**

Provides common CRUD operations with advanced querying:

```typescript
export abstract class BaseService<T extends BaseEntity> {
  // Standard CRUD
  async create(dto: DeepPartial<T>, context?: QueryContext): Promise<T>;
  async findOne(id: string): Promise<T | null>;
  async update(
    id: string,
    dto: DeepPartial<T>,
    context?: QueryContext,
  ): Promise<T>;
  async remove(id: string, context?: QueryContext): Promise<void>;

  // Advanced querying
  async findWithPagination(
    options?: QueryBuilderOptions,
  ): Promise<PaginatedResult<T>>;
  async findAll(options?: QueryBuilderOptions): Promise<QueryResult<T>>;

  // Utility methods
  async count(options?: QueryBuilderOptions): Promise<number>;
  async exists(id: string): Promise<boolean>;
  async activate(id: string, context?: QueryContext): Promise<T>;
  async deactivate(id: string, context?: QueryContext): Promise<T>;
}
```

## 🚀 Usage Examples

### 1. **Basic Entity Setup**

```typescript
// Simple entity - no decorators needed!
@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;
}
```

### 2. **Service Implementation**

```typescript
@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly reflectionService: ReflectionService,
    private readonly queryBuilderService: AdvancedQueryBuilderService,
  ) {
    super(userRepository, reflectionService, queryBuilderService);
  }

  protected getEntityClass(): new () => User {
    return User;
  }

  protected getEntityName(): string {
    return 'User';
  }
}
```

### 3. **Advanced Querying**

```typescript
// Search users
const result = await usersService.findWithPagination({
  search: { query: 'john', fields: ['email', 'displayName'] },
  filters: [
    { field: 'role', operator: 'eq', value: 'admin' },
    { field: 'isActive', operator: 'eq', value: true },
  ],
  sort: [{ field: 'createdAt', direction: 'DESC' }],
  pagination: { page: 1, limit: 20 },
});
```

## 🔍 Field Detection Logic

### **Searchable Fields**

- String columns (`varchar`, `text`)
- Automatically detected from TypeORM metadata

### **Filterable Fields**

- All entity columns
- Supports 20+ operators: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`, `ilike`, `between`, etc.

### **Sortable Fields**

- String, number, date, boolean columns
- Automatically detected from column types

### **Relations**

- TypeORM relations automatically detected
- Supports eager loading and lazy loading

## 🛡️ Security & Validation

### **Runtime Validation**

```typescript
// Automatically validates field capabilities
if (!reflectionService.validateField(User, 'email', 'search')) {
  throw new Error('Email field is not searchable');
}
```

### **Audit Trail**

```typescript
// Automatic audit fields
const user = await usersService.create(userData, { user: currentUser });
// Sets: createdBy, updatedBy, version
```

### **Soft Delete**

```typescript
// Soft delete with audit
await usersService.remove(userId, { user: currentUser });
// Sets: deletedAt, updatedBy
```

## 📊 Performance Features

### **Query Optimization**

- Automatic query building
- Parameterized queries (SQL injection protection)
- Efficient pagination with total count

### **Caching Support**

```typescript
const result = await usersService.findWithPagination({
  cache: 300, // Cache for 5 minutes
  // ... other options
});
```

### **Bulk Operations**

```typescript
// Bulk create
const users = await usersService.bulkCreate(userDataArray, context);

// Bulk update
const updatedUsers = await usersService.bulkUpdate(
  [
    { id: '1', data: { role: 'admin' } },
    { id: '2', data: { isActive: false } },
  ],
  context,
);
```

## 🔧 Configuration

### **Environment Variables**

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

## 🧪 Testing

### **Unit Tests**

```typescript
describe('UsersService', () => {
  it('should create user with audit trail', async () => {
    const user = await usersService.create(userData, { user: mockUser });
    expect(user.createdBy).toBe(mockUser.id);
    expect(user.updatedBy).toBe(mockUser.id);
  });
});
```

### **Integration Tests**

```typescript
describe('Advanced Querying', () => {
  it('should filter users by role', async () => {
    const result = await usersService.findWithPagination({
      filters: [{ field: 'role', operator: 'eq', value: 'admin' }],
    });
    expect(result.data.every((user) => user.role === 'admin')).toBe(true);
  });
});
```

## 📈 Benefits

### **For Developers**

- ✅ No decorators needed on entities
- ✅ Automatic field detection
- ✅ Type-safe operations
- ✅ Consistent API patterns
- ✅ Built-in audit trail

### **For Contributors**

- ✅ Clean, readable code
- ✅ Well-documented architecture
- ✅ Easy to extend
- ✅ Comprehensive examples
- ✅ Clear separation of concerns

### **For Performance**

- ✅ Optimized queries
- ✅ Efficient pagination
- ✅ Caching support
- ✅ Bulk operations
- ✅ Soft delete with restore

## 🚀 Getting Started

1. **Create Entity**

```typescript
@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name: string;

  @Column('decimal')
  price: number;
}
```

2. **Create Service**

```typescript
@Injectable()
export class ProductsService extends BaseService<Product> {
  // Implementation...
}
```

3. **Use Advanced Querying**

```typescript
const products = await productsService.findWithPagination({
  search: { query: 'laptop' },
  filters: [{ field: 'price', operator: 'lt', value: 1000 }],
  sort: [{ field: 'price', direction: 'ASC' }],
});
```

That's it! The system automatically handles field validation, query building, and result formatting.
