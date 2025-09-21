# 🏗️ Module Structure Documentation

## Overview

The API has been refactored to follow **SOLID principles** with clear separation of concerns. Each module has a single responsibility and can be used independently.

## 📁 Directory Structure

```
src/
├── common/                          # Shared modules
│   ├── reflection/                  # Runtime reflection module
│   │   ├── reflection.service.ts    # Entity metadata analysis
│   │   ├── reflection.module.ts     # Module definition
│   │   └── index.ts                 # Exports
│   ├── query-builder/               # Advanced querying module
│   │   ├── advanced-query-builder.service.ts  # Query building logic
│   │   ├── query-builder.module.ts  # Module definition
│   │   └── index.ts                 # Exports
│   ├── base-service/                # Base CRUD operations
│   │   ├── base.service.ts          # Abstract base service
│   │   ├── base-service.module.ts   # Module definition
│   │   └── index.ts                 # Exports
│   ├── entities/                    # Base entities
│   │   └── base.entity.ts           # Common entity fields
│   ├── decorators/                  # Metadata decorators
│   │   └── metadata.decorators.ts   # Field validation utilities
│   ├── interfaces/                  # Type definitions
│   │   └── pagination.interface.ts  # Query & pagination types
│   ├── common.module.ts             # Main common module
│   └── index.ts                     # Main exports
├── modules/                         # Feature modules
│   ├── users/                       # User management
│   ├── auth/                        # Authentication
│   ├── database/                    # Database management
│   └── redis/                       # Redis management
└── utils/                           # Utility functions
```

## 🔧 Module Responsibilities

### 1. **ReflectionModule** 🔍

**Single Responsibility**: Runtime entity analysis and field validation

```typescript
// Automatically detects entity capabilities
const config = reflectionService.getQueryConfig(User, userRepository);
// Returns: searchable, filterable, sortable, relations
```

**Features**:

- ✅ Automatic field type detection
- ✅ Runtime validation
- ✅ Entity metadata analysis
- ✅ No decorators needed on entities

### 2. **QueryBuilderModule** 🛠️

**Single Responsibility**: Advanced query building and execution

```typescript
// Build complex queries with filters, search, pagination
const result = await queryBuilderService.executePaginatedQuery(
  repository,
  User,
  options,
);
```

**Features**:

- ✅ 20+ filter operators
- ✅ Dynamic search capabilities
- ✅ Efficient pagination
- ✅ Type-safe query building

### 3. **BaseServiceModule** 🏗️

**Single Responsibility**: Common CRUD operations with audit trail

```typescript
// Provides standard CRUD with advanced features
export abstract class BaseService<T extends BaseEntity> {
  async create(dto: DeepPartial<T>, context?: QueryContext): Promise<T>;
  async findWithPagination(
    options?: QueryBuilderOptions,
  ): Promise<PaginatedResult<T>>;
  // ... more methods
}
```

**Features**:

- ✅ Standard CRUD operations
- ✅ Automatic audit trail
- ✅ Soft delete support
- ✅ Bulk operations

## 🎯 SOLID Principles Applied

### **S** - Single Responsibility Principle

- **ReflectionModule**: Only handles entity analysis
- **QueryBuilderModule**: Only handles query building
- **BaseServiceModule**: Only handles CRUD operations

### **O** - Open/Closed Principle

- Modules are open for extension, closed for modification
- New query operators can be added without changing existing code
- New entity types work automatically with existing services

### **L** - Liskov Substitution Principle

- All services can be substituted with their base types
- BaseService can be extended without breaking functionality

### **I** - Interface Segregation Principle

- Each module exposes only the interfaces it needs
- No forced dependencies on unused functionality

### **D** - Dependency Inversion Principle

- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)

## 🚀 Usage Examples

### 1. **Creating a New Entity Service**

```typescript
@Injectable()
export class ProductsService extends BaseService<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    reflectionService: ReflectionService,
    queryBuilderService: AdvancedQueryBuilderService,
  ) {
    super(productRepository, reflectionService, queryBuilderService);
  }

  protected getEntityClass(): new () => Product {
    return Product;
  }

  protected getEntityName(): string {
    return 'Product';
  }

  // Custom methods
  async findByCategory(category: string) {
    return this.findWithPagination({
      filters: [{ field: 'category', operator: 'eq', value: category }],
    });
  }
}
```

### 2. **Using Advanced Querying**

```typescript
// Search products
const products = await productsService.findWithPagination({
  search: { query: 'laptop', fields: ['name', 'description'] },
  filters: [
    { field: 'price', operator: 'lt', value: 1000 },
    { field: 'isActive', operator: 'eq', value: true },
  ],
  sort: [{ field: 'price', direction: 'ASC' }],
  pagination: { page: 1, limit: 20 },
});
```

### 3. **Module Registration**

```typescript
@Module({
  imports: [
    CommonModule, // Imports all common modules
    // or import specific modules:
    // ReflectionModule,
    // QueryBuilderModule,
    // BaseServiceModule,
  ],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

## 🔄 Module Dependencies

```
ReflectionModule (no dependencies)
    ↓
QueryBuilderModule (depends on ReflectionModule)
    ↓
BaseServiceModule (depends on ReflectionModule + QueryBuilderModule)
    ↓
CommonModule (imports all modules)
```

## 📊 Benefits

### **For Developers**

- ✅ Clear separation of concerns
- ✅ Easy to understand and maintain
- ✅ Reusable components
- ✅ Type-safe operations

### **For Contributors**

- ✅ Well-organized code structure
- ✅ Easy to find and modify specific functionality
- ✅ Clear module boundaries
- ✅ Comprehensive documentation

### **For Performance**

- ✅ Lazy loading support
- ✅ Tree-shaking friendly
- ✅ Minimal bundle size
- ✅ Efficient dependency injection

## 🧪 Testing Strategy

### **Unit Tests**

```typescript
describe('ReflectionService', () => {
  it('should detect searchable fields', () => {
    const config = reflectionService.getQueryConfig(User, userRepository);
    expect(config.searchable).toContain('email');
  });
});
```

### **Integration Tests**

```typescript
describe('QueryBuilderService', () => {
  it('should build complex queries', async () => {
    const result = await queryBuilderService.executePaginatedQuery(
      repository,
      User,
      { filters: [{ field: 'role', operator: 'eq', value: 'admin' }] },
    );
    expect(result.data).toBeDefined();
  });
});
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
```

### **Module Configuration**

```typescript
// Global modules (available everywhere)
@Global()
@Module({
  imports: [ReflectionModule, QueryBuilderModule, BaseServiceModule],
  exports: [ReflectionModule, QueryBuilderModule, BaseServiceModule],
})
export class CommonModule {}
```

## 🚀 Getting Started

1. **Import CommonModule** in your feature module
2. **Extend BaseService** for your entity
3. **Use advanced querying** with built-in methods
4. **Add custom methods** as needed

```typescript
@Module({
  imports: [CommonModule, TypeOrmModule.forFeature([Product])],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

That's it! The system automatically handles field validation, query building, and result formatting.

## 📚 Related Documentation

- [Architecture Guide](ARCHITECTURE.md) - Overall system architecture
- [API Documentation](API.md) - Complete API reference
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

---

**Built with ❤️ following SOLID principles and modern TypeScript practices.**
