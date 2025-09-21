# NestJS Request Lifecycle với ResponseInterceptor

## Vòng đời Request trong NestJS

```
Client Request
    ↓
HTTP Server (Express/Fastify)
    ↓
Middleware (Global/Route-specific)
    ↓
Guard (Authentication/Authorization)
    ↓
Pipe (Validation/Transformation)
    ↓
Interceptor (PRE) - Before Controller
    ↓
Controller Handler (Business Logic)
    ↓
Interceptor (POST) - After Controller ← ResponseInterceptor ở đây
    ↓
Exception Filter (nếu có lỗi)
    ↓
Response trả về Client
```

## ResponseInterceptor Position

**ResponseInterceptor** hoạt động ở vị trí **POST Interceptor**, nghĩa là:

1. ✅ **Sau khi Controller Handler** đã xử lý business logic
2. ✅ **Trước Exception Filter** để format error responses
3. ✅ **Cuối cùng trước khi trả về Client**

## RxJS Operators được sử dụng

### 1. **timeout(30000)**

- Bảo vệ khỏi requests bị treo
- Timeout sau 30 giây

### 2. **tap()**

- Logging và side effects
- Không thay đổi data flow

### 3. **map()**

- Transform response data
- Format thành chuẩn ApiResponse/PaginatedResponse

### 4. **retry()**

- Retry logic với exponential backoff
- Tối đa 3 lần retry

### 5. **catchError()**

- Handle errors gracefully
- Format error responses

### 6. **finalize()**

- Cleanup operations
- Logging cuối cùng

### 7. **distinctUntilChanged()**

- Filter duplicate responses
- Tránh duplicate data

## Type Guards

- `isPaginatedResponse()` - Kiểm tra paginated data
- `isErrorResponse()` - Kiểm tra error data
- `isSuccessResponse()` - Kiểm tra success data
- `isStringResponse()` - Kiểm tra string data
- `isNullResponse()` - Kiểm tra null/undefined
- `isArrayResponse()` - Kiểm tra array data
- `isPlainObjectResponse()` - Kiểm tra plain object

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Success",
  "data": {...},
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 200,
  "meta": {
    "requestId": "req_1234567890_1",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "lifecycle": "post-interceptor"
  },
  "performance": {
    "processingTime": 150,
    "memoryUsage": {...},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 200,
  "meta": {...},
  "performance": {...}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error occurred",
  "errors": ["Detailed error message"],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "statusCode": 500
}
```

## Lợi ích của RxJS Integration

1. **Reactive Programming** - Xử lý async data streams
2. **Error Handling** - Robust error handling với retry logic
3. **Performance** - Timeout protection và performance metrics
4. **Type Safety** - Type guards và interfaces
5. **Observability** - Detailed logging và monitoring
6. **Flexibility** - Dễ dàng thêm/bớt operators
7. **Lifecycle Compliance** - Tuân thủ đúng NestJS lifecycle
