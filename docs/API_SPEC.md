# Hợp đồng REST API

## Baseline đã đọc từ mã

| Method và path | Quyền truy cập hiện tại | Thành công |
|---|---|---|
| `POST /auth/login` | Public | `201`, dữ liệu có `accessToken`, `tokenType`, `tokenExpiration` tính bằng mili giây. |
| `GET /auth/` | Bearer JWT | `200`, text `Hello Web`. |
| `GET /users` | Bearer JWT | `200`, danh sách User dạng DTO, chưa phân trang. |
| `POST /users` | Public | `201`, tạo User từ `name`, `email`, `password`, `address`. |
| `PUT /users/{id}` | Bearer JWT | `200`, nhận cùng nhóm trường như create, cập nhật cả email và mật khẩu. |
| `DELETE /users/{id}` | Bearer JWT | `200`, trả chuỗi xác nhận trong `data`. |

Create/update User nhận trực tiếp entity. Service bỏ qua ID trong body khi tạo và dùng ID trên path để tìm bản ghi khi sửa. User response gồm `id`, `name`, `email`, `address`. JSON envelope có `statusCode`, `message`, `timestamp`, và tùy tình huống có `data`, `error`, `details`. Validation dùng `details` dạng danh sách. Lỗi do filter chain xử lý có thể khác lỗi MVC. [AuthController](../src/main/java/com/example/crud/modules/auth/controller/AuthController.java) · [UserController](../src/main/java/com/example/crud/modules/user/controller/UserController.java) · [UserServiceImpl](../src/main/java/com/example/crud/modules/user/service/impl/UserServiceImpl.java) · [ApiResponse](../src/main/java/com/example/crud/global/shared/ApiResponse.java) · [SecurityConfig](../src/main/java/com/example/crud/global/config/SecurityConfig.java)

## API HR đích

Các route sau là đề xuất để triển khai theo từng task. Base path `/api/v1`. API quản trị yêu cầu Bearer JWT và quyền phù hợp khi RBAC được đưa vào.

| Nhóm | Endpoint đích | Hợp đồng cần hoàn thiện |
|---|---|---|
| Permission | `GET/POST /permissions`, `GET/PUT/DELETE /permissions/{id}` | Nhận `name`, `apiPath`, `method`, `module`. Cặp path + method duy nhất, lỗi trùng `409`. |
| Company | `GET/POST /companies`, `GET/PUT/DELETE /companies/{id}` | Nhận `name`, `description`, `address`, `logo`. Chốt xử lý Company có User trước khi làm DELETE. |
| Role | `GET/POST /roles`, `GET/PUT/DELETE /roles/{id}` | Gán `permissionIds`; khi thay thế danh sách, kiểm tra mọi ID trước khi ghi. |
| User | `GET/POST /users`, `GET/PUT/DELETE /users/{id}` | Thêm `companyId`, `roleIds` khi các module liên quan đã có. Tạo nhân sự theo quyền admin; chốt trường được sửa trước khi thay đổi update. |
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` | Tách đăng ký khỏi tạo nhân sự. Chốt status, DTO và transport refresh theo ADR. |
| Files | `POST /files` | Multipart upload avatar/logo. [ADR-002](decisions/002-file-upload-strategy.md) |

Đề xuất dùng ID trên path khi cập nhật tài nguyên, theo hình dạng route User đang có. List HR dùng `page` bắt đầu từ 1, `size` và `sort` được validate theo allowlist. Trả metadata `page`, `pageSize`, `pages`, `total` cùng `result`. Trước khi triển khai từng module, ghi rõ field bắt buộc, default/giới hạn phân trang, status, chính sách truy cập và ví dụ JSON của module đó.
