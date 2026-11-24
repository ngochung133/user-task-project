# Hợp đồng REST API

Tài liệu này phản ánh **hợp đồng hiện tại đọc từ mã nguồn** của repo `hr-management` (kiểm tra tĩnh các controller, DTO, `SecurityConfig` và `GlobalExceptionHandler`; không thay thế bằng chứng chạy HTTP/MySQL mới nhất trong [PROJECT-STATUS.md](PROJECT-STATUS.md)).

## Quy ước chung

### Base path và JSON envelope
- Base path cho toàn bộ API nghiệp vụ: `/api/v1`.
- Phản hồi JSON dùng [ApiResponse](../src/main/java/com/example/hrmanagement/dto/ApiResponse.java) với `@JsonInclude(NON_NULL)`:
  - Thành công: `statusCode`, `message`, `data`, `timestamp` (UTC `Instant`).
  - Lỗi: `statusCode`, `message`, `error`, `timestamp` và tùy trường hợp có `details` (danh sách chuỗi lỗi validation).

### Phân trang và lọc
- Cấu hình HTTP (`application.yml`): `page` bắt đầu từ `1` (`one-indexed-parameters: true`), `size` mặc định `10`, tối đa `100`.
- Danh sách tài nguyên trả [PageResponseDTO](../src/main/java/com/example/hrmanagement/dto/PageResponseDTO.java) bên trong `ApiResponse.data`:
  `content`, `page` (1-indexed), `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`.
- Chưa áp dụng sort mặc định hoặc allowlist sort ở tầng service.

### Quyền truy cập và mã lỗi
- **Public** ([SecurityConfig](../src/main/java/com/example/hrmanagement/config/SecurityConfig.java)): `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/uploads/**`.
- **Bearer JWT (chỉ cần xác thực)**: `/api/v1/auth/me`, `/api/v1/dashboard`.
- **RBAC (`PermissionAuthorizationManager`)**: mọi request còn lại yêu cầu Bearer access JWT hợp lệ (`type="access"`) **và** Role trong JWT sở hữu Permission khớp HTTP method + `apiPath` (`AntPathMatcher`).
- Mã lỗi chính ([GlobalExceptionHandler](../src/main/java/com/example/hrmanagement/exception/GlobalExceptionHandler.java) & `SecurityConfig`):
  - `400`: lỗi `@Valid` (có `details`), sai kiểu tham số, thiếu multipart part/param, lỗi `FileUploadException`.
  - `401`: thiếu/sai/hết hạn Bearer JWT (kèm header `WWW-Authenticate` không lộ mô tả nội bộ), sai thông tin đăng nhập (`BadCredentialsException`), refresh token thiếu/hết hạn/đã thu hồi (`InvalidTokenException`).
  - `403`: đã xác thực nhưng không có Permission tương ứng.
  - `404`: không tìm thấy bản ghi (`ResourceNotFoundException`) hoặc không tìm thấy route/tài nguyên tĩnh (`NoResourceFoundException`).
  - `409`: trùng dữ liệu kiểm tra ở service (`ResourceAlreadyExistException`) hoặc vi phạm unique/FK ở DB (`DataIntegrityViolationException`).
  - `413`: vượt giới hạn multipart HTTP (`MaxUploadSizeExceededException`).
  - `500`: lỗi hệ thống không mong đợi.

---

## Auth (`/api/v1/auth`)

[AuthController](../src/main/java/com/example/hrmanagement/feature/auth/AuthController.java) · [AuthServiceImpl](../src/main/java/com/example/hrmanagement/feature/auth/AuthServiceImpl.java)

