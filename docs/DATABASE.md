# Schema MySQL

## Hiện trạng từ migration Flyway và mapping JPA

Schema được quản lý bằng **Flyway SQL migration** trong `src/main/resources/db/migration/`; Hibernate dùng `ddl-auto: validate` ở cả cấu hình mặc định và profile test để đối chiếu mapping JPA, không tự tạo hoặc sửa bảng. [Cấu hình chính](../src/main/resources/application.yml) · [Cấu hình test](../src/test/resources/application-test.yml)

### Danh sách migration hiện có (V1–V4)

| Phiên bản | Tệp migration | Nội dung |
|---|---|---|
| `V1` | [`V1__init_schema.sql`](../src/main/resources/db/migration/V1__init_schema.sql) | Tạo 6 bảng nền tảng: `companies`, `permissions`, `roles`, `users`, `role_permission`, `user_role` cùng khóa ngoại và unique constraint ban đầu. |
| `V2` | [`V2__add_createAt_updateAt_to_users.sql`](../src/main/resources/db/migration/V2__add_createAt_updateAt_to_users.sql) | Tệp rỗng (giữ nguyên tên và nội dung để bảo toàn lịch sử/checksum Flyway). |
| `V3` | [`V3__add_users_audit_columns.sql`](../src/main/resources/db/migration/V3__add_users_audit_columns.sql) | Bổ sung hai cột audit nullable `created_at` và `update_at` (`DATETIME(6) NULL`) vào bảng `users`. |
| `V4` | [`V4__create_refresh_tokens.sql`](../src/main/resources/db/migration/V4__create_refresh_tokens.sql) | Tạo bảng `refresh_tokens` lưu bản băm refresh token, liên kết FK tới `users(id)`, thời hạn, trạng thái thu hồi, thiết bị và IP. |

### Chi tiết 7 bảng hiện tại

| Bảng | Cột và ràng buộc trong V1–V4 | Ghi chú mapping JPA |
|---|---|---|
| `companies` | `id` PK, `name`, `description`, `address`, `logo` (`varchar(255) NOT NULL`), `created_at`, `updated_at` (`datetime(6) NOT NULL`); UNIQUE `(name)`. | [Company](../src/main/java/com/example/hrmanagement/feature/company/Company.java) — `Instant createdAt/updatedAt`. |
| `permissions` | `id` PK, `name`, `api_path` (`utf8mb4_0900_bin`), `method`, `module` (`varchar(255) NOT NULL`), `created_at`, `update_at` (`datetime(6) NOT NULL`); UNIQUE `(api_path, method)`. | [Permission](../src/main/java/com/example/hrmanagement/feature/permission/Permission.java) — `apiPath` phân biệt hoa/thường nhờ collation nhị phân; field audit là `updateAt`. |
| `roles` | `id` PK, `name`, `description` (`varchar(255) NOT NULL`), `created_at`, `update_at` (`datetime(6) NOT NULL`); UNIQUE `(name)`. | [Role](../src/main/java/com/example/hrmanagement/feature/role/Role.java) — sở hữu `role_permission` (`ManyToMany` LAZY, `@BatchSize(50)`). |
| `users` | `id` PK, `name`, `email`, `password`, `address` (`varchar(255) NOT NULL`), `age`, `avatar`, `gender` (`enum('FEMALE','MALE','OTHER')`), `company_id` FK → `companies(id)` nullable; `created_at`, `update_at` (`DATETIME(6) NULL` từ V3). | [User](../src/main/java/com/example/hrmanagement/feature/user/User.java) — `ManyToOne` LAZY tới Company, sở hữu `user_role` (`ManyToMany`). **Chưa có unique constraint cho `email`.** |
| `role_permission` | `role_id` FK → `roles(id)`, `permission_id` FK → `permissions(id)`; PK ghép `(role_id, permission_id)`. | Không có `ON DELETE CASCADE`; xóa Permission còn gán Role bị FK chặn (`409`). |
| `user_role` | `user_id` FK → `users(id)`, `role_id` FK → `roles(id)`. | **V1 chưa khai báo PK ghép hoặc unique cho `(user_id, role_id)`.** Không có `ON DELETE CASCADE`. |
| `refresh_tokens` | `id` PK, `token` (`VARCHAR(512) NOT NULL`, UNIQUE `uk_refresh_tokens_token`), `user_id` (`BIGINT NOT NULL`, FK `fk_refresh_tokens_user` → `users(id)`), `expires_at` (`DATETIME(6) NOT NULL`), `revoked` (`BIT(1) NOT NULL DEFAULT b'0'`), `device_info`, `ip_address` (`VARCHAR(255) NOT NULL`), `created_at` (`DATETIME(6) NULL`). | [RefreshToken](../src/main/java/com/example/hrmanagement/feature/auth/RefreshToken.java) — `ManyToOne` LAZY tới User; lưu hash SHA-256, dọn token hết hạn qua `ScheduledTasks`. |

