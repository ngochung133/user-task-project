# Company — ngữ cảnh triển khai

Đối chiếu ngày 2026-11-10, HEAD `7189352` (`Role`). Nội dung dưới đây được xác nhận bằng mã nguồn và kiểm thử tích hợp OpenAPI hiện có; chưa có bộ test JUnit/MySQL Testcontainers riêng cho CRUD Company.

## Mục đích

Quản lý thông tin công ty (`name`, `description`, `address`, `logo`) với các thao tác tạo, cập nhật, xóa và danh sách có lọc/phân trang. Quan hệ nhân sự thuộc công ty (`User` → `Company`) thuộc roadmap tiếp theo và chưa được nối vào module này.

Điểm vào: [CompanyController](CompanyController.java) → [CompanyService](CompanyService.java) → [CompanyServiceImpl](CompanyServiceImpl.java) → [CompanyRepository](CompanyRepository.java). Bố cục package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện có trong mã

Các endpoint đặt dưới `/api/v1/companies`, trả JSON qua [ApiResponse](../../dto/ApiResponse.java). Theo [SecurityConfig](../../config/SecurityConfig.java), mọi route `/api/v1/companies/**` đi qua `anyRequest().authenticated()` (yêu cầu Bearer JWT, chưa phân quyền theo Role/Permission). Hành vi từ chối request ẩn danh (`401`) trên `GET /api/v1/companies` và sự xuất hiện trên tài liệu OpenAPI được xác nhận trong [OpenApiIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/OpenApiIntegrationTest.java#L36-L53).

| Method và path | Xử lý hiện tại | Thành công |
|---|---|---|
| `POST /api/v1/companies` | Nhận `@Valid CompanyRequestDTO`, kiểm tra trùng `name` trước khi lưu. | 201, `CompanyResponseDTO` |
| `PUT /api/v1/companies/{id}` | Dùng `id` trên path và `@Valid CompanyRequestDTO`; cập nhật 4 trường. | 200, `CompanyResponseDTO` |
| `DELETE /api/v1/companies/{id}` | Tìm Company theo `id` trước khi gọi `deleteById`. | 200, `data` là `Delete successfully` |
| `GET /api/v1/companies` | Nhận `Pageable` và `@ModelAttribute CompanyFilterDTO`, trả trang Company. | 200, `PageResponseDTO<CompanyResponseDTO>` |

Chưa có `GET /api/v1/companies/{id}`. Nguồn: [controller](CompanyController.java), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md#company-đang-triển-khai).

- [CompanyRequestDTO](dto/CompanyRequestDTO.java) là Java `record` dùng chung cho POST và PUT. Cả 4 thành phần `name`, `description`, `address`, `logo` đều có `@NotBlank` và `@Size(max = 255)` với thông báo tiếng Việt.
- [CompanyResponseDTO](dto/CompanyResponseDTO.java) là `record` gồm `id`, `name`, `description`, `address`, `logo`, `createdAt`, `updatedAt`, ánh xạ qua `CompanyResponseDTO.fromEntity(Company)`.
- [PageResponseDTO](../../dto/PageResponseDTO.java) bọc kết quả phân trang (`content`, `page` bắt đầu từ 1, `size`, `totalElements`, `totalPages`, `hasNext`, `hasPrevious`).
- [GlobalExceptionHandler](../../exception/GlobalExceptionHandler.java) trả 400 kèm `details` cho lỗi `@Valid`, 404 cho `ResourceNotFoundException` và 409 cho `ResourceAlreadyExistException`.

### Nghiệp vụ, mapping và bộ lọc

- [CompanyServiceImpl](CompanyServiceImpl.java) tiêm `CompanyRepository` qua `@RequiredArgsConstructor`. Các phương thức `create`, `update`, `delete`, `getAll` hiện chưa đặt `@Transactional`.
- `create` kiểm tra `existsByName(request.name())` và `saveAndFlush`.
- `update` tìm bản ghi theo `id`, nhưng kiểm tra trùng tên lại dùng `existsByName(request.name())` thay vì loại trừ `id` hiện tại, khiến cập nhật giữ nguyên tên công ty bị ném `ResourceAlreadyExistException` (`409`).
- [Company](Company.java) map bảng `companies` với unique constraint trên cột `name`. `id` kiểu `Long` (`GenerationType.IDENTITY`). Bốn cột `name`, `description`, `address`, `logo` khai báo `nullable = false, length = 255`. Hai trường `createdAt` (`@CreationTimestamp`) và `updatedAt` (`@UpdateTimestamp`) kiểu `Instant` (đang khai báo `@Column(nullable = false, length = 255)`).
- [CompanyFilterDTO](dto/CompanyFilterDTO.java) là `record(String name, String description, String logo, String address)`. [CompanySpecification](CompanySpecification.java) hiện có các helper `static` (`equalIfPresent`, `containsIgnoreCase`), còn các hàm `hasName`, `hasDescription`, `hasLogo`, `hasAddress` là phương thức instance nên `CompanyServiceImpl.getAll` khởi tạo `new CompanySpecification()` rồi ghép bằng `Specification.allOf(...)`:
  - `name`, `description`: `trim().toLowerCase(Locale.ROOT)` và so `LIKE` (`%giá trị%`) không phân biệt hoa/thường.
  - `logo`, `address`: `trim()` và so bằng (`cb.equal`).

## Phụ thuộc

- Module nghiệp vụ độc lập: hiện không phụ thuộc và chưa bị module nào trong `feature/` phụ thuộc trực tiếp.
- Spring MVC, Jakarta Validation, Spring Data JPA/Specification, Hibernate/MySQL; [ApiResponse](../../dto/ApiResponse.java), [PageResponseDTO](../../dto/PageResponseDTO.java) và các exception dùng chung ở `exception/`.
- Quy ước và thiết kế đích: [PROJECT-RULES.md](../../../../../../../../docs/PROJECT-RULES.md), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md), [DATABASE.md](../../../../../../../../docs/DATABASE.md).

