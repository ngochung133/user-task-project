# User — ngữ cảnh triển khai

Đối chiếu tĩnh ngày 2026-11-23, HEAD `0232bac` (`project v1`). Nội dung mô tả mã và assertion trong test, không xác nhận đã chạy thành công trên HEAD này. Xem [bằng chứng kiểm thử và trạng thái mới nhất](../../../../../../../../docs/PROJECT-STATUS.md).

## Mục đích

Quản lý nhân sự/tài khoản, thông tin profile, Company và các Role; cung cấp dữ liệu người dùng cho Auth. Điểm vào: [UserController](UserController.java) → [UserService](UserService.java) → [UserServiceImpl](UserServiceImpl.java) → [UserRepository](UserRepository.java). Package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện tại trong mã

Base path `/api/v1/users`. Tất cả thao tác đi qua Bearer JWT và phân quyền method/path của [SecurityConfig](../../config/SecurityConfig.java), [PermissionAuthorizationManager](../../security/PermissionAuthorizationManager.java); không có ngoại lệ public cho POST User. `@SecurityRequirements` rỗng trên POST chỉ mô tả OpenAPI và hiện lệch với filter chain.

| Method và path | Xử lý | Thành công theo controller |
|---|---|---|
| `GET /api/v1/users` | Lọc và phân trang | 200, `PageResponseDTO<UserResponseDTO>` |
| `GET /api/v1/users/{id}` | Tìm theo ID | 200, `UserResponseDTO` |
| `POST /api/v1/users` | Nhận `@Valid UserRequestDTO`, tạo User | 201, `UserResponseDTO` |
| `PUT /api/v1/users/{id}` | ID trên URL, cùng request DTO như POST | 200, `UserResponseDTO` |
| `DELETE /api/v1/users/{id}` | Kiểm tra tồn tại rồi xóa | 200, chuỗi `Delete Success` trong `data` |

Response dùng [ApiResponse](../../dto/ApiResponse.java). Advice ánh xạ validation `400`, không tồn tại `404`, email đã được kiểm tra là trùng `409`, lỗi ràng buộc DB `409`; filter chain xử lý thiếu/sai JWT `401`, thiếu Permission `403`. Đây là các nhánh xử lý trong [advice](../../exception/GlobalExceptionHandler.java) và SecurityConfig, chưa phải bằng chứng HTTP mới.

### Request, response và cập nhật

[UserRequestDTO](dto/UserRequestDTO.java) là class Lombok, gồm `name`, `email`, `password`, `age`, `avatar`, `gender`, `companyId`, **`roleIDs`**, `address`. Tên JSON là `roleIDs`, không phải `roleIds`. Name không trắng, dài 2–100; email không trắng và đúng định dạng; password không trắng, tối thiểu 6 ký tự; address không trắng. Age có thể null, nếu có phải 1–150. `roleIDs` không null, từng ID không null và dương; tập rỗng hợp lệ. Company/avatar/gender có thể null theo DTO.

[Service](UserServiceImpl.java) kiểm tra email bằng `existsByEmail` khi tạo và `existsByEmailAndIdNot` khi sửa để cho phép giữ email của chính bản ghi. Mật khẩu luôn được băm lại qua `PasswordEncoder`, kể cả PUT. Không trim/chuẩn hóa email trong service. Mọi Role ID phải tồn tại trước khi lưu; Company ID khác null phải tìm được, nếu thiếu trả lỗi tài nguyên không tồn tại. Tập Role được thay toàn bộ; tập rỗng xóa liên kết Role. Khi tạo, `companyId=null` không gán Company; khi sửa, null **giữ Company hiện tại**, chưa có thao tác gỡ Company bằng request này. Update gán Company trước bước kiểm tra Role, nên cần transaction để rollback nếu Role thiếu sau đó.

[UserResponseDTO](dto/UserResponseDTO.java) là record với `id`, `name`, `email`, `age`, `address`, `gender`, `avatar`, `companyInfo` (`id`, `name`) và `roleInfo` (tập `id`, `name`). `fromEntity()` ánh xạ trong service, không trả password hoặc audit timestamp. Không còn mapper riêng. Các phương thức ghi có `@Transactional`; list/get dùng `readOnly=true` để ánh xạ quan hệ trong transaction.

### Bộ lọc và mapping

[UserFilterDTO](dto/UserFilterDTO.java) và [UserSpecification](UserSpecification.java) ghép AND: name/email chứa chuỗi không phân biệt hoa/thường sau trim; age so bằng; minAge/maxAge là biên bao gồm; gender so enum. Converter query gender trim và uppercase với `Locale.ROOT` (ví dụ `male` → `MALE`); không suy từ đó rằng JSON body cũng có converter tương tự. Tham số không có giá trị bỏ điều kiện tương ứng.

