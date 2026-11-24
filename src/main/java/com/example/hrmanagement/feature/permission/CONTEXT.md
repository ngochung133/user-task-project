# Permission — ngữ cảnh triển khai

Đối chiếu tĩnh ngày 2026-11-23, HEAD `0232bac` (`project v1`). Mô tả mã và assertion trong test, không xác nhận suite hoặc HTTP/MySQL đã chạy thành công trên HEAD này. Xem [trạng thái kiểm thử](../../../../../../../../docs/PROJECT-STATUS.md).

## Mục đích

Quản lý quyền theo cặp `apiPath + method`, được Role gán và tầng security dùng để phân quyền. Điểm vào: [PermissionController](PermissionController.java) → [PermissionService](PermissionService.java) → [PermissionServiceImpl](PermissionServiceImpl.java) → [PermissionRepository](PermissionRepository.java). Package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện tại trong mã

Base path `/api/v1/permissions`, response qua [ApiResponse](../../dto/ApiResponse.java). Mọi thao tác cần Bearer JWT và Permission đúng method/path theo [SecurityConfig](../../config/SecurityConfig.java), [PermissionAuthorizationManager](../../security/PermissionAuthorizationManager.java).

| Method và path | Xử lý | Thành công theo controller |
|---|---|---|
| `POST /api/v1/permissions` | Tạo từ request hợp lệ | 201, `PermissionResponseDTO` |
| `GET /api/v1/permissions` | Lọc/phân trang | 200, `PageResponseDTO<PermissionResponseDTO>` |
| `GET /api/v1/permissions/{id}` | Tìm theo ID | 200, `PermissionResponseDTO` |
| `PUT /api/v1/permissions/{id}` | ID trên URL, cập nhật bốn field | 200, `PermissionResponseDTO` |
| `DELETE /api/v1/permissions/{id}` | Kiểm tra tồn tại, xóa và flush | 200, chuỗi `Delete successfully` trong `data` |

POST và PUT đều dùng `@Valid` với [PermissionRequestDTO](dto/PermissionRequestDTO.java), class Lombok có `name`, `apiPath`, `method`, `module`; mỗi field không trắng, tối đa 255 ký tự. PUT đã truyền `id`, không còn truyền null. [PermissionResponseDTO](dto/PermissionResponseDTO.java) là record gồm ID, bốn field trên và `createdAt/updatedAt`; timestamp cuối ánh xạ từ field entity `updateAt`.

### Chuẩn hóa, dữ liệu và lỗi

[Service](PermissionServiceImpl.java) trim name/apiPath, trim và uppercase method/module bằng `Locale.ROOT`, rồi dùng chính giá trị chuẩn hóa để kiểm tra trùng và lưu. Create dùng `existsByApiPathAndMethod`; update dùng `existsByApiPathAndMethodAndIdNot` để cho phép giữ cặp path/method của chính bản ghi. Chưa kiểm tra allowlist method/module hoặc cú pháp apiPath. Create/update/delete có transaction; get/list dùng `readOnly=true`.

[Permission](Permission.java) map `permissions`, ID long/IDENTITY, bốn cột dữ liệu không null/dài 255, unique `(api_path, method)`. Path dùng collation nhị phân `utf8mb4_0900_bin`, giữ nguyên hoa/thường; audit `Instant createdAt/updateAt` do Hibernate quản lý. [V1](../../../../../../../../src/main/resources/db/migration/V1__init_schema.sql) có unique/collation tương ứng và FK từ `role_permission`. Flyway là nguồn schema, Hibernate dùng `validate`; chưa kiểm chứng database hiện hành.

[Advice](../../exception/GlobalExceptionHandler.java) ánh xạ validation `400`, thiếu tài nguyên `404`, trùng được service phát hiện `409` và `DataIntegrityViolationException` (unique/FK) `409`. Delete không chủ động gỡ Permission khỏi Role: repository xóa/flush và dựa vào FK để từ chối khi còn liên kết. Không ghi nhận đã chốt chính sách xóa/cascade nghiệp vụ chỉ từ handler chung này.

### Tích hợp RBAC và cache

Sau `saveAndFlush` hoặc delete/flush, service gọi `PermissionAuthorizationManager.loadCache()` để tải lại quyền Role. Tầng security dùng Role authority trong JWT tra cache rồi so method và `apiPath` bằng `AntPathMatcher`; module/name chỉ là dữ liệu phân loại, không phải điều kiện cấp quyền trong manager. [Tài liệu lựa chọn AuthorizationManager](../../../../../../../../docs/decisions/003-authorization-permission-strategy.md) giải thích việc kiểm tra ở filter chain; đây không phải bằng chứng cho tính đúng của cache trong mọi tình huống.

