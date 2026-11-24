# Kiến trúc HR Management API

## Hiện trạng

`HrManagementApplication` nằm ở `com.example.hrmanagement`, bật `@EnableScheduling` và scan các package bên dưới. Ứng dụng xây dựng trên Java 25, Spring Boot 4.1.1, Spring Data JPA/MySQL, Flyway, Spring Security OAuth2 Resource Server và springdoc-openapi. [Entry point](../src/main/java/com/example/hrmanagement/HrManagementApplication.java) · [Mã ứng dụng](../src/main/java/com/example/hrmanagement/)

## Cấu trúc feature-based hiện tại

```text
src/main/java/com/example/hrmanagement/
├── HrManagementApplication.java
├── config/
│   ├── CorsProperties.java               # Bind app.cors.allowed-origins
│   ├── DatabaseSeeder.java               # Seed mẫu khi app.seed.enabled=true
│   ├── FileUploadProperties.java         # Bind app.upload.*
│   ├── OpenAPIConfig.java                # Cấu hình Swagger/OpenAPI + Bearer scheme
│   ├── ScheduledTasks.java               # Dọn refresh token hết hạn (02:00 Asia/Ho_Chi_Minh)
│   ├── SecurityConfig.java               # Filter chain, JWT encoder/decoder, CORS, 401/403
│   └── WebMvcConfig.java                 # Phục vụ file tĩnh /uploads/**
├── dto/
│   ├── ApiResponse.java                  # JSON envelope dùng chung
│   └── PageResponseDTO.java              # Chuẩn hóa dữ liệu phân trang (page từ 1)
├── exception/
│   ├── FileUploadException.java
│   ├── GlobalExceptionHandler.java       # @RestControllerAdvice ánh xạ lỗi HTTP
│   ├── InvalidTokenException.java
│   ├── ResourceAlreadyExistException.java
│   └── ResourceNotFoundException.java
├── security/
│   ├── CustomerDetailService.java        # UserDetailsService tải user + ROLE_<name>
│   └── PermissionAuthorizationManager.java # RBAC theo HTTP method + AntPathMatcher + cache
└── feature/
    ├── auth/                             # AuthController, AuthService/Impl, RefreshToken, Repo, dto/
    ├── company/                          # Company, Controller, Service/Impl, Repo, Specification, dto/, CONTEXT.md
    ├── dashboard/                        # DashboardController, DashboardService/Impl, dto/
    ├── file/                             # FileController, FileService/Impl, dto/
    ├── permission/                       # Permission, Controller, Service/Impl, Repo, Specification, dto/, CONTEXT.md
    ├── role/                             # Role, Controller, Service/Impl, Repo, Specification, dto/, CONTEXT.md
    └── user/                             # User, Controller, Service/Impl, Repo, Specification, dto/, CONTEXT.md
```

Cây test dưới `src/test/java/com/example/hrmanagement/` giữ tổ chức theo trách nhiệm theo [ADR-003](decisions/003-feature-package-layout.md):
- `controller/`: HTTP integration test cho Auth, User, Company, Permission, Role, File, Dashboard, OpenAPI, cùng unit test `AuthControllerTest` và `GlobalExceptionHandlerTest`.
- `service/`: unit test nghiệp vụ (Auth, User, Company, Permission, Role, File, Dashboard, ScheduledTasks) và `RefreshTokenCleanupIntegrationTest`.
- `helper/`: `AuthTestHelper`.
- `config/`: `MySqlTestConfiguration` (MySQL 8.4 Testcontainers).

## Quan hệ giữa các module

- `permission` và `company` là hai module tài nguyên độc lập.
- `role` sở hữu quan hệ `ManyToMany` tới `permission` qua bảng `role_permission`.
- `user` tham chiếu `company` (`ManyToOne` nullable) và sở hữu quan hệ `ManyToMany` tới `role` qua `user_role`.
- `auth` dùng `UserRepository`, `RoleRepository` (Role mặc định `USER` khi đăng ký), `RefreshTokenRepository`, `AuthenticationManager` và `JwtEncoder`.
- `file` độc lập với DB, lưu file trên hệ thống tệp theo `FileUploadProperties` và trả đường dẫn `/uploads/{folder}/{fileName}` để client gắn vào Company/User.
- `dashboard` chỉ đọc đếm số lượng từ 4 repository (`User`, `Company`, `Role`, `Permission`).
- Tầng `security` đọc dữ liệu từ `UserRepository` (`CustomerDetailService`) và `RoleRepository` (`PermissionAuthorizationManager`); `PermissionServiceImpl`, `RoleServiceImpl` và `DatabaseSeeder` gọi `PermissionAuthorizationManager.loadCache()` để làm mới cache quyền.

