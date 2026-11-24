# Quy ước phát triển HR Management API

Áp dụng cho mã mới và phần được yêu cầu chuyển đổi. Dùng mã và test của repo này để xác nhận hành vi hiện tại. Tài liệu này tách rõ **hiện trạng đang có trong mã**, **quy ước cho thay đổi mới** và **điểm còn mở/cần chốt**. Khi tài liệu lệch với mã hoặc ADR, ghi rõ tác động và chốt phần ảnh hưởng trước khi triển khai.

## Học và thực hành cùng AI

- Người học tự sửa mã và chạy test. AI giải thích kiến thức, đưa ví dụ trong chat, chỉ cách kiểm tra và review khi được yêu cầu. Khi áp dụng skill, giữ phạm vi hướng dẫn trừ khi người học giao rõ việc sửa file.
- Khi gặp kỹ thuật thực tế liên quan đến task, giải thích bằng tình huống trong repo. Chỉ bổ sung vào quy ước những điểm có điều kiện áp dụng cụ thể và có thể kiểm tra.

## Package và đặt tên

- Dùng `com.example.hrmanagement.feature.<feature>` cho từng feature (hiện có: `auth`, `company`, `dashboard`, `file`, `permission`, `role`, `user`). Đặt controller, entity, repository, specification, service interface và implementation trực tiếp trong package feature; đặt DTO trong `feature/<feature>/dto/`. Đặt thành phần dùng chung ở `config/`, `dto/` (`ApiResponse`, `PageResponseDTO`), `exception/` và `security/` (`CustomerDetailService`, `PermissionAuthorizationManager`) cấp ứng dụng. Xem [cây package và kiến trúc](ARCHITECTURE.md).
- Quy ước đặt tên: `<Feature>Controller`, `<Feature>Service`, `<Feature>ServiceImpl`, `<Feature>Repository`, `<Feature>Specification`, cùng DTO `<Feature>RequestDTO` / `<Action>Request`, `<Feature>ResponseDTO` / `<Action>Response`, `<Feature>FilterDTO`. Tên Java dùng PascalCase cho lớp, camelCase cho biến/phương thức, UPPER_SNAKE_CASE cho hằng số và snake_case cho bảng/cột.
- Dùng constructor injection với field `final` cho component. Dùng Lombok `@RequiredArgsConstructor` khi constructor chỉ nhận dependency và viết constructor tường minh khi cần logic khởi tạo riêng (ví dụ gọi `loadCache()` trong `PermissionAuthorizationManager`).
- DTO mới mặc định dùng Java `record` với Jakarta Validation trên component của request và `static fromEntity(...)` trên response khi ánh xạ từ entity. Với DTO dạng class còn lại (`LoginRequestDTO`, `UserRequestDTO`, `PermissionRequestDTO`), giữ `@Getter`, `@Setter`, `@NoArgsConstructor` cho deserialization JSON; ưu tiên chuyển sang `record` khi có yêu cầu refactor.
- Với JPA entity mới, dùng `@Getter` và `@NoArgsConstructor(access = AccessLevel.PROTECTED)`, viết constructor/phương thức nghiệp vụ và giới hạn setter, tránh `@Data`. Các entity hiện có (`User`, `Company`, `Role`, `Permission`, `RefreshToken`) đang dùng setter/constructor Lombok công khai; giữ tương thích cho tới khi có task refactor riêng.

## HTTP, phân trang và nghiệp vụ

