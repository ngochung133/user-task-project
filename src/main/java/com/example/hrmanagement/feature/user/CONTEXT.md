# User — ngữ cảnh triển khai

Đối chiếu ngày 2026-11-10, HEAD `7189352` (`Role`). Nội dung dưới đây được xác nhận bằng mã nguồn, 10 unit test và 15 HTTP integration test của module User.

## Mục đích

Quản lý tài khoản người dùng cơ bản (`name`, `email`, `password`, `address`) và cung cấp dữ liệu xác thực cho đăng nhập JWT. Đây là module baseline ban đầu của repo, chưa nâng cấp lên hợp đồng HR đích (`/api/v1/users`, phân trang, quan hệ `Company` và `Role`).

Điểm vào: [UserController](UserController.java) → [UserService](UserService.java) → [UserServiceImpl](UserServiceImpl.java) → [UserRepository](UserRepository.java). Bố cục package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện có trong mã và test

Các endpoint giữ đường dẫn gốc `/users` (chưa dùng tiền tố `/api/v1`), bọc kết quả bằng [ApiResponse](../../dto/ApiResponse.java). Theo [SecurityConfig](../../config/SecurityConfig.java#L65-L67), `POST /users` được mở `permitAll()` (và gắn `@SecurityRequirements` rỗng để đánh dấu public trên OpenAPI), còn `GET /users`, `PUT /users/{id}`, `DELETE /users/{id}` yêu cầu Bearer JWT (`anyRequest().authenticated()`).

| Method và path | Quyền truy cập | Xử lý hiện tại | Thành công |
|---|---|---|---|
| `GET /users` | Bearer JWT | Trả toàn bộ danh sách người dùng (`findAll`), chưa phân trang. | 200, `List<UserResponseDTO>` |
| `POST /users` | Public | Nhận trực tiếp `@Valid User`, kiểm tra trùng email, gán `id = null`, băm mật khẩu bằng BCrypt rồi lưu. | 201, `UserResponseDTO` |
| `PUT /users/{id}` | Bearer JWT | Nhận `id` trên path và `@Valid User`; kiểm tra trùng email nếu đổi email, băm lại mật khẩu và cập nhật cả 4 trường. | 200, `UserResponseDTO` |
| `DELETE /users/{id}` | Bearer JWT | Tìm User theo `id` trước khi gọi `deleteById`. | 200, `data` là `Delete Success` |

Nguồn xác nhận: [UserController](UserController.java), [UserServiceImpl](UserServiceImpl.java), [UserServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/UserServiceTest.java), [UserControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java), [OpenApiIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/OpenApiIntegrationTest.java#L35).

### DTO, bảo mật mật khẩu và kiểm tra email

- **Request và Entity:** `POST /users` và `PUT /users/{id}` hiện nhận trực tiếp entity [User](User.java) làm `@RequestBody`. Validation đặt thẳng trên entity:
  - `name`: `@NotBlank`, `@Size(min = 2, max = 100)`.
  - `email`: `@NotBlank`, `@Email`.
  - `password`: `@NotBlank`, `@Size(min = 6)`.
  - `address`: `@NotBlank`.
  - Trong `dto/` có sẵn class [UserRequestDTO](dto/UserRequestDTO.java) (chỉ chứa `email` và `password`), nhưng hiện không có caller nào trong mã nguồn hay test sử dụng.
- **Ẩn mật khẩu ở đầu ra:** [UserMapper](UserMapper.java) chuyển `User` sang [UserResponseDTO](dto/UserResponseDTO.java) chỉ gồm `id`, `name`, `email`, `address` (không chứa `password`). Integration test xác nhận `$.data.password` không tồn tại trong JSON trả về và mật khẩu lưu trong DB là chuỗi đã mã hóa BCrypt ([UserControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java#L103-L112)).
- **Kiểm tra trùng email:**
  - Khi tạo: `existsByEmail` ném `ResourceAlreadyExistException("Người dùng", "Email", ...)` (`409`).
  - Khi sửa: kiểm tra `!userInDB.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(user.getEmail())`, cho phép người dùng giữ nguyên email của chính mình khi cập nhật ([UserServiceImpl](UserServiceImpl.java#L45-L47), xác nhận tại [UserControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java#L292-L327)).

### Mapping DB hiện tại

[User](User.java) map bảng `users` với `id` kiểu `Long` (`GenerationType.IDENTITY`) và 4 cột `name`, `email`, `password`, `address`. Entity hiện chưa khai báo `@Column(unique = true)` hoặc `@UniqueConstraint` cho `email`, chưa có `createdAt`/`updatedAt` và chưa có khóa ngoại/bảng nối tới `Company` hay `Role` ([DATABASE.md](../../../../../../../../docs/DATABASE.md#hiện-trạng-từ-mapping-jpa)).

## Phụ thuộc

- Không phụ thuộc feature nghiệp vụ nào khác trong `feature/`.
- Được [CustomerDetailService](../../security/CustomerDetailService.java) (tầng `security/`) gọi qua `UserRepository.findByEmail(email)` để nạp thông tin đăng nhập cho [AuthController](../auth/AuthController.java) (hiện gán cố định role `USER`).
- Spring MVC, Spring Security (`PasswordEncoder`), Jakarta Validation, Spring Data JPA; [ApiResponse](../../dto/ApiResponse.java) và các exception dùng chung ở `exception/`.

## Giới hạn

- **Khoảng cách so với quy ước và hợp đồng HR đích ([PROJECT-RULES.md](../../../../../../../../docs/PROJECT-RULES.md), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md#api-hr-đích), [DATABASE.md](../../../../../../../../docs/DATABASE.md#mô-hình-hr-đích)):**
  - Controller còn nhận trực tiếp entity `User` thay vì tách request `record` riêng cho create/update; `PUT /users/{id}` hiện bắt buộc gửi lại cả `email` và `password`.
  - Route vẫn ở `/users`, chưa chuyển sang `/api/v1/users`; chưa có `GET /api/v1/users/{id}`, chưa có phân trang (`Pageable`/`PageResponseDTO`) và bộ lọc.
  - `POST /users` đang mở public; theo roadmap cần tách luồng đăng ký khỏi tạo nhân sự do admin quản trị và chốt các trường được phép sửa trước khi thay đổi `update`.
  - Phương thức ghi trong `UserServiceImpl` chưa đặt `@Transactional`.
  - Bảng `users` chưa có unique constraint cho `email` ở mức DB (mới kiểm tra bằng `existsByEmail` trong ứng dụng), chưa có `createdAt`/`updatedAt` kiểu `Instant`, và chưa nối quan hệ `ManyToOne` với [Company](../company/Company.java) (`companyId`) hay `ManyToMany` với [Role](../role/Role.java) (`user_role` / `roleIds`).
- Các thay đổi liên quan đến route `/users`, chính sách public/admin của `POST /users`, trường được sửa trong `PUT` và migration unique `email` đều ảnh hưởng tới bộ 25 test User + 3 test Auth + 1 test OpenAPI hiện có, nên cần chốt hợp đồng trước khi thực hiện.

## Refactor Log

- **2026-11-10:** Tạo `CONTEXT.md` từ mã nguồn và bộ test tại HEAD `7189352`, đối chiếu với [UserServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/UserServiceTest.java), [UserControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md) và [DATABASE.md](../../../../../../../../docs/DATABASE.md). Ghi nhận hợp đồng baseline đang chạy và các điểm cần chốt trước khi nâng cấp lên User HR đích.