## Tách service thành interface và implementation

1. Đưa các chữ ký nghiệp vụ mà caller cần vào `<Feature>Service` trong package feature. [UserService](../src/main/java/com/example/hrmanagement/feature/user/UserService.java)
2. Đưa nghiệp vụ, transaction và dependency vào `<Feature>ServiceImpl` cùng package (`@Service`, `@Override`, constructor injection). Chuyển đổi entity sang response thực hiện qua `static fromEntity(...)` trên response record bên trong transaction của service (không dùng mapper class riêng). [UserServiceImpl](../src/main/java/com/example/hrmanagement/feature/user/UserServiceImpl.java) · [UserResponseDTO](../src/main/java/com/example/hrmanagement/feature/user/dto/UserResponseDTO.java)
3. Controller tiêm interface service, kiểm tra input bằng `@Valid`, chuyển đổi `Page<T>` bằng `PageResponseDTO.from(...)` và bọc bằng `ApiResponse`. [UserController](../src/main/java/com/example/hrmanagement/feature/user/UserController.java)
4. Trong unit test, `@InjectMocks` khởi tạo class implementation với dependency đã mock; integration test kiểm tra wiring qua MockMvc và MySQL Testcontainers. [UserServiceTest](../src/test/java/com/example/hrmanagement/service/UserServiceTest.java)

## Xác thực và phân quyền

**Hiện tại trong mã.**
- **Xác thực:** Spring Security dùng BCrypt, JWT HS256 qua Nimbus, Bearer Resource Server và session `STATELESS`. `CustomerDetailService` tải người dùng theo email và sinh `SimpleGrantedAuthority("ROLE_" + role.getName())` từ tập Role của User.
- **Token:** `AuthServiceImpl` phát hành access token (15 phút, chứa `sub`, `userId`, `roles`, `type="access"`) và refresh token (7 ngày, `type="refresh"`, lưu hash SHA-256 trong `refresh_tokens`). `JwtDecoder` gắn `JwtClaimValidator` yêu cầu `type="access"` để chặn dùng refresh token truy cập API. `refresh` và `logout` khóa dòng bằng `PESSIMISTIC_WRITE`, thực hiện rotation/revoke trong transaction; `ScheduledTasks` xóa token hết hạn định kỳ.
- **Phân quyền (RBAC):** `SecurityConfig` mở public cho Swagger/OpenAPI, 4 route Auth (`/login`, `/register`, `/refresh`, `/logout`) và `/uploads/**`; yêu cầu chỉ cần JWT cho `/api/v1/auth/me` và `/api/v1/dashboard`; mọi request còn lại giao cho `PermissionAuthorizationManager`. Manager đối chiếu authority `ROLE_<name>` trong JWT với `rolePermissionsCache` và so khớp HTTP method + `apiPath` qua `AntPathMatcher`. Xem chi tiết trong [SecurityConfig](../src/main/java/com/example/hrmanagement/config/SecurityConfig.java), [PermissionAuthorizationManager](../src/main/java/com/example/hrmanagement/security/PermissionAuthorizationManager.java) và [API_SPEC.md](API_SPEC.md).

**Còn mở / cần hoàn thiện.**
- Chưa xác minh nhất quán cache khi transaction rollback hoặc chạy nhiều instance (`loadCache()` đang gọi trước khi commit).
- Thay đổi Role của User hoặc sửa quyền của Role không tự thu hồi access token đang còn hạn.
- Chốt topology cookie/CSRF và việc trả `refreshToken` trong JSON body theo [ADR-001](decisions/001-refresh-token-strategy.md); chốt giới hạn và vòng đời file theo [ADR-002](decisions/002-file-upload-strategy.md).

## Quản lý schema bằng Flyway

Flyway là nguồn thay đổi schema có phiên bản qua SQL trong `src/main/resources/db/migration/` (hiện có `V1` đến `V4`: 6 bảng HR nền tảng, `V2` rỗng, `V3` thêm cột audit cho `users`, `V4` tạo `refresh_tokens`). Hibernate chỉ đối chiếu mapping bằng `ddl-auto: validate` ở cả profile chính và test; không dựa vào Hibernate để tự tạo/cập nhật bảng.

Integration test dùng MySQL 8.4 Testcontainers (`MySqlTestConfiguration`) và chạy cùng bộ migration với ứng dụng. Với schema cũ đã có dữ liệu, cần quy trình baseline/chuyển tiếp riêng. Xem [DATABASE.md](DATABASE.md).
