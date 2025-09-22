## Gói Common

Gói này tập trung hạ tầng dùng chung: entity/service cơ sở, phản chiếu & metadata, query builder, validation và interceptor.

### Tổng quan (SOLID + Runtime Metadata)

- **Reflection/Metadata (DIP/SRP)**: nguồn dữ liệu duy nhất qua `AdvancedMetadataService`. `ReflectionService` chỉ đóng vai trò mặt nạ mỏng (thin wrapper) dùng metadata ở runtime.
- **Query Builders (SRP/OCP)**: `DynamicQueryBuilderService` ánh xạ option đơn giản từ frontend sang `AdvancedQueryBuilderService` để build/execute query (không lặp logic).
- **Base Service (SRP)**: CRUD chuẩn, audit, soft-delete; uỷ thác truy vấn nâng cao cho query builder.
- **Validation (SRP/OCP)**: `AdvancedRuntimeValidationService` dựa trên metadata runtime và rule mở rộng.
- **Interceptors**: `ResponseInterceptor` định dạng phản hồi và log cơ bản.
- **Interceptors/Middleware**: `ResponseInterceptor` định dạng phản hồi; `RequestMetricsMiddleware` ghi log thời gian và kích thước response.
- **Rate Limiting**: Tích hợp `@nestjs/throttler` ở `AppModule` (TTL/limit qua env).

### Module/Export

- `CommonModule`: gom và export các service/module cần thiết.
- `ReflectionModule`: cung cấp `ReflectionService` và export cả `AdvancedMetadataService` để inject toàn app.
- `QueryBuilderModule`: cung cấp `AdvancedQueryBuilderService`, `DynamicQueryBuilderService`.
- `BaseServiceModule`: hạ tầng cho các service domain kế thừa.

### Dịch vụ chính

#### AdvancedMetadataService

- Trích xuất metadata TypeORM và sinh khả năng truy vấn: searchable, filterable, sortable, relations (có cache).

#### ReflectionService

- Gọi `AdvancedMetadataService` để lấy capabilities/metadata runtime.
- API:
  - `getQueryConfig(entity, repository)` → QueryConfig
  - `validateField(entity, field, operation)` → boolean
  - `getAvailableFields(entity)` → string[]
  - `getEntityInfo(entity, repository)` → chẩn đoán

#### AdvancedQueryBuilderService

- Xây truy vấn nâng cao từ options (select, relations, filters, search, sort, groupBy, having, cache, lock) và execute.
- Methods: `buildAdvancedQuery`, `executeQuery`, `executePaginatedQuery`.

#### DynamicQueryBuilderService

- Options đơn giản → ánh xạ sang advanced options; tái sử dụng `AdvancedQueryBuilderService` (không duplicate).
- Methods: `buildDynamicQuery`, `executeDynamicQuery`, `executeDynamicQueryAll`.

#### BaseService<T>

- CRUD tổng quát (create, findAll, findWithPagination, findOne/OrFail, update, remove, activate/deactivate, bulk...).
- Uỷ thác truy vấn cho `AdvancedQueryBuilderService`.

#### AdvancedRuntimeValidationService

- Kiểm tra runtime theo rule + metadata (entity, field, operation, query).

### Ví dụ sử dụng

#### Inject và dùng query builders

```ts
constructor(
  @InjectRepository(User) private readonly repo: Repository<User>,
  private readonly advQB: AdvancedQueryBuilderService,
) {}

async listUsers() {
  return this.advQB.executePaginatedQuery(this.repo, User, {
    pagination: { page: 1, limit: 20 },
    search: { query: 'john', fields: ['email', 'name'] },
    sort: [{ field: 'createdAt', direction: 'DESC' }],
  });
}
```

#### Bật middleware đo thời gian/kích thước (AppModule)

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestMetricsMiddleware } from './common/interceptors';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestMetricsMiddleware).forRoutes('*');
  }
}
```

#### Kế thừa BaseService

```ts
@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User) repo: Repository<User>,
    reflection: ReflectionService,
    advQB: AdvancedQueryBuilderService,
  ) {
    super(repo, reflection, advQB);
  }
  protected getEntityClass() {
    return User;
  }
  protected getEntityName() {
    return 'User';
  }
}
```

### Ghi chú

- Ưu tiên DI của NestJS. Đã loại bỏ export DI tự viết khỏi `CommonModule` để codebase gọn và dễ test.
- `ResponseInterceptor` hiện chỉ định dạng phản hồi; logging/metrics nên đặt ở middleware/service quan trắc.
- Redis tối ưu: TTL bắt buộc, nén Brotli >1KB, size limit 32KB, SCAN thay KEYS, LRU in-memory tầng 1.

### Ghi chú chuyển đổi (từ bản cũ)

- Đã thống nhất reflection/metadata. Không dùng trực tiếp `FieldValidator` nữa.
- Dynamic query đã tái sử dụng advanced builder; bỏ các logic trùng lặp ở module nghiệp vụ.