## Giới hạn

- **Lỗi cập nhật giữ nguyên tên (`409`):** [CompanyServiceImpl.update](CompanyServiceImpl.java#L37-L39) gọi `existsByName(request.name())` mà chưa loại trừ `id` của chính bản ghi đang sửa (thiếu `existsByNameAndIdNot(String name, Long id)` trong [CompanyRepository](CompanyRepository.java)).
- **Thiếu `@Transactional` và xử lý xung đột đồng thời:** Các phương thức ghi trong `CompanyServiceImpl` chưa có `@Transactional` theo quy ước. Chưa xử lý riêng lỗi vi phạm unique constraint từ DB khi hai request tạo/sửa trùng tên đồng thời.
- **Hợp đồng và tính năng còn thiếu so với thiết kế đích:**
  - Chưa có `GET /api/v1/companies/{id}`.
  - Chưa có sort mặc định `id ASC` và tiêu chí phụ khi phân trang.
  - `logo` hiện nhận chuỗi thuần trong JSON; luồng upload file/logo thuộc [ADR-002](../../../../../../../../docs/decisions/002-file-upload-strategy.md) (trạng thái đề xuất, chưa triển khai).
  - Chưa có quan hệ `User` → `Company` (`company_id`) và chưa chốt chính sách xóa Company khi còn nhân sự trực thuộc ([API_SPEC.md](../../../../../../../../docs/API_SPEC.md#api-hr-đích)).
- **Kiểm thử:** Ngoài 2 assertion về security/OpenAPI trên `/api/v1/companies` trong [OpenApiIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/OpenApiIntegrationTest.java), chưa có unit test hay integration test cho CRUD/filter Company trong `src/test/`.

## Refactor Log

- **2026-11-10:** Tạo `CONTEXT.md` từ mã nguồn tại HEAD `7189352`, đối chiếu với [OpenApiIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/OpenApiIntegrationTest.java), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md), [DATABASE.md](../../../../../../../../docs/DATABASE.md) và [PROJECT-STATUS.md](../../../../../../../../docs/PROJECT-STATUS.md). Ghi nhận hợp đồng hiện có, lỗi `409` khi update giữ nguyên tên và các phần chờ hoàn thiện.