- API HR dùng tiền tố `/api/v1`. Controller dùng `@Valid` với `@RequestBody`, gọi service interface và trả `ResponseEntity<ApiResponse<T>>` (hoặc `ResponseEntity<?>` bọc `ApiResponse`) qua các factory `ApiResponse.success(...)` (`200`), `ApiResponse.created(...)` (`201`) và các factory lỗi dùng chung. Thay đổi route, HTTP status, quyền truy cập hoặc response shape của API hiện có cần phạm vi và test tương thích rõ ràng. [Hợp đồng API](API_SPEC.md)
- Phân trang HTTP cấu hình `one-indexed-parameters: true` (`page` bắt đầu từ 1), `default-page-size: 10`, `max-page-size: 100`. Endpoint danh sách dùng `@ModelAttribute <Feature>FilterDTO` + `Pageable`, lọc động qua `JpaSpecificationExecutor` (`Specification.allOf(...)`) và trả `PageResponseDTO.from(page)` với shape `content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`.
- Quy ước cho thay đổi mới về sắp xếp: dùng sort mặc định ổn định (ví dụ `id ASC`) và dùng `id` làm tiêu chí phụ khi sort theo trường khác để tránh lệch trang khi trùng giá trị. Hiện các service list chuyển thẳng `Pageable` xuống repository và chưa áp dụng mặc định này.
- Service giữ nghiệp vụ, đặt `@Transactional` ở phương thức ghi và `@Transactional(readOnly = true)` ở phương thức đọc cần ánh xạ quan hệ LAZY trong `fromEntity(...)`. Repository dùng Spring Data derived query hoặc JPQL khi cần, trả `Optional<T>` cho truy vấn đơn có thể rỗng.
- Loại mật khẩu, hash và khóa ký khỏi response và log. Chỉ trả token qua hợp đồng Auth được định nghĩa và luôn loại token khỏi log.
- Dùng exception nghiệp vụ và `GlobalExceptionHandler` / `SecurityConfig` dùng chung, giữ stack trace và chi tiết SQL ở log nội bộ:
  - `400`: `MethodArgumentNotValidException` (kèm `details` dạng danh sách), `MethodArgumentTypeMismatchException`, `FileUploadException`, `MissingServletRequestPartException`, `MissingServletRequestParameterException`.
  - `401`: thiếu/sai/hết hạn Bearer JWT (`AuthenticationEntryPoint`), `BadCredentialsException`, `InvalidTokenException`.
  - `403`: đã xác thực nhưng thiếu quyền (`AccessDeniedHandler` / `PermissionAuthorizationManager`).
  - `404`: `ResourceNotFoundException`, `NoResourceFoundException`.
  - `409`: `ResourceAlreadyExistException`, `DataIntegrityViolationException` (vi phạm unique hoặc khóa ngoại).
  - `413`: `MaxUploadSizeExceededException`.
  - `500`: `Exception` chưa được xử lý riêng.

## Auth, JWT và Refresh Token

- Spring Security dùng BCrypt, JWT HS256 qua Nimbus (`JwtEncoder`/`JwtDecoder`), Bearer Resource Server và session `STATELESS`. CORS đọc danh sách origin từ `app.cors.allowed-origins` với `allowCredentials=true`.
- Access token (mặc định 15 phút) chứa `sub` (email), `userId`, `roles` (dạng `ROLE_<NAME>` đọc từ DB qua `CustomerDetailService`) và `type="access"`. `JwtDecoder` bắt buộc kiểm tra claim `type="access"` để từ chối dùng refresh token như access token.
- Refresh token (mặc định 7 ngày) chỉ lưu bản băm SHA-256 trong bảng `refresh_tokens`, truy vấn với `@Lock(LockModeType.PESSIMISTIC_WRITE)` khi refresh/logout, thực hiện rotation và revoke trong `@Transactional`. Job định kỳ `ScheduledTasks` xóa token hết hạn lúc 02:00 (`Asia/Ho_Chi_Minh`).
- Hiện tại `AuthController` đặt cookie `refresh_token` (`HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`) và hỗ trợ đọc ưu tiên từ cookie rồi fallback JSON body `RefreshTokenRequestDTO`; response `login`/`refresh` vẫn trả `refreshToken` trong JSON. Đăng ký (`POST /api/v1/auth/register`) gán Role mặc định `USER` và kiểm tra mật khẩu không vượt quá 72 byte UTF-8.
- Điểm cần chốt theo [ADR-001](decisions/001-refresh-token-strategy.md): tách hợp đồng SPA/mobile để SPA không nhận refresh token qua JSON nếu không cần, chính sách cookie/CSRF và kiểm tra giới hạn 72 byte BCrypt ở `UserRequestDTO`.

