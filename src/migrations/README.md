# TypeORM Migrations

## Cách sử dụng Migration

### 1. Tạo migration mới

```bash
npm run migration:create src/migrations/TenMigration
```

### 2. Generate migration từ entity changes

```bash
npm run migration:generate src/migrations/TenMigration
```

### 3. Chạy migration

```bash
npm run migration:run
```

### 4. Revert migration cuối cùng

```bash
npm run migration:revert
```

### 5. Xem trạng thái migration

```bash
npm run migration:show
```

## Lưu ý

- Luôn test migration trên database copy trước khi chạy production
- Viết cả `up()` và `down()` methods
- Sử dụng `synchronize: false` trong production
