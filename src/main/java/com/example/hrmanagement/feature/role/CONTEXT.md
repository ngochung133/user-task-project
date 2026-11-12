# Role — ngữ cảnh triển khai

Đối chiếu ngày 2026-11-10, HEAD `7189352` (`Role`). Nội dung dưới đây được xác nhận bằng mã nguồn; chưa chạy kiểm thử Role qua HTTP/MySQL.

## Mục đích

Quản lý Role và tập Permission được gán cho Role. Module hiện có tạo, cập nhật, xóa và list có lọc/phân trang. Việc lưu liên kết Role–Permission chưa được tích hợp vào phân quyền của ứng dụng.

Điểm vào: [RoleController](RoleController.java) → [RoleService](RoleService.java) → [RoleServiceImpl](RoleServiceImpl.java) → [RoleRepository](RoleRepository.java). Bố cục package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện có trong mã

Các endpoint dùng `/api/v1/roles`, bọc kết quả bằng [ApiResponse](../../dto/ApiResponse.java). [SecurityConfig](../../config/SecurityConfig.java) áp dụng `anyRequest().authenticated()` cho Role, chưa kiểm tra quyền quản trị hoặc Permission.

| Method và path | Xử lý hiện tại | Thành công |
|---|---|---|
| `POST /api/v1/roles` | Nhận `RoleRequestDTO`, kiểm tra tên trùng và Permission ID trước khi tạo. | 201, `RoleResponseDTO` |
| `PUT /api/v1/roles/{id}` | Dùng ID trên URL; thay name, description và toàn bộ tập Permission. | 200, `RoleResponseDTO` |
| `DELETE /api/v1/roles/{id}` | Tìm Role trước khi gọi `deleteById`. | 200, `data` là `Delete successfully` |
| `GET /api/v1/roles` | Nhận `Pageable` và `RoleFilterDTO`, trả trang Role. | 200, `PageResponseDTO<RoleResponseDTO>` |

Chưa có `GET /api/v1/roles/{id}`. Nguồn: [controller](RoleController.java).

- [RoleRequestDTO](dto/RoleRequestDTO.java) là record dùng chung cho create/update. `name`, `description` có `@NotBlank`; `permissionIds` là `Set<@Positive @NotNull Long>` với `@NotNull` trên tập. Tập rỗng hợp lệ, thiếu/null tập không hợp lệ. DTO chưa có `@Size`, mặc dù cột name/description giới hạn 255 ký tự. Cả POST và PUT dùng `@Valid`.
- [RoleResponseDTO](dto/RoleResponseDTO.java) có `id`, `name`, `description`, **`permisisons`**, `createdAt`, `updatedAt`. `permisisons` là tên viết sai đang tồn tại trong record, chứa danh sách `PermissionResponseDTO`, không chỉ ID. `fromEntity()` đọc quan hệ Permission và lấy `role.getUpdateAt()` cho `updatedAt`. Chưa có bước sắp xếp danh sách quyền.
- [PageResponseDTO](../../dto/PageResponseDTO.java) trả `content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`; page trả ra bắt đầu từ 1. [Cấu hình HTTP](../../../../../../../../src/main/resources/application.yml) dùng page bắt đầu từ 1, size mặc định 10, tối đa 100. Role chưa tự đặt sort mặc định hoặc tiêu chí phụ.
- [GlobalExceptionHandler](../../exception/GlobalExceptionHandler.java) ánh xạ validation thành 400, `ResourceNotFoundException` thành 404 và `ResourceAlreadyExistException` thành 409. Đây là luồng xử lý theo mã, chưa phải kết quả HTTP Role đã chạy.

### Kiểm tra đầy đủ Permission trước khi ghi

[RoleServiceImpl](RoleServiceImpl.java) dùng constructor injection qua `@RequiredArgsConstructor`, với hai dependency `final`: `RoleRepository` và `PermissionRepository`.

- Create kiểm tra `existsByName`; update tìm Role rồi kiểm tra `existsByNameAndIdNot`, cho phép giữ tên của chính bản ghi nếu không trùng Role khác.
- Cả hai tải Permission bằng `findAllById`, sao chép ID yêu cầu vào `HashSet`, rồi loại các ID tìm thấy. Nếu còn ID thiếu, ném `ResourceNotFoundException` trước khi gán field và lưu Role. Create hiện viết tên tài nguyên lỗi là `Permisison`; update dùng `Permission`.
- Khi đủ ID, service gán `new HashSet<>(permissions)` và `saveAndFlush`. Cách thay thế tập thể hiện PUT thay toàn bộ quyền; truyền tập rỗng sẽ gán tập quyền rỗng.
- Create/update/delete có `@Transactional`; list có `@Transactional(readOnly = true)`. Mapping response diễn ra trong phương thức service, nên có phạm vi transaction để đọc collection LAZY. Transaction và thứ tự kiểm tra nhằm giữ thao tác gán quyền trong cùng giao dịch; commit/rollback thực tế chưa có test xác nhận.