| Method và path | Quyền truy cập | Thành công | Ghi chú hợp đồng |
|---|---|---|---|
| `POST /api/v1/auth/login` | Public | `200`, `LoginResponseDTO` (`accessToken`, `refreshToken`) | Nhận `@Valid LoginRequestDTO` (`email`, `password` min 6). Ghi cookie `refresh_token` (`HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`), lưu hash SHA-256 + `deviceInfo`/`ipAddress` vào `refresh_tokens`. |
| `POST /api/v1/auth/register` | Public | `201`, `RegisterResponse` (`id`, `name`, `email`, `age`, `address`, `createdAt`, `updateAt`) | Nhận `@Valid RegisterRequest` (`name` 2–100, `email`, `password` 8–100 và ≤ 72 byte UTF-8, `age` 1–150 nullable, `gender` nullable, `address` ≤ 255). Gán mặc định Role `USER`. |
| `POST /api/v1/auth/refresh` | Public | `200`, `LoginResponseDTO` (`accessToken`, `refreshToken`) | Lấy refresh token ưu tiên từ cookie `refresh_token`, fallback JSON body `RefreshTokenRequestDTO`. Xoay vòng token trong transaction và đặt lại cookie mới. |
| `POST /api/v1/auth/logout` | Public | `200`, chuỗi `"Log out successfully"` trong `data` | Lấy refresh token từ cookie hoặc body, đánh dấu `revoked=true` và xóa cookie (`Max-Age=0`). |
| `GET /api/v1/auth/me` | Bearer JWT | `200`, `UserResponseDTO` | Đọc email từ `Authentication` và trả thông tin người dùng hiện tại (gồm `companyInfo`, `roleInfo`). |
| `GET /api/v1/auth/` | RBAC | `200`, text `"Hello Web"` | Endpoint thử nghiệm cũ; không nằm trong whitelist nên đi qua RBAC. |

---

## User (`/api/v1/users`)

[UserController](../src/main/java/com/example/hrmanagement/feature/user/UserController.java) · [UserServiceImpl](../src/main/java/com/example/hrmanagement/feature/user/UserServiceImpl.java) · [CONTEXT](../src/main/java/com/example/hrmanagement/feature/user/CONTEXT.md)

| Method và path | Quyền truy cập | Thành công | Ghi chú hợp đồng |
|---|---|---|---|
| `GET /api/v1/users` | RBAC | `200`, `PageResponseDTO<UserResponseDTO>` | Filter: `age`, `name`, `email`, `minAge`, `maxAge`, `gender` (`GenderEnumConverter` chấp nhận không phân biệt hoa/thường). |
| `GET /api/v1/users/{id}` | RBAC | `200`, `UserResponseDTO` | Trả `404` nếu không tồn tại. |
| `POST /api/v1/users` | RBAC | `201`, `UserResponseDTO` | Nhận `@Valid UserRequestDTO`. *(Lưu ý: `@SecurityRequirements` rỗng trên controller hiện chỉ ảnh hưởng OpenAPI, không mở public ở `SecurityConfig`.)* |
| `PUT /api/v1/users/{id}` | RBAC | `200`, `UserResponseDTO` | Dùng `id` trên path, cùng `UserRequestDTO`. Kiểm tra trùng email loại trừ chính `id`. Nếu `companyId=null`, giữ Company hiện tại. Luôn mã hóa lại `password`. |
| `DELETE /api/v1/users/{id}` | RBAC | `200`, `"Delete Success"` trong `data` | Trả `404` nếu không tồn tại; `409` nếu còn bản ghi FK (như `refresh_tokens`). |

- **Request (`UserRequestDTO`)**: `name` (2–100, `@NotBlank`), `email` (`@Email`, `@NotBlank`), `password` (min 6, `@NotBlank`), `age` (1–150, nullable), `avatar` (nullable), `gender` (`MALE`/`FEMALE`/`OTHER`, nullable), `companyId` (nullable), **`roleIDs`** (`@NotNull`, phần tử `@Positive @NotNull`, tập rỗng hợp lệ), `address` (`@NotBlank`).
- **Response (`UserResponseDTO`)**: `id`, `name`, `email`, `age`, `address`, `gender`, `avatar`, `companyInfo` (`{id, name}` hoặc `null`), `roleInfo` (`Set<{id, name}>`). Không trả password hay audit timestamp.

---

## Company (`/api/v1/companies`)

