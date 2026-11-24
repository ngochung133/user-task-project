# Role — ngữ cảnh triển khai

Đối chiếu tĩnh ngày 2026-11-23, HEAD `0232bac` (`project v1`). Mô tả mã và assertion trong test, chưa xác nhận suite hoặc HTTP/MySQL thành công trên HEAD này. Xem [trạng thái kiểm thử](../../../../../../../../docs/PROJECT-STATUS.md).

## Mục đích

Quản lý Role và toàn bộ tập Permission gán cho Role, cung cấp Role để User tham chiếu và security phân quyền. Điểm vào: [RoleController](RoleController.java) → [RoleService](RoleService.java) → [RoleServiceImpl](RoleServiceImpl.java) → [RoleRepository](RoleRepository.java). Package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện tại trong mã

Base path `/api/v1/roles`, response qua [ApiResponse](../../dto/ApiResponse.java). Mọi thao tác cần Bearer JWT và Permission đúng method/path theo [SecurityConfig](../../config/SecurityConfig.java), [PermissionAuthorizationManager](../../security/PermissionAuthorizationManager.java); tên Role `ADMIN` tự nó không tạo ngoại lệ bỏ qua kiểm tra Permission trong manager.

| Method và path | Xử lý | Thành công theo controller |
|---|---|---|
| `POST /api/v1/roles` | Tạo Role, gán Permission | 201, `RoleResponseDTO` |
| `GET /api/v1/roles` | Lọc/phân trang | 200, `PageResponseDTO<RoleResponseDTO>` |
| `GET /api/v1/roles/{id}` | Tìm theo ID | 200, `RoleResponseDTO` |
| `PUT /api/v1/roles/{id}` | ID trên URL, thay name/description và toàn bộ quyền | 200, `RoleResponseDTO` |
| `DELETE /api/v1/roles/{id}` | Kiểm tra tồn tại, xóa và flush | 200, chuỗi `Delete successfully` trong `data` |

[RoleRequestDTO](dto/RoleRequestDTO.java) là record chung POST/PUT. Name/description không trắng, tối đa 255 ký tự; `permissionIds` không null, từng ID không null và dương; tập rỗng hợp lệ. Cả POST/PUT dùng `@Valid`. [RoleResponseDTO](dto/RoleResponseDTO.java) gồm `id`, `name`, `description`, **`permissions`** (danh sách PermissionResponseDTO), `createdAt`, `updatedAt`; không còn field viết sai `permisisons`. Timestamp cuối lấy từ entity `updateAt`. Danh sách quyền chưa được sắp xếp.

### Kiểm tra ID và transaction

[Service](RoleServiceImpl.java) kiểm tra tên bằng `existsByName` khi tạo, `existsByNameAndIdNot` khi cập nhật để cho phép giữ tên chính bản ghi. Không trim/chuẩn hóa tên hoặc mô tả trước lưu. Cả create/update tải Permission bằng `findAllById`, trừ ID tìm thấy khỏi tập yêu cầu, nếu còn ID thiếu thì ném `ResourceNotFoundException` **trước khi gán field và lưu Role**. Sau đó gán `new HashSet<>(permissions)`; PUT với tập rỗng xóa toàn bộ liên kết quyền, không yêu cầu xóa Permission.

Create/update dùng `saveAndFlush`; delete dùng `deleteById` rồi `flush`. Các phương thức ghi có `@Transactional`, get/list dùng `readOnly=true` để ánh xạ quan hệ LAZY trong service. [Advice](../../exception/GlobalExceptionHandler.java) trả `400` cho validation, `404` khi thiếu Role/Permission, `409` cho trùng tên đã phát hiện và lỗi ràng buộc DB; filter chain xử lý `401/403`.

### Mapping, User và cache

[Role](Role.java) map `roles`, Long/IDENTITY, unique tên, name/description không null/dài 255; audit `Instant createdAt/updateAt` do Hibernate quản lý. Role sở hữu ManyToMany LAZY `role_permission` với `@BatchSize(50)`, không cascade REMOVE sang Permission. [V1](../../../../../../../../src/main/resources/db/migration/V1__init_schema.sql) tạo unique tên, hai FK và PK ghép của bảng nối. Bảng Role dùng collation `utf8mb4_0900_ai_ci`, nên phạm vi unique còn phụ thuộc so sánh hoa/thường/dấu tại DB. Chưa xác minh migration/schema đang chạy.

[User](../user/User.java) sở hữu liên kết `user_role` tới Role. Service Role không chủ động gỡ Role khỏi User trước xóa; FK V1 không có ON DELETE CASCADE và advice chung ánh xạ vi phạm FK thành 409. [CustomerDetailService](../../security/CustomerDetailService.java) sinh authority `ROLE_` + tên Role; [AuthServiceImpl](../auth/AuthServiceImpl.java) đặt danh sách Role vào JWT, register tìm Role `USER` trong DB.

