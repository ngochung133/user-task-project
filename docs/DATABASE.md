# Schema MySQL

## Hiện trạng từ mapping JPA

Schema được quản lý bằng **Flyway SQL migration**; Hibernate dùng `ddl-auto: validate` để đối chiếu mapping JPA, không tạo hoặc cập nhật bảng. Cả cấu hình mặc định và profile test đều dùng `validate`. [Cấu hình chính](../src/main/resources/application.yml) · [Cấu hình test](../src/test/resources/application-test.yml)

Migration hiện có: [`V1__init_schema.sql`](../src/main/resources/db/migration/V1__init_schema.sql), tạo sáu bảng:

| Bảng | Nội dung trong V1 |
|---|---|
| `companies` | Thông tin công ty, logo, audit; unique `name`. |
| `permissions` | Tên, path, method, module và audit; unique `(api_path, method)`, `api_path` dùng collation `utf8mb4_0900_bin`. |
| `roles` | Tên, mô tả và audit; unique `name`. |
| `users` | Tên, email, password, address, age, avatar, gender và FK `company_id` nullable. Chưa có unique email hoặc audit. |
| `role_permission` | Hai FK và khóa chính ghép `(role_id, permission_id)`. |
| `user_role` | Hai FK tới User và Role; V1 chưa khai báo khóa chính hoặc unique cho cặp ID. |

Đây là nội dung SQL và mapping đã đọc, chưa phải xác nhận migration đã chạy thành công hoặc schema database đang chạy khớp hoàn toàn. Mapping User hiện có quan hệ Company/Role. File upload lưu trên đĩa, không có bảng File trong V1.

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

Profile test kế thừa cấu hình Flyway và dùng MySQL 8.4 Testcontainers qua `MySqlTestConfiguration`. Mục tiêu là chạy cùng migration trên database test mới, rồi để Hibernate validate. Chưa chạy lại integration test sau chuyển đổi này.

## Mô hình HR đích

Bảng sau giữ yêu cầu đích; đối chiếu phần V1 ở trên để biết phần đã có và khoảng cách còn lại.

| Bảng | Dữ liệu và ràng buộc cần thiết |
|---|---|
| `users` | Giữ ID hiện tại, email duy nhất và password hash. Bổ sung profile, audit và `company_id` nullable khi triển khai Company–User. |
| `companies` | ID, tên, mô tả, địa chỉ, logo và audit. |
| `permissions` | ID, tên, `api_path`, `method`, `module` và audit. Unique trên `(api_path, method)`. |
| `roles` | ID, tên, mô tả và audit. Chốt phạm vi duy nhất của tên Role trước khi tạo constraint. |
| `role_permission` | FK tới Role và Permission, khóa ghép. Role sở hữu quan hệ. |
| `user_role` | FK tới User và Role, khóa ghép. User sở hữu quan hệ. |
| `refresh_tokens` | FK tới User, định danh token dạng hash, thời điểm hết hạn và trạng thái thu hồi, theo ADR sau khi duyệt. |

User → Company là ManyToOne, User ↔ Role và Role ↔ Permission là ManyToMany. Dùng LAZY khi có thể. Xóa quan hệ nối phải giữ nguyên thực thể ở đầu kia. Trước khi triển khai xóa Company hoặc User, chốt xử lý FK, hồ sơ nhân sự và token còn hiệu lực trong cùng thay đổi.

## Quy trình thay đổi schema

- Thêm SQL vào `src/main/resources/db/migration/` theo mẫu `V<N>__<description>.sql`, dùng phiên bản tiếp theo chưa tồn tại. Sửa entity và migration trong cùng thay đổi.
- Sau khi migration đã được áp dụng trên môi trường dùng chung, giữ nguyên tên và nội dung; thay đổi tiếp theo bằng migration mới để giữ lịch sử và checksum.
- Flyway ghi lịch sử trong `flyway_schema_history`. Kiểm tra log khởi động và lịch sử migration; Hibernate validate đạt không thay thế kiểm tra đầy đủ FK, unique constraint và dữ liệu nghiệp vụ.
- Với database mới, chạy ứng dụng hoặc integration test trên schema rỗng để kiểm tra V1 và các migration sau. Test bắt buộc dùng MySQL cô lập, không dùng H2 hoặc datasource mặc định thay thế.
- Với database cũ do Hibernate tạo, đối chiếu schema/dữ liệu, sao lưu và chốt baseline hoặc migration chuyển tiếp trước khi áp dụng. `baseline-on-migrate: false` không tự nhận schema cũ làm baseline; không bật baseline tự động hoặc xóa database để bỏ qua khác biệt.
- Trước khi thêm constraint, kiểm tra/backfill dữ liệu cũ, nhất là email null/trùng. Kiểm thử nâng cấp từ phiên bản trước và trạng thái dữ liệu sau nâng cấp; không chỉ kiểm tra khởi tạo database rỗng.
