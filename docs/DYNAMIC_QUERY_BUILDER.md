# 🚀 Dynamic Query Builder Documentation

## Overview

The Dynamic Query Builder provides a simple, frontend-friendly way to query data with powerful filtering, searching, and sorting capabilities. It's designed to be easy to use in Postman, frontend applications, and any HTTP client.

## 🎯 Key Features

- ✅ **Simple Query Parameters** - Easy to use in URLs
- ✅ **Powerful Filtering** - 10+ filter operators
- ✅ **Full-Text Search** - Search across multiple fields
- ✅ **Flexible Sorting** - Sort by any field
- ✅ **Pagination** - Built-in pagination support
- ✅ **Field Selection** - Choose which fields to return
- ✅ **Relation Loading** - Include related data
- ✅ **Validation** - Automatic field validation
- ✅ **Type Safety** - Full TypeScript support

## 📋 Query Parameters

### Basic Parameters

| Parameter | Type   | Description               | Example                   |
| --------- | ------ | ------------------------- | ------------------------- |
| `page`    | number | Page number (default: 1)  | `?page=2`                 |
| `limit`   | number | Items per page (max: 100) | `?limit=20`               |
| `search`  | string | Search query              | `?search=john`            |
| `sort`    | string | Sort field and direction  | `?sort=createdAt:DESC`    |
| `filter`  | string | Filter expression         | `?filter=role:eq:admin`   |
| `include` | string | Relations to include      | `?include=profile,orders` |
| `select`  | string | Fields to select          | `?select=id,email,name`   |

### Filter Operators

| Operator    | Description           | Example                      |
| ----------- | --------------------- | ---------------------------- |
| `eq`        | Equals                | `?filter=role:eq:admin`      |
| `ne`        | Not equals            | `?filter=role:ne:admin`      |
| `gt`        | Greater than          | `?filter=age:gt:18`          |
| `gte`       | Greater than or equal | `?filter=age:gte:18`         |
| `lt`        | Less than             | `?filter=age:lt:65`          |
| `lte`       | Less than or equal    | `?filter=age:lte:65`         |
| `like`      | Like pattern          | `?filter=email:like:%gmail%` |
| `in`        | In array              | `?filter=role:in:admin,user` |
| `between`   | Between values        | `?filter=age:between:18,65`  |
| `isNull`    | Is null               | `?filter=avatar:isNull`      |
| `isNotNull` | Is not null           | `?filter=avatar:isNotNull`   |

## 🚀 Usage Examples

### 1. Basic Queries

```http
# Get all users
GET /users

# Get users with pagination
GET /users?page=1&limit=10

# Search users
GET /users?search=john

# Sort users
GET /users?sort=createdAt:DESC
```

### 2. Filtering

```http
# Filter by role
GET /users?filter=role:eq:admin

# Filter active users
GET /users?filter=isActive:eq:true

# Filter by email pattern
GET /users?filter=email:like:%gmail%

# Filter by age range
GET /users?filter=age:between:18,65

# Filter null values
GET /users?filter=avatar:isNull
```

### 3. Complex Queries

```http
# Search + Filter + Sort + Pagination
GET /users?search=john&filter=role:eq:user&sort=createdAt:DESC&page=1&limit=5

# Multiple filters (use multiple filter parameters)
GET /users?filter=role:eq:admin&filter=isActive:eq:true

# Select specific fields
GET /users?select=id,email,displayName,role

# Include relations
GET /users?include=profile,orders
```

### 4. Advanced Examples