Service gọi `PermissionAuthorizationManager.loadCache()` sau mỗi ghi/flush nhưng **trước khi transaction commit**. [RoleRepository.findAllWithPermissions](RoleRepository.java) dùng `JOIN FETCH r.permissions` để nạp Role có quyền cho cache theo tên authority; Role không có Permission không xuất hiện trong kết quả join này. Cache trong tiến trình không thay Role claim của token đã cấp; service không chủ động thu hồi JWT khi đổi tên/quyền/xóa Role. Tính nhất quán cache khi rollback/ghi đồng thời và thời điểm quyền mới có hiệu lực cần kiểm chứng/chốt. [Tài liệu lựa chọn AuthorizationManager](../../../../../../../../docs/decisions/003-authorization-permission-strategy.md) ghi lý do đặt kiểm tra method/path trong filter chain, không thay thế các kiểm chứng này.

### Bộ lọc và phân trang

[RoleFilterDTO](dto/RoleFilterDTO.java)/[RoleSpecification](RoleSpecification.java) ghép AND: name trim rồi so bằng; description trim/lowercase rồi LIKE chứa chuỗi (chưa chỉ định `Locale.ROOT`, chưa escape wildcard); mỗi Permission ID tạo một join và predicate để yêu cầu có đủ các ID đó. Tập ID rỗng/null bỏ lọc, không có nghĩa yêu cầu Role không quyền. Chưa kiểm chứng count/phân trang khi join nhiều ID.

[Cấu hình HTTP](../../../../../../../../src/main/resources/application.yml) đặt page từ 1, size mặc định 10, tối đa 100. [PageResponseDTO](../../dto/PageResponseDTO.java) trả `content/page/size/totalElements/totalPages/hasNext/hasPrevious`; service chưa thêm sort mặc định/tiêu chí phụ.

## Phụ thuộc

- Service tiêm RoleRepository, PermissionRepository và PermissionAuthorizationManager. [PermissionServiceImpl](../permission/PermissionServiceImpl.java) cũng reload cache khi thay đổi quyền, dùng RoleRepository gián tiếp qua manager.
- [UserServiceImpl](../user/UserServiceImpl.java) kiểm tra và gán Role; Auth dùng Role cho register và token; [DatabaseSeeder](../../config/DatabaseSeeder.java) khởi tạo Role khi bật seed, [DashboardServiceImpl](../dashboard/DashboardServiceImpl.java) đếm Role. DTO/exception/security chung nằm ở cấp ứng dụng.

## Giới hạn

- **Đã có test, chưa chạy lại:** [RoleServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/RoleServiceTest.java) mock repository/manager cho CRUD, trùng tên, create thiếu ID, cập nhật quyền và gọi reload. [RoleControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/RoleControllerIntegrationTest.java) có assertion GET theo ID, field `permissions`, thay tập quyền rỗng, xóa không xóa Permission, create thiếu ID không thêm Role và 400/409/401/403. Các case chạy trong transaction do test quản lý; không chứng minh riêng commit/rollback, update với ID thiếu hoặc hiệu lực cache sau commit. Chưa có báo cáo integration mới; xem PROJECT-STATUS về lệch XML/`.txt` unit.
- **Cần chốt/kiểm chứng:** unique/chuẩn hóa tên, sort ổn định và filter nhiều Permission; xóa Role còn User; quyền gán Role và tác động đổi tên/quyền tới JWT đang còn hạn; cache với transaction và nhiều instance. Không coi verify `loadCache()` trong unit test là bằng chứng phân quyền đã đúng sau commit/rollback.
- **Quy ước thay đổi mới:** theo [PROJECT-RULES](../../../../../../../../docs/PROJECT-RULES.md) về DTO/entity, constraint/migration và MySQL Testcontainers. Entity Role hiện dùng setter/constructor công khai, chưa theo đầy đủ quy ước entity mới. [API_SPEC](../../../../../../../../docs/API_SPEC.md) còn đặt Role trong nhóm đích, [ARCHITECTURE](../../../../../../../../docs/ARCHITECTURE.md) còn mô tả chưa có RBAC; [DATABASE](../../../../../../../../docs/DATABASE.md) mô tả V1 và thiết kế đích. Dùng mã để biết hiện trạng, chốt thay đổi hợp đồng riêng trước phần phụ thuộc.

## Refactor Log

- **2026-11-10:** Tạo context từ mã Role tại commit `7189352`, đối chiếu API/schema, ADR-003 và cây test. Ghi lại hợp đồng hiện tại, kiểm tra đủ Permission trước khi ghi, quyền sở hữu bảng nối và các phần còn mở. Chỉ thêm tài liệu; không thay đổi hành vi hoặc chạy Maven/HTTP/MySQL trong phiên này.
- **2026-11-23:** Đồng bộ GET theo ID, response `permissions`, giới hạn request 255 ký tự, User–Role, RBAC và test đã thêm. Giữ riêng kiểm tra ID trước lưu với bằng chứng commit/rollback còn thiếu và cache reload trước commit. Đối chiếu tĩnh HEAD `0232bac`, mã/test, API/schema và ADR liên quan; giữ mục lịch sử 2026-11-10. Chỉ cập nhật CONTEXT, không sửa source hoặc chạy build/test/HTTP.