## Permission, Role và RBAC

### Permission

- Bỏ khoảng trắng hai đầu cho `name`, `apiPath`; bỏ khoảng trắng hai đầu và viết hoa `method`, `module` với `Locale.ROOT` trước khi kiểm tra trùng và lưu.
- `apiPath` giữ nguyên hoa/thường với collation `utf8mb4_0900_bin`, unique `(api_path, method)` ở MySQL và trả `409` khi trùng (kể cả ghi đồng thời qua `DataIntegrityViolationException`).
- Allowlist cho thay đổi mới: `method` gồm `GET`, `POST`, `PUT`, `PATCH`, `DELETE`; `module` gồm `AUTH`, `USER`, `COMPANY`, `PERMISSION`, `ROLE`, `FILE`; `apiPath` bắt đầu bằng `/`, từ chối URL đầy đủ, query string hoặc fragment, trả `400` nếu sai. *(Hiện mã đã chuẩn hóa trim/uppercase và unique, nhưng chưa kiểm tra allowlist và cú pháp `apiPath`.)*

### Role và RBAC

- Phân quyền thực thi ở Security Filter Chain qua `PermissionAuthorizationManager` (xem [ghi chú lựa chọn AuthorizationManager](decisions/003-authorization-permission-strategy.md)). Manager giữ cache in-memory `ROLE_<name> → List<Permission>` nạp bằng `RoleRepository.findAllWithPermissions()` và so khớp HTTP method + `apiPath` bằng `AntPathMatcher`.
- Cấu hình route trong `SecurityConfig`:
  - **Public**: `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html`, `/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/uploads/**`.
  - **Chỉ cần xác thực JWT**: `/api/v1/auth/me`, `/api/v1/dashboard`.
  - **Đi qua RBAC (`PermissionAuthorizationManager`)**: mọi request còn lại (gồm User, Company, Role, Permission, File upload). Lưu ý annotation `@SecurityRequirements` rỗng trên `POST /api/v1/users` chỉ ảnh hưởng OpenAPI và đang lệch với filter chain.
- Role sở hữu quan hệ ManyToMany LAZY tới Permission qua bảng `role_permission` (`@BatchSize(50)`, không cascade xóa Permission). Create/update Role tải và kiểm tra toàn bộ `permissionIds` trước khi gán và lưu trong cùng `@Transactional`; tập rỗng hợp lệ để gỡ toàn bộ quyền.
- Reload cache: `PermissionServiceImpl`, `RoleServiceImpl` và `DatabaseSeeder` gọi `permissionAuthorizationManager.loadCache()` sau thao tác ghi/xóa. *(Điểm cần hoàn thiện: hiện `loadCache()` chạy bên trong transaction trước khi commit; với thay đổi mới/refactor, ưu tiên đồng bộ sau commit và chốt cơ chế đa instance cũng như hiệu lực JWT khi đổi Role.)*

## Upload file (logo và avatar)