[CompanyController](../src/main/java/com/example/hrmanagement/feature/company/CompanyController.java) · [CompanyServiceImpl](../src/main/java/com/example/hrmanagement/feature/company/CompanyServiceImpl.java) · [CONTEXT](../src/main/java/com/example/hrmanagement/feature/company/CONTEXT.md)

| Method và path | Quyền truy cập | Thành công | Ghi chú hợp đồng |
|---|---|---|---|
| `GET /api/v1/companies` | RBAC | `200`, `PageResponseDTO<CompanyResponseDTO>` | Filter: `name`, `description` (LIKE ignore-case), `logo`, `address` (so bằng sau trim). |
| `GET /api/v1/companies/{id}` | RBAC | `200`, `CompanyResponseDTO` | Trả `404` nếu không tồn tại. |
| `POST /api/v1/companies` | RBAC | `201`, `CompanyResponseDTO` | Nhận `@Valid CompanyRequestDTO`. Trùng `name` trả `409`. |
| `PUT /api/v1/companies/{id}` | RBAC | `200`, `CompanyResponseDTO` | Dùng `id` trên path, kiểm tra trùng `name` loại trừ chính `id`. |
| `DELETE /api/v1/companies/{id}` | RBAC | `200`, `"Delete successfully"` trong `data` | Trả `404` nếu không tồn tại; `409` nếu đang có User tham chiếu FK. |

- **Request (`CompanyRequestDTO`)**: `name`, `description`, `address`, `logo` — cả 4 trường đều `@NotBlank` và tối đa 255 ký tự.
- **Response (`CompanyResponseDTO`)**: `id`, `name`, `description`, `address`, `logo`, `createdAt`, `updatedAt`.

---

## Permission (`/api/v1/permissions`)

[PermissionController](../src/main/java/com/example/hrmanagement/feature/permission/PermissionController.java) · [PermissionServiceImpl](../src/main/java/com/example/hrmanagement/feature/permission/PermissionServiceImpl.java) · [CONTEXT](../src/main/java/com/example/hrmanagement/feature/permission/CONTEXT.md)

| Method và path | Quyền truy cập | Thành công | Ghi chú hợp đồng |
|---|---|---|---|
| `GET /api/v1/permissions` | RBAC | `200`, `PageResponseDTO<PermissionResponseDTO>` | Filter: `name` (LIKE ignore-case), `method`, `module` (trim + uppercase so bằng). |
| `GET /api/v1/permissions/{id}` | RBAC | `200`, `PermissionResponseDTO` | Trả `404` nếu không tồn tại. |
| `POST /api/v1/permissions` | RBAC | `201`, `PermissionResponseDTO` | Nhận `@Valid PermissionRequestDTO`. Trùng `(apiPath, method)` sau chuẩn hóa trả `409`. Reload cache RBAC. |
| `PUT /api/v1/permissions/{id}` | RBAC | `200`, `PermissionResponseDTO` | Dùng `id` trên path, kiểm tra trùng loại trừ chính `id`. Reload cache RBAC. |
| `DELETE /api/v1/permissions/{id}` | RBAC | `200`, `"Delete successfully"` trong `data` | Trả `404` nếu không tồn tại; `409` nếu đang được Role tham chiếu. Reload cache RBAC. |

- **Request (`PermissionRequestDTO`)**: `name`, `apiPath`, `method`, `module` — đều `@NotBlank`, tối đa 255 ký tự. Service trim `name`/`apiPath`, trim + uppercase (`Locale.ROOT`) `method`/`module`.
- **Response (`PermissionResponseDTO`)**: `id`, `name`, `apiPath`, `method`, `module`, `createdAt`, `updatedAt`.

---

## Role (`/api/v1/roles`)

[RoleController](../src/main/java/com/example/hrmanagement/feature/role/RoleController.java) · [RoleServiceImpl](../src/main/java/com/example/hrmanagement/feature/role/RoleServiceImpl.java) · [CONTEXT](../src/main/java/com/example/hrmanagement/feature/role/CONTEXT.md)

