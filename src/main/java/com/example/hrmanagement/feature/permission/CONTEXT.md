# Permission — ngữ cảnh triển khai

Đối chiếu ngày 2026-11-10, HEAD `7189352` (`Role`). Nội dung dưới đây được xác nhận bằng mã nguồn hiện tại; module chưa có kiểm thử tự động JUnit/MySQL Testcontainers trong cây test.

## Mục đích

Quản lý danh mục quyền truy cập API (`name`, `apiPath`, `method`, `module`), cung cấp CRUD theo ID cùng tìm kiếm và phân trang. Tập quyền này được module [Role](../role/Role.java) tham chiếu qua bảng nối `role_permission`, nhưng hiện chưa được tích hợp vào cơ chế phân quyền động trên filter chain.

Điểm vào: [PermissionController](PermissionController.java) → [PermissionService](PermissionService.java) → [PermissionServiceImpl](PermissionServiceImpl.java) → [PermissionRepository](PermissionRepository.java). Bố cục package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện có trong mã

Các endpoint dùng `/api/v1/permissions`, bọc kết quả bằng [ApiResponse](../../dto/ApiResponse.java). [SecurityConfig](../../config/SecurityConfig.java) áp dụng `anyRequest().authenticated()` cho toàn bộ route Permission, chưa kiểm tra quyền quản trị hoặc RBAC.

| Method và path | Xử lý hiện tại | Thành công |
|---|---|---|
| `POST /api/v1/permissions` | Nhận `@Valid PermissionRequestDTO`, kiểm tra trùng `(apiPath, method)` trước khi lưu. | 201, `PermissionResponseDTO` |
| `GET /api/v1/permissions` | Nhận `PermissionFilterDTO` (`@ModelAttribute`) và `Pageable`, trả trang kết quả. | 200, `PageResponseDTO<PermissionResponseDTO>` |
| `GET /api/v1/permissions/{id}` | Tìm Permission theo `id`, ném `ResourceNotFoundException` nếu không có. | 200, `PermissionResponseDTO` |
| `PUT /api/v1/permissions/{id}` | Nhận `@PathVariable long id` và `@RequestBody PermissionRequestDTO`, nhưng đang gọi `permissionService.update(null, request)` và thiếu `@Valid`. | Dự kiến 200 (`PermissionResponseDTO`), thực tế lỗi do truyền ID `null` |
| `DELETE /api/v1/permissions/{id}` | Kiểm tra tồn tại bằng `findById` trước khi gọi `deleteById`. | 200, `data` là `Delete successfully` |

Nguồn: [controller](PermissionController.java), [service](PermissionServiceImpl.java).

