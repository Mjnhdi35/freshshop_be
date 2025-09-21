# 🚀 Advanced NestJS API

A modern, scalable NestJS API with **runtime reflection**, **metadata-driven querying**, and **advanced filtering capabilities**.

## ✨ Features

- 🔍 **Runtime Reflection** - No decorators needed on entities
- 🎯 **Metadata-Driven** - Automatic field detection and validation
- 🔧 **Advanced Querying** - 20+ filter operators, search, pagination
- 🛡️ **Type-Safe** - Full TypeScript support with compile-time checking
- 🔐 **JWT Authentication** - Access & refresh tokens with Redis storage
- 🌐 **Google OAuth** - Social authentication support
- 📊 **Audit Trail** - Automatic tracking of created/updated by
- 🗑️ **Soft Delete** - Safe deletion with restore capability
- ⚡ **Performance** - Query caching, bulk operations, optimized queries
- 📚 **Well Documented** - Comprehensive docs for contributors

## 🏗️ Architecture

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
│  │   QueryBuilderModule            ││
│  │  - Dynamic filtering            ││
│  │  - Search capabilities          ││
│  │  - Pagination                   ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│       Reflection Layer              │
│  ┌─────────────────────────────────┐│
│  │     ReflectionModule            ││
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

### 🎯 SOLID Principles

- **S**ingle Responsibility: Each module has one clear purpose
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Services can be substituted with base types
- **I**nterface Segregation: Only expose needed interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (Upstash or local)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd api

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Update .env with your configuration

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

## 📖 Usage Examples

### 1. **Simple Entity (No Decorators!)**

```typescript
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

### 2. **Service with Advanced Querying**

```typescript
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
}
```

### 3. **Advanced Querying**

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

// Filter by date range
const recentProducts = await productsService.findWithPagination({
  filters: [
    {
      field: 'createdAt',
      operator: 'between',
      values: [new Date('2024-01-01'), new Date('2024-12-31')],
    },
  ],
});

// Multiple value filter
const categories = await productsService.findWithPagination({
  filters: [
    {
      field: 'category',
      operator: 'in',
      values: ['electronics', 'books', 'clothing'],
    },
  ],
});
```

### 4. **API Endpoints**

```http
# Get products with advanced filtering
GET /products?search=laptop&filter[price][operator]=lt&filter[price]=1000&sort=price:ASC&page=1&limit=20

# Filter by multiple values
GET /products?filter[category][operator]=in&filter[category][values][0]=electronics&filter[category][values][1]=books

# Date range filter
GET /products?filter[createdAt][operator]=between&filter[createdAt][values][0]=2024-01-01&filter[createdAt][values][1]=2024-12-31

# Text search with operators
GET /products?filter[name][operator]=contains&filter[name]=laptop
GET /products?filter[name][operator]=startsWith&filter[name]=Mac
GET /products?filter[name][operator]=endsWith&filter[name]=Pro
```

## 🔍 Filter Operators

| Operator     | Description           | Example                                                                                                               |
| ------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `eq`         | Equals                | `filter[role]=admin`                                                                                                  |
| `ne`         | Not equals            | `filter[role][operator]=ne&filter[role]=admin`                                                                        |
| `gt`         | Greater than          | `filter[age][operator]=gt&filter[age]=18`                                                                             |
| `gte`        | Greater than or equal | `filter[age][operator]=gte&filter[age]=18`                                                                            |
| `lt`         | Less than             | `filter[age][operator]=lt&filter[age]=65`                                                                             |
| `lte`        | Less than or equal    | `filter[age][operator]=lte&filter[age]=65`                                                                            |
| `in`         | In array              | `filter[role][operator]=in&filter[role][values][0]=admin&filter[role][values][1]=user`                                |
| `nin`        | Not in array          | `filter[role][operator]=nin&filter[role][values][0]=admin`                                                            |
| `like`       | SQL LIKE              | `filter[name][operator]=like&filter[name]=%john%`                                                                     |
| `ilike`      | Case insensitive LIKE | `filter[name][operator]=ilike&filter[name]=%john%`                                                                    |
| `between`    | Between two values    | `filter[createdAt][operator]=between&filter[createdAt][values][0]=2024-01-01&filter[createdAt][values][1]=2024-12-31` |
| `isNull`     | Is null               | `filter[avatar][operator]=isNull`                                                                                     |
| `isNotNull`  | Is not null           | `filter[avatar][operator]=isNotNull`                                                                                  |
| `contains`   | Contains substring    | `filter[email][operator]=contains&filter[email]=gmail`                                                                |
| `startsWith` | Starts with           | `filter[name][operator]=startsWith&filter[name]=John`                                                                 |
| `endsWith`   | Ends with             | `filter[email][operator]=endsWith&filter[email]=.com`                                                                 |

## 🔐 Authentication

### JWT Authentication

```http
# Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Refresh token
POST /auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Google OAuth

```http
# Initiate Google OAuth
GET /auth/google

# Callback (handled automatically)
GET /auth/google/callback
```

## 📊 Response Format

### Paginated Response

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product Name",
      "price": 99.99,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false,
    "offset": 0
  }
}
```

## 🧪 Testing

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

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Detailed architecture overview
- **[Module Structure](docs/MODULE_STRUCTURE.md)** - SOLID module organization
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Contributing Guide](docs/CONTRIBUTING.md)** - How to contribute

## 🛠️ Development

```bash
# Development server
npm run start:dev

# Build
npm run build

# Production
npm run start:prod

# Linting
npm run lint

# Format code
npm run format
```

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t api .

# Run container
docker run -p 4000:4000 api
```

### Environment Setup

1. Set up PostgreSQL database
2. Set up Redis instance
3. Configure environment variables
4. Run migrations
5. Deploy application

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [TypeORM](https://typeorm.io/) - TypeScript ORM
- [Upstash](https://upstash.com/) - Serverless Redis
- [Neon](https://neon.tech/) - Serverless PostgreSQL

## 📞 Support

- **Documentation** - Check the docs folder
- **Issues** - Open an issue on GitHub
- **Discussions** - Use GitHub discussions for questions

---

**Built with ❤️ using NestJS, TypeORM, and modern TypeScript practices.**