[PageResponseDTO](../../dto/PageResponseDTO.java) trả `content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`; page trả ra từ 1. [Cấu hình HTTP](../../../../../../../../src/main/resources/application.yml) đặt page từ 1, size mặc định 10, tối đa 100. Service chuyển `Pageable` trực tiếp tới repository, chưa thêm sort mặc định/tiêu chí phụ.

[User](User.java) map `users`, ID Long/IDENTITY, gender lưu chuỗi enum, Company ManyToOne LAZY qua `company_id` và sở hữu ManyToMany `user_role`. Relation Role không khai báo fetch nên dùng mặc định ManyToMany; không khai báo cascade REMOVE. Audit `Instant createdAt/updateAt` do Hibernate quản lý. [V1](../../../../../../../../src/main/resources/db/migration/V1__init_schema.sql) tạo FK Company, hai FK của `user_role` nhưng chưa có PK/unique cho cặp ID; [V3](../../../../../../../../src/main/resources/db/migration/V3__add_users_audit_columns.sql) bổ sung audit nullable. Email chưa có unique constraint trong mapping/migration. Flyway quản lý schema, Hibernate chỉ `validate`; chưa kiểm chứng DB đang chạy.

## Phụ thuộc

- Service dùng CompanyRepository, RoleRepository, UserRepository và PasswordEncoder; dùng DTO/exception chung. Company/Role phải tồn tại khi được tham chiếu.
- [CustomerDetailService](../../security/CustomerDetailService.java) đọc email/password và sinh authority từ Role dữ liệu. [AuthServiceImpl](../auth/AuthServiceImpl.java) dùng UserRepository cho register/login/refresh; register là luồng riêng, mặc định Role `USER` và có validation password khác UserRequestDTO.
- [DashboardServiceImpl](../dashboard/DashboardServiceImpl.java) đếm User; [RefreshToken](../auth/RefreshToken.java) tham chiếu User qua FK ở [V4](../../../../../../../../src/main/resources/db/migration/V4__create_refresh_tokens.sql).

## Giới hạn

- **Đã có test, chưa chạy lại:** [UserServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/UserServiceTest.java) mock repository/encoder để kiểm tra CRUD, email trùng, Role thiếu và ánh xạ; [UserControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java) có assertion CRUD, validation, hash/ẩn password và từ chối thiếu JWT. HTTP test dùng profile test/MySQL Testcontainers và transaction của test; không chứng minh riêng commit/rollback của service khi kiểm tra trạng thái trong cùng transaction. Chưa có kết quả integration mới; báo cáo XML và `.txt` có sẵn không thống nhất số lượng, xem PROJECT-STATUS.
- **Cần kiểm chứng/chốt:** email duy nhất khi ghi đồng thời (nhiệm vụ constraint vẫn hoãn); cập nhật/gỡ Company, rollback khi thiếu Role và xóa User còn refresh token; quyền gán Role và hiệu lực thay Role với JWT đã cấp. UserService không chủ động thu hồi token khi cập nhật/xóa User. Request quản trị User chưa kiểm tra giới hạn 72 byte BCrypt như [RegisterRequest](../auth/dto/RegisterRequest.java).
- **Quy ước thay đổi mới:** theo [PROJECT-RULES](../../../../../../../../docs/PROJECT-RULES.md) về DTO record, entity hạn chế setter, transaction, constraint DB và sort ổn định. Class request/entity hiện hữu chưa theo đầy đủ quy ước này. [API_SPEC](../../../../../../../../docs/API_SPEC.md) và [ARCHITECTURE](../../../../../../../../docs/ARCHITECTURE.md) còn mô tả `/users`, mapper và role cố định; [DATABASE](../../../../../../../../docs/DATABASE.md) chủ yếu mô tả V1. Đây là tài liệu lệch mã, không lấy hợp đồng cũ làm hành vi hiện hành; thay đổi phần phụ thuộc cần chốt riêng.

## Refactor Log

- **2026-11-10:** Tạo `CONTEXT.md` từ mã nguồn và bộ test tại HEAD `7189352`, đối chiếu với [UserServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/UserServiceTest.java), [UserControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md) và [DATABASE.md](../../../../../../../../docs/DATABASE.md). Ghi nhận hợp đồng baseline đang chạy và các điểm cần chốt trước khi nâng cấp lên User HR đích.
- **2026-11-23:** Đồng bộ route `/api/v1/users`, request `roleIDs`, response lồng Company/Role, transaction, bộ lọc và RBAC với mã hiện có; bỏ mô tả mapper/public POST đã cũ. Ghi rõ email chưa có constraint, Company null giữ nguyên khi update và giới hạn kiểm chứng test. Đối chiếu tĩnh HEAD `0232bac`, mã/test, API/schema và ADR liên quan; giữ mục lịch sử 2026-11-10. Chỉ cập nhật CONTEXT, không sửa source hoặc chạy build/test/HTTP.