| Method và path | Quyền truy cập | Thành công | Ghi chú hợp đồng |
|---|---|---|---|
| `GET /api/v1/roles` | RBAC | `200`, `PageResponseDTO<RoleResponseDTO>` | Filter: `name` (so bằng), `description` (LIKE ignore-case), `permissionIds` (chứa đủ mọi ID yêu cầu). |
| `GET /api/v1/roles/{id}` | RBAC | `200`, `RoleResponseDTO` | Trả `404` nếu không tồn tại. |
| `POST /api/v1/roles` | RBAC | `201`, `RoleResponseDTO` | Kiểm tra trùng `name` (`409`) và kiểm tra đủ `permissionIds` (`404`) trước khi lưu. Reload cache RBAC. |
| `PUT /api/v1/roles/{id}` | RBAC | `200`, `RoleResponseDTO` | Thay `name`, `description` và toàn bộ tập `permissions` (tập rỗng gỡ hết quyền). Reload cache RBAC. |
| `DELETE /api/v1/roles/{id}` | RBAC | `200`, `"Delete successfully"` trong `data` | Trả `404` nếu không tồn tại; `409` nếu còn User gắn Role. Không xóa bản ghi Permission. Reload cache RBAC. |

- **Request (`RoleRequestDTO`)**: `name` (`@NotBlank`, ≤ 255), `description` (`@NotBlank`, ≤ 255), `permissionIds` (`@NotNull`, `Set<@Positive @NotNull Long>`, tập rỗng hợp lệ).
- **Response (`RoleResponseDTO`)**: `id`, `name`, `description`, `permissions` (`List<PermissionResponseDTO>`), `createdAt`, `updatedAt`.

---

## Files và Dashboard

| Method và path | Quyền truy cập | Thành công | Ghi chú hợp đồng |
|---|---|---|---|
| `POST /api/v1/files` | RBAC | `201`, `FileUploadResponse` (`fileName`, `folder`, `fileUrl`, `size`, `uploadAt`) | `multipart/form-data` với part `file` và `folder` (`avatars` hoặc `logos`). Đuôi cho phép `jpg`, `jpeg`, `png`, `gif`, `webp` kèm kiểm tra magic bytes; HTTP giới hạn `8MB`/file, `10MB`/request; service giới hạn `8242880` byte. [FileController](../src/main/java/com/example/hrmanagement/feature/file/FileController.java) |
| `GET /uploads/{folder}/{fileName}` | Public | `200`, nội dung ảnh tĩnh | Ánh xạ qua [WebMvcConfig](../src/main/java/com/example/hrmanagement/config/WebMvcConfig.java) tới `file:${app.upload.base-dir}/`. |
| `GET /api/v1/dashboard` | Bearer JWT | `200`, `DashboardResponse` (`totalUsers`, `totalCompanies`, `totalRoles`, `totalPermissions`) | Thống kê tổng số bản ghi của 4 bảng chính. [DashboardController](../src/main/java/com/example/hrmanagement/feature/dashboard/DashboardController.java) |

---

## Điểm cần chốt / đồng bộ cho thay đổi tiếp theo

- **OpenAPI**: gỡ hoặc đồng bộ `@SecurityRequirements` trên `POST /api/v1/users` và bổ sung cấu hình security nhất quán cho các route public/JWT.
- **Validation & tên trường**: bổ sung allowlist `method`/`module` và cú pháp `apiPath` cho Permission; xem xét giới hạn 72 byte BCrypt cho `UserRequestDTO`; chốt có đổi tên `roleIDs`, `uploadAt`, `updateAt` (trong `RegisterResponse`) hay giữ tương thích ngược.
- **Sắp xếp & xóa dữ liệu**: bổ sung sort mặc định `id ASC` + tiêu chí phụ cho các endpoint list; chốt chính sách xóa khi còn liên kết FK (Company có User, Role có User, Permission gắn Role, User có RefreshToken).
- **ADR đề xuất**: đồng bộ và phê duyệt lại [ADR-001](decisions/001-refresh-token-strategy.md) (cookie/JSON body/CSRF) và [ADR-002](decisions/002-file-upload-strategy.md) (giới hạn dung lượng, quyền đọc `/uploads/**`, vòng đời file).
