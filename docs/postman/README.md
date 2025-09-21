# 📮 Postman Collection - API Testing

## Overview

This Postman collection provides comprehensive testing capabilities for the API with dynamic querying features. It's designed to be easy to use and covers all major functionality.

## 🚀 Quick Start

### 1. Import Collection

1. Open Postman
2. Click **Import** button
3. Select `API_Collection.json` file
4. Select `API_Environment.json` file

### 2. Set Up Environment

1. Select **API Environment** in Postman
2. Update `baseUrl` if your server runs on different port
3. Run **Login** request to get authentication tokens

### 3. Start Testing

Use the pre-configured requests or create your own dynamic queries!

## 📋 Collection Structure

### 🔐 Authentication

- **Register** - Create new user account
- **Login** - Authenticate and get tokens (auto-saves tokens)
- **Refresh Token** - Refresh expired access token
- **Logout** - End user session

### 👥 Users - Dynamic Querying

- **Get All Users (Basic)** - Simple user list
- **Get Users with Pagination** - Paginated results
- **Search Users** - Full-text search
- **Filter Users by Role** - Filter by specific role
- **Filter Active Users** - Filter by active status
- **Filter by Email Like** - Pattern matching
- **Sort Users by Created Date** - Sort by date
- **Select Specific Fields** - Choose returned fields
- **Complex Query** - Multiple filters + search + sort
- **Get Available Fields** - See what fields are queryable

### 🛠️ Users - CRUD Operations

- **Get User by ID** - Get specific user
- **Create User** - Add new user
- **Update User** - Modify existing user
- **Activate User** - Enable user account
- **Deactivate User** - Disable user account
- **Delete User** - Remove user (soft delete)

## 🎯 Dynamic Query Examples

### Basic Queries

```
GET /users
GET /users?page=1&limit=10
GET /users?search=john
```

### Filtering

```
GET /users?filter=role:eq:admin
GET /users?filter=isActive:eq:true
GET /users?filter=email:like:%gmail%
```

### Complex Queries

```
GET /users?search=john&filter=role:eq:user&sort=createdAt:DESC&page=1&limit=5
GET /users?select=id,email,displayName&include=profile
```

## 🔧 Environment Variables

| Variable       | Description         | Example                     |
| -------------- | ------------------- | --------------------------- |
| `baseUrl`      | API base URL        | `http://localhost:4000`     |
| `accessToken`  | JWT access token    | Auto-populated after login  |
| `refreshToken` | JWT refresh token   | Auto-populated after login  |
| `userId`       | User ID for testing | Set manually for CRUD tests |

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "availableFields": {
      "searchable": ["email", "displayName"],
      "filterable": ["id", "email", "role", "isActive"],
      "sortable": ["id", "email", "createdAt"],
      "relations": ["profile", "orders"]
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Invalid query parameters",
  "errors": ["Field 'invalidField' is not filterable"]
}
```

## 🧪 Testing Workflow

### 1. Authentication Flow

1. Run **Register** to create test user
2. Run **Login** to get tokens (auto-saved)
3. All subsequent requests use auto-saved tokens

### 2. Dynamic Query Testing

1. Start with **Get All Users** to see basic data
2. Try **Search Users** with different search terms
3. Test **Filter Users by Role** with different roles
4. Experiment with **Complex Query** combining multiple filters

### 3. CRUD Testing

1. Use **Create User** to add test data
2. Use **Get User by ID** with the returned ID
3. Use **Update User** to modify the user
4. Use **Activate/Deactivate** to test status changes
5. Use **Delete User** to remove test data

## 🎨 Custom Queries

### Create Your Own Requests

1. **Duplicate** an existing request
2. **Modify** the URL with your query parameters
3. **Test** different combinations

### Query Parameter Examples

```
# Pagination
?page=2&limit=5

# Search
?search=john

# Single Filter
?filter=role:eq:admin

# Multiple Filters (use multiple filter params)
?filter=role:eq:admin&filter=isActive:eq:true

# Sorting
?sort=createdAt:DESC

# Field Selection
?select=id,email,displayName

# Include Relations
?include=profile,orders

# Complex Query
?search=john&filter=role:eq:user&sort=createdAt:DESC&page=1&limit=10
```

## 🔍 Filter Operators

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

## 🚀 Advanced Features

### 1. Auto-Token Management

- Login request automatically saves tokens
- All requests use saved tokens automatically
- Refresh token request updates tokens

### 2. Dynamic Variables

- Use `{{baseUrl}}` for consistent URL management
- Use `{{accessToken}}` for authentication
- Use `{{userId}}` for testing specific users

### 3. Response Validation

- Pre-configured tests for common scenarios
- Automatic token extraction and storage
- Error handling and validation

## 🛠️ Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Run **Login** request first
   - Check if tokens are saved in environment

2. **400 Bad Request**
   - Check query parameter format
   - Use **Get Available Fields** to see valid fields

3. **404 Not Found**
   - Verify `baseUrl` is correct
   - Check if server is running

4. **500 Internal Server Error**
   - Check server logs
   - Verify database connection

### Debug Tips

1. **Check Environment Variables**
   - Ensure `baseUrl` is set correctly
   - Verify tokens are populated after login

2. **Validate Query Parameters**
   - Use **Get Available Fields** to see valid options
   - Check parameter format and syntax

3. **Test Step by Step**
   - Start with simple queries
   - Gradually add complexity
   - Use browser dev tools to inspect requests

## 📚 Related Documentation

- [Dynamic Query Builder Guide](../DYNAMIC_QUERY_BUILDER.md)
- [API Documentation](../API.md)
- [Module Structure](../MODULE_STRUCTURE.md)

---

**Happy Testing! 🎉**

Built with ❤️ for easy API testing and development.
