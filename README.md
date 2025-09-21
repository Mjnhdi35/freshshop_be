# 🚀 Advanced NestJS API

A modern, scalable NestJS API with **runtime reflection**, **metadata-driven querying**, and **advanced filtering capabilities**.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#️-architecture)
- [Dynamic Query Builder](#-dynamic-query-builder)
  - [Frontend-Friendly API](#frontend-friendly-api)
  - [Key Features](#key-features)
  - [Postman Testing](#postman-testing)
  - [Dynamic Query Builder Implementation](#dynamic-query-builder-implementation)
  - [Query Examples](#query-examples)
  - [Benefits & Use Cases](#benefits--use-cases)
  - [How It Works](#how-it-works)
  - [Architecture Components](#architecture-components)
  - [Benefits](#benefits)
  - [Testing & Validation](#testing--validation)
  - [Supported Endpoints](#supported-endpoints)
  - [Response Format](#response-format)
  - [Future Roadmap](#future-roadmap)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

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

## 🚀 Dynamic Query Builder

The Dynamic Query Builder is a powerful feature that allows frontend applications to query data using simple URL parameters. It provides a flexible, type-safe way to filter, search, sort, and paginate data without writing custom backend code.

### Key Benefits

- 🎯 **Frontend-Friendly** - Simple URL parameters for complex queries
- 🔒 **Type-Safe** - Runtime validation using TypeORM metadata
- ⚡ **Performance** - Optimized queries with proper indexing
- 🛡️ **Secure** - Field validation prevents SQL injection
- 🔧 **Flexible** - Support for complex query patterns
- 📊 **Consistent** - Standardized API across all endpoints

### How It Works

1. **Query Parsing** - Converts URL parameters to structured query options
2. **Field Validation** - Uses runtime reflection to validate fields against entity metadata
3. **Query Building** - Constructs TypeORM queries dynamically
4. **Execution** - Executes queries with proper error handling and logging

### Example Usage

```http
# Simple pagination
GET /users?page=1&limit=10

# Search with filters
GET /users?search=john&filter=role:eq:admin&sort=createdAt:DESC

# Complex filtering
GET /users?filter=isActive:eq:true&filter=role:in:admin,user&sort=email:ASC
```

### Frontend-Friendly API

The API includes a powerful Dynamic Query Builder that makes it easy to query data from frontend applications:

```http
# Simple queries
GET /users?page=1&limit=10
GET /users?search=john
GET /users?filter=role:eq:admin

# Complex queries
GET /users?search=john&filter=isActive:eq:true&sort=createdAt:DESC&page=1&limit=5
```

### Key Features

- ✅ **Simple Query Parameters** - Easy to use in URLs
- ✅ **Powerful Filtering** - 10+ filter operators
- ✅ **Full-Text Search** - Search across multiple fields
- ✅ **Flexible Sorting** - Sort by any field
- ✅ **Pagination** - Built-in pagination support
- ✅ **Field Selection** - Choose which fields to return
- ✅ **Validation** - Automatic field validation

### Postman Testing

The project includes a comprehensive Postman collection for testing all API endpoints:

#### Collection Features

- ✅ **Complete API Coverage** - All endpoints and methods
- ✅ **Dynamic Query Examples** - Pre-configured query examples
- ✅ **Authentication** - JWT token handling
- ✅ **Environment Variables** - Easy configuration
- ✅ **Test Scripts** - Automated response validation

#### Import Instructions

1. Open Postman
2. Import `docs/postman/API_Collection.json`
3. Import `docs/postman/API_Environment.json`
4. Set environment variables in Postman
5. Start testing!

#### Environment Variables

```json
{
  "baseUrl": "http://localhost:4000",
  "accessToken": "{{jwt_token}}",
  "refreshToken": "{{refresh_token}}"
}
```

#### Sample Requests

The collection includes pre-configured requests for:

- User registration and login
- Dynamic query examples
- CRUD operations
- Authentication flows
- Error handling scenarios

### Dynamic Query Builder Implementation

The Dynamic Query Builder is implemented using a modular architecture:

#### Core Services

1. **`DynamicQueryBuilderService`**
   - Parses URL query parameters
   - Converts to structured query options
   - Handles parameter validation

2. **`AdvancedQueryBuilderService`**
   - Builds TypeORM queries from options
   - Applies filters, sorting, pagination
   - Handles complex query patterns

3. **`ReflectionService`**
   - Provides runtime field validation
   - Uses TypeORM metadata for validation
   - Ensures query safety

4. **`BaseService`**
   - Integrates query builder with CRUD operations
   - Provides consistent API interface
   - Handles error cases

#### Query Flow

```
URL Parameters → DynamicQueryBuilder → AdvancedQueryBuilder → TypeORM → Database
     ↓                    ↓                      ↓              ↓
Validation → Field Validation → Query Building → Execution → Results
```

#### Example Implementation

```typescript
// In your service
async findAll(query: any) {
  const options = this.dynamicQueryBuilder.parseQuery(query);
  return await this.findWithPagination(options);
}

// Usage in controller
@Get()
async findAll(@Query() query: any) {
  return await this.usersService.findAll(query);
}
```

### Query Examples

#### Basic Queries

```http
# Get all users with pagination
GET /users?page=1&limit=10

# Search users by name or email
GET /users?search=john

# Filter by role
GET /users?filter=role:eq:admin
```

#### Advanced Queries

```http
# Complex filtering with multiple conditions
GET /users?filter=role:eq:admin&filter=isActive:eq:true

# Search with filters and sorting
GET /users?search=john&filter=role:eq:user&sort=createdAt:DESC

# Date range filtering
GET /users?filter=createdAt:between:2024-01-01,2024-12-31

# Multiple sort fields
GET /users?sort=role:ASC&sort=createdAt:DESC

# Field selection
GET /users?select=id,email,displayName&filter=isActive:eq:true
```

#### Filter Operators

- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In array
- `nin` - Not in array
- `like` - Like pattern
- `ilike` - Case insensitive like
- `between` - Between two values
- `isNull` - Is null
- `isNotNull` - Is not null
- `contains` - Contains substring
- `startsWith` - Starts with
- `endsWith` - Ends with

### Benefits & Use Cases

#### Frontend Development

- **Data Tables** - Easy sorting, filtering, and pagination
- **Search Functionality** - Full-text search across multiple fields
- **Admin Panels** - Complex filtering and data management
- **Mobile Apps** - Efficient data loading with pagination

#### Backend Development

- **API Consistency** - Standardized query interface across all endpoints
- **Performance** - Optimized queries with proper indexing
- **Security** - Field validation prevents SQL injection
- **Maintainability** - Clean separation of concerns

#### Business Logic

- **Reporting** - Flexible data aggregation and filtering
- **Analytics** - Complex query patterns for data analysis
- **User Management** - Advanced user filtering and search
- **Content Management** - Dynamic content querying

### How It Works

The Dynamic Query Builder uses a sophisticated architecture:

1. **Query Parsing** - Converts URL parameters to structured query options
2. **Field Validation** - Uses runtime reflection to validate fields against entity metadata
3. **Query Building** - Constructs TypeORM queries dynamically
4. **Execution** - Executes queries with proper error handling and logging

#### Architecture Components

- **`DynamicQueryBuilderService`** - Parses URL parameters and builds query options
- **`AdvancedQueryBuilderService`** - Constructs TypeORM queries from structured options
- **`ReflectionService`** - Provides runtime field validation using TypeORM metadata
- **`BaseService`** - Provides common CRUD operations with query builder integration

#### Benefits

- 🚀 **Performance** - Optimized queries with proper indexing
- 🔒 **Security** - Field validation prevents SQL injection
- 🎯 **Flexibility** - Support for complex query patterns
- 📊 **Monitoring** - Built-in query logging and performance tracking
- 🔧 **Maintainability** - Clean separation of concerns

### Testing & Validation

#### Field Validation

The system automatically validates all query parameters:

```typescript
// Valid fields are determined at runtime
const validFields = [
  'id',
  'email',
  'displayName',
  'role',
  'isActive',
  'createdAt',
];
const validOperators = [
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'like',
  'ilike',
];
```

#### Error Handling

Invalid queries return helpful error messages:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Field 'invalidField' is not filterable",
    "Operator 'invalidOp' is not supported",
    "Value for 'page' must be a positive integer"
  ],
  "statusCode": 422
}
```

#### Performance Monitoring

All queries are logged with performance metrics:

```
[Query] GET /users?filter=role:eq:admin - 45ms - 15 results
[Query] GET /users?search=john - 23ms - 3 results
[Query] GET /users?sort=createdAt:DESC&page=2&limit=10 - 67ms - 10 results
```

### Supported Endpoints

The Dynamic Query Builder is available on all endpoints that extend `BaseService`:

#### Users API

```http
GET /users                    # Get all users with query options
GET /users/:id               # Get user by ID
POST /users                  # Create new user
PUT /users/:id               # Update user
DELETE /users/:id            # Delete user
```

#### Query Parameters

All GET endpoints support these query parameters:

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `search` - Search query
- `filter` - Filter conditions (can be repeated)
- `sort` - Sort fields (can be repeated)
- `select` - Fields to select
- `exclude` - Fields to exclude
- `relations` - Relations to load

#### Example Usage

```http
# Get active admin users, sorted by creation date
GET /users?filter=role:eq:admin&filter=isActive:eq:true&sort=createdAt:DESC

# Search for users with "john" in name or email
GET /users?search=john

# Get users with pagination and field selection
GET /users?page=2&limit=5&select=id,email,displayName
```

### Response Format

All API responses follow a consistent format:

#### Success Response

```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 200
}
```

#### Paginated Response

```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 200
}
```

#### Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["Field 'email' is required"],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 422
}
```

### Future Roadmap

#### Planned Features

- 🔄 **Real-time Queries** - WebSocket support for live data updates
- 📊 **Query Analytics** - Advanced query performance analytics
- 🔍 **Full-Text Search** - Elasticsearch integration for advanced search
- 📱 **GraphQL Support** - GraphQL endpoint with query builder integration
- 🎯 **Query Caching** - Intelligent query result caching
- 📈 **Query Optimization** - Automatic query optimization suggestions

#### Advanced Features

- 🌐 **Multi-tenant Support** - Tenant-aware query filtering
- 🔐 **Row-level Security** - Fine-grained access control
- 📋 **Query Templates** - Pre-defined query templates
- 🎨 **Custom Operators** - User-defined filter operators
- 📊 **Aggregation Queries** - Advanced data aggregation support
- 🔄 **Query Versioning** - Query history and versioning

#### Integration Options

- 🚀 **Frontend SDKs** - JavaScript/TypeScript SDKs for easy integration
- 📱 **Mobile SDKs** - React Native and Flutter SDKs
- 🔌 **Plugin System** - Extensible plugin architecture
- 📊 **Dashboard Integration** - Built-in admin dashboard
- 🔄 **API Gateway** - Integration with API gateways
- 📈 **Monitoring** - Advanced monitoring and alerting

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
- **[Dynamic Query Builder](docs/DYNAMIC_QUERY_BUILDER.md)** - Frontend-friendly querying
- **[API Documentation](docs/API.md)** - Complete API reference
- **[Postman Collection](docs/postman/README.md)** - Easy API testing
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

## 🚀 Dynamic Query Builder

### Quick Start

The Dynamic Query Builder is now fully integrated into your API! Here's how to use it:

#### 1. Basic Usage

```http
# Get all users with pagination
GET /users?page=1&limit=10

# Search users
GET /users?search=john

# Filter users
GET /users?filter=role:eq:admin
```

#### 2. Advanced Queries

```http
# Complex filtering
GET /users?filter=role:eq:admin&filter=isActive:eq:true&sort=createdAt:DESC

# Search with filters
GET /users?search=john&filter=role:eq:user&page=1&limit=5

# Field selection
GET /users?select=id,email,displayName&filter=isActive:eq:true
```

#### 3. Available Operators

- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `in` - In array
- `nin` - Not in array
- `like` - Like pattern
- `ilike` - Case insensitive like
- `between` - Between two values
- `isNull` - Is null
- `isNotNull` - Is not null
- `contains` - Contains substring
- `startsWith` - Starts with
- `endsWith` - Ends with

#### 4. Response Format

```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 200
}
```

### Testing

Use the included Postman collection to test all features:

- Import `docs/postman/API_Collection.json`
- Import `docs/postman/API_Environment.json`
- Set your environment variables
- Start testing!

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