Reload hiện diễn ra **trong transaction trước commit**, không có hook after-commit trong service. [RoleRepository.findAllWithPermissions](../role/RoleRepository.java) dùng JOIN FETCH; cache của manager là bộ nhớ trong tiến trình. Chưa xác minh tính nhất quán khi rollback, ghi đồng thời hoặc chạy nhiều instance; unit test verify việc gọi reload không chứng minh các trường hợp này.

### Lọc và phân trang

[PermissionSpecification](PermissionSpecification.java) ghép AND: name trim/lowercase rồi LIKE chứa chuỗi; method/module trim/uppercase `Locale.ROOT` rồi so bằng. Null/trắng bỏ điều kiện. [PermissionFilterDTO](dto/PermissionFilterDTO.java) chứa ba field này. [Cấu hình HTTP](../../../../../../../../src/main/resources/application.yml) đặt page từ 1, size mặc định 10, tối đa 100; [PageResponseDTO](../../dto/PageResponseDTO.java) trả `content/page/size/totalElements/totalPages/hasNext/hasPrevious`. Chưa thêm sort mặc định, tiêu chí phụ hay escape wildcard LIKE.

## Phụ thuộc

- Service tiêm PermissionRepository và PermissionAuthorizationManager; manager dùng RoleRepository để nạp quyền. [RoleServiceImpl](../role/RoleServiceImpl.java) đọc Permission để kiểm tra ID, gán và ánh xạ response; không tạo Permission thay cho module này.
- [DatabaseSeeder](../../config/DatabaseSeeder.java) có thể khởi tạo quyền và reload cache; [DashboardServiceImpl](../dashboard/DashboardServiceImpl.java) đếm Permission. DTO/exception và SecurityConfig nằm ở cấp ứng dụng.

## Giới hạn

- **Đã có test, chưa chạy lại:** [PermissionServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/PermissionServiceTest.java) dùng mock để kiểm tra chuẩn hóa, trùng, CRUD và gọi reload. [PermissionControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/PermissionControllerIntegrationTest.java) có assertion CRUD, update giữ cặp path/method, filter lowercase, validation/401/403 và xóa quyền đang gắn Role trả 409. Test HTTP có transaction của test; không chứng minh cache sau commit/rollback hoặc request ghi đồng thời. Không có báo cáo integration mới; giới hạn XML/`.txt` unit được ghi ở PROJECT-STATUS.
- **Quy ước thay đổi mới:** [PROJECT-RULES](../../../../../../../../docs/PROJECT-RULES.md#permission) yêu cầu request record, allowlist method/module và apiPath bắt đầu `/`, không URL đầy đủ/query/fragment. Hiện chỉ có chuẩn hóa và validation không trắng/độ dài; cần triển khai kiểm tra này khi được giao. Seed có module `FILE` ngoài allowlist quy ước, cần chốt trước phần phụ thuộc. Entity còn setter/constructor công khai, chưa theo đầy đủ quy ước mới.
- **Cần chốt/kiểm chứng:** sort ổn định, xung đột ghi đồng thời, xóa quyền đang liên kết, cache với giao dịch và nhiều instance. [API_SPEC](../../../../../../../../docs/API_SPEC.md) còn đặt Permission trong nhóm đích, [ARCHITECTURE](../../../../../../../../docs/ARCHITECTURE.md) còn mô tả chưa có RBAC; [DATABASE](../../../../../../../../docs/DATABASE.md) ghi schema V1 nhưng không xác nhận DB đang chạy. Không dùng các mô tả cũ thay cho hợp đồng hiện tại ở trên.

## Refactor Log

- **2026-11-10:** Tạo `CONTEXT.md` từ mã nguồn tại HEAD `7189352`, đối chiếu với [PROJECT-RULES.md](../../../../../../../../docs/PROJECT-RULES.md), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md), [DATABASE.md](../../../../../../../../docs/DATABASE.md) và [PROJECT-STATUS.md](../../../../../../../../docs/PROJECT-STATUS.md). Ghi nhận hợp đồng đang chạy, hai lỗi ở luồng `PUT` và các yêu cầu chuẩn hóa/kiểm thử còn mở.
- **2026-11-23:** Đồng bộ PUT dùng ID URL và `@Valid`, chuẩn hóa/kiểm tra trùng, transaction, filter uppercase và reload cache RBAC. Ghi rõ thiếu allowlist/cú pháp path và chưa kiểm chứng cache sau commit/rollback. Đối chiếu tĩnh HEAD `0232bac`, mã/test, API/schema và ADR liên quan; giữ mục lịch sử 2026-11-10. Chỉ cập nhật CONTEXT, không sửa source hoặc chạy build/test/HTTP.