```http
# Get admin users created in the last month, sorted by name
GET /users?filter=role:eq:admin&filter=createdAt:gte:2024-01-01&sort=displayName:ASC

# Search for users with Gmail addresses, active only
GET /users?search=john&filter=email:like:%gmail%&filter=isActive:eq:true

# Get users with specific roles, paginated
GET /users?filter=role:in:admin,moderator&page=2&limit=20
```

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Users retrieved successfully",
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
  },
  "meta": {
    "availableFields": {
      "searchable": ["email", "displayName"],
      "filterable": ["id", "email", "displayName", "role", "isActive"],
      "sortable": ["id", "email", "displayName", "role", "createdAt"],
      "relations": ["profile", "orders"]
    },
    "queryOptions": {
      "page": 1,
      "limit": 20,
      "search": {
        "query": "john",
        "fields": ["email", "displayName"]
      }
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Invalid query parameters",
  "errors": [
    "Filter 0: Field 'invalidField' is not filterable",
    "Search field 'password' is not searchable"
  ]
}
```

## 🧪 Testing with Postman

### 1. Import Collection

1. Open Postman
2. Click "Import"
3. Select the `API_Collection.json` file
4. Import the `API_Environment.json` file

### 2. Set Up Environment

1. Select the "API Environment" in Postman
2. Update the `baseUrl` if needed
3. Run the "Login" request to get tokens

### 3. Test Dynamic Queries

Use the pre-configured requests or create your own:

```
# Basic query
GET {{baseUrl}}/users

# With filters
GET {{baseUrl}}/users?filter=role:eq:admin

# Complex query
GET {{baseUrl}}/users?search=john&filter=isActive:eq:true&sort=createdAt:DESC&page=1&limit=10
```

## 🎨 Frontend Integration

### JavaScript/TypeScript

```typescript
// Simple query
const users = await fetch('/api/users?page=1&limit=10').then((r) => r.json());

// With filters
const adminUsers = await fetch('/api/users?filter=role:eq:admin').then((r) =>
  r.json(),
);

// Complex query
const searchUsers = async (query: string, filters: any) => {
  const params = new URLSearchParams();
  if (query) params.append('search', query);
  if (filters.role) params.append('filter', `role:eq:${filters.role}`);
  if (filters.active !== undefined)
    params.append('filter', `isActive:eq:${filters.active}`);

  return fetch(`/api/users?${params}`).then((r) => r.json());
};
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

const useUsers = (filters: any) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append('filter', `${key}:eq:${value}`);
      });

      const response = await fetch(`/api/users?${params}`);
      const data = await response.json();
      setUsers(data.data);
      setLoading(false);
    };

    fetchUsers();
  }, [filters]);

  return { users, loading };
};
```

## 🔧 Available Fields

Get available fields for any entity:

```http
GET /users/meta/fields
```

Response:

```json
{
  "success": true,
  "data": {
    "searchable": ["email", "displayName"],
    "filterable": [
      "id",
      "email",
      "displayName",
      "role",
      "isActive",
      "createdAt"
    ],
    "sortable": [
      "id",
      "email",
      "displayName",
      "role",
      "createdAt",
      "updatedAt"
    ],
    "relations": ["profile", "orders"]
  },
  "examples": {
    "search": "GET /users?search=john",
    "sort": "GET /users?sort=createdAt:DESC",
    "filter": "GET /users?filter=role:eq:admin",
    "pagination": "GET /users?page=1&limit=10"
  }
}
```

## 🚀 Performance Tips

### 1. Use Indexed Fields

```http
# Fast - uses indexed field
GET /users?filter=id:eq:uuid

# Slower - full table scan
GET /users?filter=displayName:like:%john%
```

### 2. Limit Results

```http
# Good - limited results
GET /users?limit=20

# Bad - could return thousands
GET /users
```

### 3. Select Only Needed Fields

```http
# Good - only needed fields
GET /users?select=id,email,displayName

# Bad - returns all fields
GET /users
```

### 4. Use Specific Filters

```http
# Good - specific filter
GET /users?filter=role:eq:admin

# Bad - broad search
GET /users?search=admin
```

## 🛡️ Security

- All queries are validated against available fields
- SQL injection protection through parameterized queries
- Rate limiting on all endpoints
- Authentication required for all operations

## 📚 Related Documentation

- [API Documentation](API.md) - Complete API reference
- [Module Structure](MODULE_STRUCTURE.md) - Technical architecture
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

---

**Built with ❤️ for easy frontend integration and testing.**