- [PermissionRequestDTO](dto/PermissionRequestDTO.java) hiện là class dùng Lombok (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`), chưa chuyển sang Java `record`. Cả bốn trường `name`, `apiPath`, `method`, `module` đều có `@NotBlank` và `@Size(max = 255)`.
- [PermissionResponseDTO](dto/PermissionResponseDTO.java) là `record` có `@Builder`, gồm `id`, `name`, `apiPath`, `method`, `module`, `createdAt`, `updatedAt`. Phương thức `fromEntity(Permission)` lấy `permission.getUpdateAt()` gán cho `updatedAt`.
- [PageResponseDTO](../../dto/PageResponseDTO.java) trả `content`, `page` (bắt đầu từ 1), `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious` theo [cấu hình HTTP](../../../../../../../../src/main/resources/application.properties).
- [GlobalExceptionHandler](../../exception/GlobalExceptionHandler.java) ánh xạ lỗi `@Valid` thành 400, `ResourceNotFoundException` thành 404 và `ResourceAlreadyExistException` thành 409.

### Nghiệp vụ và kiểm tra trùng lặp

[PermissionServiceImpl](PermissionServiceImpl.java) dùng constructor injection qua `@RequiredArgsConstructor` với `PermissionRepository`:

- `create` và `update` đặt `@Transactional` (đang import `jakarta.transaction.Transactional`); `getById`, `getAllPermission` và `deleteById` chưa đặt `@Transactional`.
- `create` kiểm tra `existsByApiPathAndMethod(request.getApiPath(), request.getMethod())`, nếu trùng ném `ResourceAlreadyExistException("Permission", "apiPath + method", ...)` trước khi gọi `save`.
- `update` tìm bản ghi theo `id` (hiện viết tên tài nguyên lỗi là `Permisison`), sau đó gọi lại `existsByApiPathAndMethod(request.getApiPath(), request.getMethod())` mà chưa loại trừ chính `id` đang cập nhật, rồi gán lại 4 trường và `saveAndFlush`.

### Mapping và bộ lọc

- [Permission](Permission.java) map bảng `permissions` với unique constraint trên `{"api_path", "method"}`. Khóa chính `id` là `long` (`GenerationType.IDENTITY`). Các cột `name`, `api_path`, `method`, `module` đều `nullable = false, length = 255`; riêng `apiPath` khai báo thêm `@Collate("utf8mb4_0900_bin")` để phân biệt hoa/thường theo nhị phân trên MySQL.
- `createdAt` dùng `@CreationTimestamp` (`updatable = false`), còn field **`updateAt`** dùng `@UpdateTimestamp`, cả hai kiểu `Instant` và `nullable = false`.
- [PermissionFilterDTO](dto/PermissionFilterDTO.java) là `record(String name, String method, String module)`. [PermissionSpecification](PermissionSpecification.java) kết hợp bằng `Specification.allOf(...)`:
  - `hasName`: dùng `containsIgnoreCase` — `trim().toLowerCase(Locale.ROOT)` và so `LIKE` với `"%" + nomalized + "%"` trên `cb.lower(root.get("name"))`.
  - `hasMethod`, `hasModule`: dùng `equalIfPresent` — `trim()` và so bằng trực tiếp (`cb.equal`), không biến đổi hoa/thường trong Specification.

## Phụ thuộc

- Không phụ thuộc feature nghiệp vụ khác; được module [Role](../role/Role.java) và [RoleServiceImpl](../role/RoleServiceImpl.java) phụ thuộc chiều ngược lại để gán quyền và ánh xạ `PermissionResponseDTO`.
- Spring MVC, Jakarta Validation, Spring Data JPA/Specification, Hibernate/MySQL; [ApiResponse](../../dto/ApiResponse.java), [PageResponseDTO](../../dto/PageResponseDTO.java) và các exception dùng chung trong `exception/`.
- Quy ước mục tiêu: [PROJECT-RULES.md](../../../../../../../../docs/PROJECT-RULES.md#permission), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md), [DATABASE.md](../../../../../../../../docs/DATABASE.md).

## Giới hạn

- **Lỗi `PUT /api/v1/permissions/{id}` đã ghi nhận:**
  1. [PermissionController.updatePermission](PermissionController.java#L56-L58) truyền `null` thay vì `id` vào `permissionService.update(null, request)` và thiếu `@Valid` trên `@RequestBody`.
  2. [PermissionServiceImpl.update](PermissionServiceImpl.java#L38-L42) dùng `existsByApiPathAndMethod` không loại trừ `id` hiện tại, khiến cập nhật giữ nguyên `apiPath` + `method` bị báo trùng `409`.
- **Chưa hoàn thiện chuẩn hóa và allowlist theo quy ước Permission ([PROJECT-RULES.md](../../../../../../../../docs/PROJECT-RULES.md#permission)):**
  - Chưa `trim` và viết hoa `method`, `module` bằng `Locale.ROOT`, chưa kiểm tra allowlist (`GET`, `POST`, `PUT`, `PATCH`, `DELETE` và `AUTH`, `USER`, `COMPANY`, `PERMISSION`, `ROLE`).
  - Chưa chuẩn hóa `apiPath` (trim, kiểm tra bắt đầu bằng `/`, từ chối URL đầy đủ/query string/fragment).
  - Chưa xử lý riêng ngoại lệ vi phạm unique constraint DB khi hai yêu cầu ghi đồng thời để trả `409`.
  - Chưa đặt sort mặc định `id ASC` và tiêu chí phụ `id` khi phân trang.
- **Quan hệ với Role và chính sách xóa:** Bảng `role_permission` tham chiếu khóa ngoại tới `permissions`. `deleteById` hiện xóa thẳng; chưa chốt và xử lý trường hợp Permission đang được gán cho Role.
- **Kiểm thử:** Chưa có unit test hay HTTP integration test cho Permission trong `src/test/`. Kết quả chạy Postman ghi tại [PROJECT-STATUS.md](../../../../../../../../docs/PROJECT-STATUS.md) chỉ là kiểm chứng thủ công/bán tự động trước đó, không thay thế suite JUnit/MySQL Testcontainers.

## Refactor Log

- **2026-11-10:** Tạo `CONTEXT.md` từ mã nguồn tại HEAD `7189352`, đối chiếu với [PROJECT-RULES.md](../../../../../../../../docs/PROJECT-RULES.md), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md), [DATABASE.md](../../../../../../../../docs/DATABASE.md) và [PROJECT-STATUS.md](../../../../../../../../docs/PROJECT-STATUS.md). Ghi nhận hợp đồng đang chạy, hai lỗi ở luồng `PUT` và các yêu cầu chuẩn hóa/kiểm thử còn mở.