Đây là đối chiếu tĩnh từ SQL migration và JPA entity trong repo; xem bằng chứng kiểm thử/khởi động mới nhất tại [PROJECT-STATUS.md](PROJECT-STATUS.md). File upload lưu trên hệ thống tệp (`./uploads`), không có bảng File trong DB.

## Cấu hình Flyway hiện tại

POM khai báo `spring-boot-starter-flyway` và `flyway-mysql`. Cấu hình chính dùng:

```yaml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false
  jpa:
    hibernate:
      ddl-auto: validate
```

Profile test kế thừa cấu hình Flyway và dùng MySQL 8.4 Testcontainers qua `MySqlTestConfiguration` để chạy cùng bộ migration V1–V4 trên database test cô lập, rồi để Hibernate `validate`.

## Khoảng cách còn lại so với mô hình đích

| Hạng mục | Hiện trạng V1–V4 | Cần chốt / bổ sung ở migration tiếp theo |
|---|---|---|
| `users.email` | Chưa có unique constraint ở DB (chỉ kiểm tra ở service bằng `existsByEmail`). | **Đang tạm hoãn theo yêu cầu người dùng** (xem [PROJECT-STATUS.md](PROJECT-STATUS.md)). Khi tiếp tục: kiểm tra/xử lý email trùng hiện có rồi thêm unique constraint qua migration mới. |
| `user_role` | Có 2 FK nhưng chưa có khóa chính ghép `(user_id, role_id)`. | Loại bản ghi trùng nếu có rồi bổ sung PK/unique ghép `(user_id, role_id)`. |
| Tên cột và nullability audit | `companies` dùng `updated_at`; `permissions`, `roles`, `users` dùng `update_at`. Audit trên `users` đang `NULL`. | Giữ nguyên cho tới khi có kế hoạch backfill + đổi tên đồng bộ với entity. |
| Collation và phạm vi unique | Bảng mặc định `utf8mb4_0900_ai_ci` (không phân biệt hoa/thường/dấu) cho `companies.name` và `roles.name`; `permissions.api_path` dùng `utf8mb4_0900_bin`. | Chốt quy tắc chuẩn hóa tên Company/Role nhất quán giữa service và DB. |
| Chính sách xóa bản ghi còn FK | Tất cả FK hiện không có `ON DELETE CASCADE`; xóa bản ghi đang được tham chiếu bị DB từ chối và advice trả `409`. | Chốt chính sách nghiệp vụ (xóa mềm, gỡ liên kết, hoặc thu hồi/xóa `refresh_tokens` khi xóa User) trước khi thay đổi FK/service. |

## Quy trình thay đổi schema

- Thêm SQL vào `src/main/resources/db/migration/` theo mẫu `V<N>__<description>.sql` với phiên bản tiếp theo chưa tồn tại (hiện kế tiếp là `V5`). Sửa entity và migration trong cùng thay đổi.
- Sau khi migration đã được áp dụng trên môi trường dùng chung, giữ nguyên tên và nội dung (bao gồm cả `V2` rỗng); mọi thay đổi tiếp theo phải dùng migration mới để giữ lịch sử và checksum.
- Flyway ghi lịch sử trong `flyway_schema_history`. Kiểm tra log khởi động và lịch sử migration; Hibernate `validate` đạt không thay thế kiểm tra đầy đủ FK, unique constraint và dữ liệu nghiệp vụ.
- Với database mới, chạy ứng dụng hoặc integration test trên schema rỗng để kiểm tra toàn bộ chuỗi V1–V4 và các migration mới. Test bắt buộc dùng MySQL cô lập (`MySqlTestConfiguration`), không dùng H2 hoặc datasource mặc định thay thế.
- Với database cũ do Hibernate tạo, đối chiếu schema/dữ liệu, sao lưu và chốt baseline hoặc migration chuyển tiếp trước khi áp dụng. `baseline-on-migrate: false` không tự nhận schema cũ làm baseline; không bật baseline tự động hoặc xóa database để bỏ qua khác biệt.
- Trước khi thêm constraint mới, kiểm tra/backfill dữ liệu cũ (nhất là `users.email` null/trùng hoặc cặp `(user_id, role_id)` trùng). Kiểm thử cả nâng cấp từ phiên bản trước lẫn khởi tạo database rỗng.
