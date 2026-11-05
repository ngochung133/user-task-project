# Schema MySQL

## Hiện trạng từ mapping JPA

`User` map vào bảng `users` với `id` kiểu Long/IDENTITY, `name`, `email`, `password` và `address`. Service kiểm tra email trùng và mã hóa mật khẩu bằng BCrypt. Mapping hiện chưa khai báo unique constraint cho email, audit timestamp hay quan hệ HR. Schema của một database đã chạy có thể khác mapping hiện tại, nên kiểm tra schema thật trước khi viết migration. [User.java](../src/main/java/com/example/crud/modules/user/entity/User.java) · [UserServiceImpl.java](../src/main/java/com/example/crud/modules/user/service/impl/UserServiceImpl.java)

Profile mặc định dùng Hibernate `ddl-auto=update`. Test dùng `create-drop` trên MySQL container. Repo chưa có migration versioned. [Cấu hình mặc định](../src/main/resources/application.properties) · [Cấu hình test](../src/test/resources/application-test.properties)

## Mô hình HR đích

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

## Khi triển khai migration

Đối chiếu schema thật và dữ liệu hiện hữu, đặc biệt email null/trùng. Chốt cách backfill và tạo constraint bằng migration có phiên bản trước khi dùng schema đích trong môi trường chung. Xác nhận trên MySQL test riêng, bao gồm kiểm tra migration khi đã có bản ghi cũ.
