# 📚 API Documentation

## 🚀 Quick Start

### Base URL

```
http://localhost:4000
```

### Authentication

All protected endpoints require JWT token in Authorization header:

```
Authorization: Bearer <access_token>
```

## 🔐 Authentication Endpoints

### Register

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "user",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer <access_token>
```

### Google OAuth

```http
GET /auth/google
```

**Callback URL:**

```
GET /auth/google/callback
```

## 👥 Users Endpoints

### Get All Users (with Advanced Querying)

```http
GET /users?page=1&limit=20&search=john&sort=createdAt:DESC&filter[role]=admin
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `search` - Search query (searches in email, displayName)
- `sort` - Sort field and direction (format: `field:direction`)
- `filter[field]` - Filter by field value
- `filter[field][operator]` - Filter operator (eq, ne, gt, gte, lt, lte, in, nin, like, ilike, between, isNull, isNotNull, contains, startsWith, endsWith)

**Example Queries:**

```http
# Search users
GET /users?search=john

# Filter by role
GET /users?filter[role]=admin

# Multiple filters
GET /users?filter[role]=admin&filter[isActive]=true

# Date range filter
GET /users?filter[createdAt][operator]=between&filter[createdAt][values][0]=2024-01-01&filter[createdAt][values][1]=2024-12-31

# Sort by creation date
GET /users?sort=createdAt:DESC

# Pagination
GET /users?page=2&limit=10
```

**Response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "role": "admin",
      "isActive": true,
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

### Get User by ID

```http
GET /users/{id}
Authorization: Bearer <access_token>
```

### Create User

```http
POST /users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "displayName": "New User",
  "role": "user"
}
```

### Update User

```http
PUT /users/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "displayName": "Updated Name",
  "role": "admin"
}
```

### Delete User (Soft Delete)

```http
DELETE /users/{id}
Authorization: Bearer <access_token>
```

### Activate User

```http
POST /users/{id}/activate
Authorization: Bearer <access_token>
```

### Deactivate User

```http
POST /users/{id}/deactivate
Authorization: Bearer <access_token>
```

## 🔍 Advanced Query Examples

### 1. **Complex Search & Filter**

```http
GET /users?search=john&filter[role]=admin&filter[isActive]=true&sort=createdAt:DESC&page=1&limit=10
```

### 2. **Date Range Filter**

```http
GET /users?filter[createdAt][operator]=between&filter[createdAt][values][0]=2024-01-01&filter[createdAt][values][1]=2024-12-31
```

### 3. **Multiple Values Filter**

```http
GET /users?filter[role][operator]=in&filter[role][values][0]=admin&filter[role][values][1]=user
```

### 4. **Text Search with Operators**

```http
# Contains
GET /users?filter[email][operator]=contains&filter[email]=gmail

# Starts with
GET /users?filter[displayName][operator]=startsWith&filter[displayName]=John

# Ends with
GET /users?filter[email][operator]=endsWith&filter[email]=.com
```

### 5. **Null/Not Null Filters**

```http
# Users with avatar
GET /users?filter[avatar][operator]=isNotNull

# Users without avatar
GET /users?filter[avatar][operator]=isNull
```

## 📊 Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 200
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error 1", "Detailed error 2"],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 400
}
```

### Paginated Response

```json
{
  "data": [...],
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

## 🚨 Error Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Validation Error      |
| 500  | Internal Server Error |

## 🔧 Filter Operators

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

## 🔐 Security

### JWT Token Structure

```json
{
  "sub": "user_id",
  "role": "admin",
  "iat": 1640995200,
  "exp": 1640996100
}
```

### Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

### CORS

- Allowed origins: `http://localhost:3000`
- Allowed methods: `GET, POST, PUT, DELETE, OPTIONS`
- Allowed headers: `Content-Type, Authorization`

## 📝 Examples

### Complete User Management Flow

1. **Register User**

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123",
    "displayName": "John Doe"
  }'
```

2. **Login**

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

3. **Get Users with Filters**

```bash
curl -X GET "http://localhost:4000/users?search=john&filter[role]=user&sort=createdAt:DESC&page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"
```

4. **Update User**

```bash
curl -X PUT http://localhost:4000/users/{id} \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John Smith",
    "role": "admin"
  }'
```

5. **Logout**

```bash
curl -X POST http://localhost:4000/auth/logout \
  -H "Authorization: Bearer <access_token>"
```

## 🧪 Testing

### Postman Collection

Import the Postman collection from `/docs/postman/` directory.

### cURL Examples

All examples are provided in `/docs/examples/` directory.

### Test Data

Use the provided test data in `/docs/test-data/` for development and testing.