- Tách upload ảnh (`POST /api/v1/files`) và ghi Company/User thành hai bước. Upload yêu cầu Bearer JWT + quyền RBAC (`POST /api/v1/files`); đọc ảnh công khai qua `/uploads/**` được ánh xạ bởi `WebMvcConfig` tới `file:${app.upload.base-dir}/`.
- Đọc cấu hình từ `FileUploadProperties` (`app.upload.*`): thư mục gốc `./uploads`, allowlist folder `[avatars, logos]`, allowlist đuôi `[jpg, jpeg, png, gif, webp]`.
- Quy tắc an toàn đang áp dụng trong `FileServiceImpl`: kiểm tra file rỗng, tên file hợp lệ (từ chối `..`, `/`, `\`), phần mở rộng, dung lượng và chữ ký byte đầu (magic bytes) khớp định dạng ảnh; sinh tên duy nhất bằng `UUID + "." + extension` (không dùng `REPLACE_EXISTING`), đóng stream bằng try-with-resources, chuẩn hóa đường dẫn đích (`normalize()`) và kiểm tra `startsWith(...)` trước khi ghi; trả `fileUrl` dạng `/uploads/{folder}/{fileName}`.
- Điểm cần thống nhất với [ADR-002](decisions/002-file-upload-strategy.md): giới hạn dung lượng (hiện YAML là `8MB`/`10MB` và service `8242880` byte, khác `5 MiB`/`6 MiB` trong ADR), tên field response (`uploadAt` trong mã vs `uploadedAt` trong ADR), chính sách đọc công khai `/uploads/**` và vòng đời dọn file không còn được tham chiếu.

## Dữ liệu và bảo mật

- Khai báo constraint DB cho bất biến như cặp `(api_path, method)` duy nhất, tên Company/Role duy nhất, `refresh_tokens.token` duy nhất. Kiểm tra trước ở service để trả lỗi rõ, kết hợp constraint DB + `DataIntegrityViolationException → 409` khi ghi đồng thời. *(Unique `users.email` đang tạm hoãn theo ghi nhận trong [PROJECT-STATUS.md](PROJECT-STATUS.md).)*
- Flyway quản lý schema bằng SQL có phiên bản trong `src/main/resources/db/migration/` (hiện có V1–V4); Hibernate dùng `ddl-auto: validate` ở cả cấu hình chính và test. Thay đổi mapping cần migration tương ứng. Không sửa migration đã tồn tại trên môi trường dùng chung (kể cả `V2` đang rỗng); luôn thêm phiên bản mới. Xem [DATABASE.md](DATABASE.md#quy-trình-thay-đổi-schema).
- Entity mới có mapping bảng/cột rõ ràng, enum dùng `EnumType.STRING`, audit dùng `Instant` do Hibernate quản lý (`created_at`, `updated_at`) và relation mặc định LAZY khi có thể. Không thêm cascade xóa sang thực thể ở đầu kia; trước khi triển khai chính sách xóa mềm hoặc xóa dây chuyền cho bản ghi còn FK, cần chốt thiết kế riêng.
- Đọc secret và thông tin kết nối DB từ biến môi trường (`JWT_SECRET`, `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USERNAME`, `MYSQL_PASSWORD`). `DatabaseSeeder` chỉ chạy khi `app.seed.enabled=true` (mặc định `false`). Thay đổi thuật toán JWT, TTL, public routes hoặc cookie/CSRF là thay đổi riêng có test và quyết định ghi rõ.

## Kiểm thử và tài liệu

- Dưới `src/test/java/com/example/hrmanagement/`, đặt integration test HTTP trong `controller/`, unit test nghiệp vụ trong `service/`, helper trong `helper/` và cấu hình test trong `config/`. Dùng JUnit/Mockito và MockMvc. Đặt tên test theo hành vi, thêm `@DisplayName`. Bao phủ thành công, input lỗi, dữ liệu thiếu/trùng và quyền truy cập (`401`/`403`) khi áp dụng.
- `pom.xml` cấu hình `maven-dependency-plugin` và `maven-surefire-plugin` để gắn `-javaagent` cho Mockito trên Java 25.
- Integration test dùng profile `test`, MySQL 8.4 Testcontainers qua `MySqlTestConfiguration` và Docker, chạy cùng Flyway migration V1–V4 và Hibernate `validate`; không chuyển sang `update`/`create-drop` và cấm dùng H2 hoặc datasource mặc định khi Docker thiếu. Chạy `./mvnw test` khi đủ điều kiện và chỉ báo pass dựa trên kết quả chạy thực tế.
- Khi mục tiêu của integration test là xác minh commit, rollback hoặc ràng buộc FK của service, gọi service qua bean Spring hoặc qua HTTP từ bên ngoài transaction do test quản lý (ví dụ `Propagation.NOT_SUPPORTED`) và dọn dữ liệu test riêng.
- Cập nhật [API_SPEC.md](API_SPEC.md) và [DATABASE.md](DATABASE.md) theo hợp đồng đã thay đổi. Ghi `CONTEXT.md` cho module có quyết định đáng lưu và ADR cho thay đổi kiến trúc. Ghi tiến độ bằng `$update-status` khi được yêu cầu hoặc khi workflow feature cần.