### Mapping và chiều sở hữu quan hệ

[Role](Role.java) map bảng `roles`: ID `Long`/IDENTITY; name, description không null, dài tối đa 255; unique constraint trên name. `createdAt` dùng `@CreationTimestamp`, field **`updateAt`** dùng `@UpdateTimestamp`, cả hai là `Instant`.

Role sở hữu `@ManyToMany(fetch = LAZY)` qua `role_permission`, cột `role_id` và `permission_id` được khai báo không null. Collection là `Set<Permission>`, khởi tạo bằng `HashSet`, có `@BatchSize(size = 50)`. Mapping không khai báo cascade REMOVE; thao tác Role không chủ động xóa Permission ở đầu kia. Chưa kiểm chứng SQL xóa bảng nối, FK hoặc khóa ghép trên database thật; không suy ra schema hiện hành chỉ từ annotation.

### Bộ lọc

[RoleFilterDTO](dto/RoleFilterDTO.java) nhận name, description và tập permissionIds. [RoleSpecification](RoleSpecification.java) kết hợp các điều kiện bằng AND:

- Name: bỏ khoảng trắng hai đầu rồi so bằng; không chuẩn hóa hoa/thường trong Java, kết quả còn phụ thuộc collation DB.
- Description: lowercase và trim đầu vào, so LIKE với `%giá trị%` trên `lower(description)`. Chưa escape ký tự wildcard `%`/`_`, và `toLowerCase()` chưa chỉ định locale.
- Permission IDs: null/rỗng bỏ điều kiện. Mỗi ID tạo một join `permissions` và điều kiện bằng, rồi AND các điều kiện để yêu cầu đủ các quyền đó; không yêu cầu tập quyền của Role chỉ có các ID này. Chưa kiểm chứng SQL, count và phân trang khi lọc nhiều ID.

## Phụ thuộc

- Module Permission: [Permission](../permission/Permission.java), [PermissionRepository](../permission/PermissionRepository.java) và [PermissionResponseDTO](../permission/dto/PermissionResponseDTO.java). Role tham chiếu dữ liệu Permission hiện có, không tự tạo Permission.
- Spring MVC, Jakarta Validation, Spring Data JPA/Specification, transaction của Spring và Hibernate/MySQL; DTO phân trang, envelope và exception dùng chung ở cấp ứng dụng.
- Quy tắc thay đổi mới: [PROJECT-RULES](../../../../../../../../docs/PROJECT-RULES.md). Hợp đồng/schema đích: [API_SPEC](../../../../../../../../docs/API_SPEC.md), [DATABASE](../../../../../../../../docs/DATABASE.md). Hai tài liệu này vẫn đặt Role trong phần đích; phần hiện trạng ở đây phản ánh mã đã có, chưa xác nhận đã hoàn tất thiết kế đích.

## Giới hạn

- Chưa có test Role trong [cây test](../../../../../../../../src/test/java/com/example/hrmanagement/). Không dùng kết quả User/Auth/OpenAPI để kết luận Role hoạt động đúng.
- Chưa chuẩn hóa name/description trước khi lưu; unique tên có trong mapping nhưng phạm vi duy nhất, chính sách hoa/thường/khoảng trắng chưa được chốt trong tài liệu. Chưa có xử lý riêng vi phạm unique constraint khi ghi đồng thời; advice hiện bắt lỗi chung thành 500.
- Entity hiện dùng setter và constructor Lombok công khai; chưa theo quy ước mới về constructor JPA protected và phương thức nghiệp vụ. Đây là hiện trạng cần lưu ý khi sửa, không phải ngoại lệ quy ước đã được duyệt.
- Chưa có GET theo ID, sort ổn định, allowlist sort hoặc giới hạn độ dài request phù hợp với cột DB. Cần chốt tên field response `permisisons` trước khi đổi vì ảnh hưởng hợp đồng JSON.
- Chưa có User–Role hoặc kiểm tra quyền theo dữ liệu. Chính sách xóa Permission đang được Role tham chiếu chưa được xử lý trong module Permission. Các nội dung này còn cần thiết kế/triển khai riêng.
- Khi được giao bổ sung test, cần kiểm tra ID Permission thiếu khiến toàn bộ create/update thất bại; update thay thế/xóa tập quyền không xóa Permission; trùng tên; validation; xóa Role; lọc nhiều quyền và phân trang. Kiểm tra commit/rollback qua HTTP hoặc bean Spring ngoài transaction do test quản lý, dùng MySQL Testcontainers theo quy ước repo. Đây là phạm vi kiểm thử dự kiến, chưa có kết quả chạy.

## Refactor Log

- **2026-11-10:** Tạo context từ mã Role tại commit `7189352`, đối chiếu API/schema, ADR-003 và cây test. Ghi lại hợp đồng hiện tại, kiểm tra đủ Permission trước khi ghi, quyền sở hữu bảng nối và các phần còn mở. Chỉ thêm tài liệu; không thay đổi hành vi hoặc chạy Maven/HTTP/MySQL trong phiên này.
