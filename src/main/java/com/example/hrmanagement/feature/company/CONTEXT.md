# Company — ngữ cảnh triển khai

Đối chiếu tĩnh ngày 2026-11-23, HEAD `0232bac` (`project v1`). Nội dung mô tả mã và assertion trong test, chưa xác nhận HTTP/MySQL thành công trên HEAD này. Xem [trạng thái và bằng chứng kiểm thử](../../../../../../../../docs/PROJECT-STATUS.md).

## Mục đích

Quản lý công ty (`name`, `description`, `address`, `logo`) để User tham chiếu. Điểm vào: [CompanyController](CompanyController.java) → [CompanyService](CompanyService.java) → [CompanyServiceImpl](CompanyServiceImpl.java) → [CompanyRepository](CompanyRepository.java). Package theo [ADR-003](../../../../../../../../docs/decisions/003-feature-package-layout.md).

## Quyết định và lý do

### Hợp đồng hiện tại trong mã

Base path `/api/v1/companies`, trả [ApiResponse](../../dto/ApiResponse.java). Mọi thao tác yêu cầu Bearer JWT và Permission đúng method/path theo [SecurityConfig](../../config/SecurityConfig.java), [PermissionAuthorizationManager](../../security/PermissionAuthorizationManager.java); chỉ có token chưa đủ quyền truy cập.

| Method và path | Xử lý | Thành công theo controller |
|---|---|---|
| `POST /api/v1/companies` | Tạo từ `@Valid CompanyRequestDTO` | 201, `CompanyResponseDTO` |
| `GET /api/v1/companies` | Lọc/phân trang | 200, `PageResponseDTO<CompanyResponseDTO>` |
| `GET /api/v1/companies/{id}` | Tìm theo ID | 200, `CompanyResponseDTO` |
| `PUT /api/v1/companies/{id}` | ID trên URL, thay bốn field | 200, `CompanyResponseDTO` |
| `DELETE /api/v1/companies/{id}` | Kiểm tra tồn tại rồi xóa | 200, chuỗi `Delete successfully` trong `data` |

[CompanyRequestDTO](dto/CompanyRequestDTO.java) là record dùng chung POST/PUT; cả bốn field không trắng và tối đa 255 ký tự. [CompanyResponseDTO](dto/CompanyResponseDTO.java) gồm `id`, bốn field trên, `createdAt`, `updatedAt`, ánh xạ trực tiếp qua `fromEntity()`; không chứa danh sách User.

### Nghiệp vụ, transaction và FK

[Service](CompanyServiceImpl.java) dùng `existsByName` khi tạo, `existsByNameAndIdNot` khi sửa để cho phép giữ nguyên tên của chính Company. Tên trùng phát hiện trước lưu ném `ResourceAlreadyExistException`; create/update dùng `saveAndFlush`, các phương thức ghi có `@Transactional`, list/get dùng `readOnly=true`. Chưa trim/chuẩn hóa giá trị trước khi lưu. Lỗi update giữ nguyên tên trong context cũ đã được sửa ở mức mã và có test tương ứng.

[Company](Company.java) map `companies`: Long/IDENTITY, bốn cột không null/dài 255, unique tên và hai timestamp `Instant` do Hibernate quản lý. [V1](../../../../../../../../src/main/resources/db/migration/V1__init_schema.sql) tạo bảng cùng unique tên; collation bảng là `utf8mb4_0900_ai_ci`, ảnh hưởng so sánh tên hoa/thường/dấu. [User](../user/User.java) sở hữu quan hệ Company qua FK `users.company_id` nullable; Company không có collection User hoặc logic chuyển/xóa nhân sự.

DELETE gọi repository, không chủ động xử lý User đang tham chiếu. FK V1 không khai báo ON DELETE CASCADE; [GlobalExceptionHandler](../../exception/GlobalExceptionHandler.java) ánh xạ `DataIntegrityViolationException` thành `409`, cùng nhóm lỗi với unique constraint. Đây là cơ chế hiện hữu, chưa phải chính sách xóa/ngừng hoạt động Company đã được chốt. Lỗi validation là `400`, thiếu tài nguyên `404`; filter chain xử lý `401/403`.

### Lọc, phân trang và logo

[CompanySpecification](CompanySpecification.java) có helper static: name/description trim, lowercase `Locale.ROOT` rồi so LIKE chứa chuỗi; logo/address trim và so bằng. [CompanyFilterDTO](dto/CompanyFilterDTO.java) nhận đúng bốn field này, các điều kiện ghép AND; chuỗi null/trắng bỏ điều kiện. [Cấu hình HTTP](../../../../../../../../src/main/resources/application.yml) đặt page từ 1, size mặc định 10, tối đa 100. [PageResponseDTO](../../dto/PageResponseDTO.java) trả `content/page/size/totalElements/totalPages/hasNext/hasPrevious`. Service chưa bổ sung sort mặc định hay tiêu chí phụ.

`logo` được lưu như chuỗi request, không kiểm tra file tồn tại và không gọi FileService. [FileController](../file/FileController.java)/[FileServiceImpl](../file/FileServiceImpl.java) đã có luồng upload riêng; việc client dùng tên upload cho logo không được Company service ràng buộc. [ADR-002](../../../../../../../../docs/decisions/002-file-upload-strategy.md) vẫn là đề xuất, nhất là quyền đọc/vòng đời file; không coi toàn bộ ADR đã được áp dụng.

## Phụ thuộc

- Service chỉ tiêm CompanyRepository; dùng Spring MVC, Validation, JPA/Specification, transaction và DTO/exception dùng chung.
- [UserServiceImpl](../user/UserServiceImpl.java) dùng CompanyRepository để gán công ty, [UserResponseDTO](../user/dto/UserResponseDTO.java) đọc ID/tên. [DashboardServiceImpl](../dashboard/DashboardServiceImpl.java) đếm Company.
- Schema qua Flyway và Hibernate `validate`; [DATABASE](../../../../../../../../docs/DATABASE.md) nêu quy trình migration, không thay thế bằng chứng schema đang chạy.

## Giới hạn

- **Đã có test, chưa chạy lại:** [CompanyServiceTest](../../../../../../../../src/test/java/com/example/hrmanagement/service/CompanyServiceTest.java) mock repository cho CRUD/trùng tên, gồm giữ nguyên tên khi update. [CompanyControllerIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/CompanyControllerIntegrationTest.java) có assertion CRUD, validation, 404/401/403 và `deleteCompanyReferencedByUserReturns409`. Case FK dùng `Propagation.NOT_SUPPORTED` và dọn dữ liệu riêng để quan sát kết thúc transaction service; các case còn lại nằm trong transaction test. Chưa có báo cáo integration mới, không kết luận pass từ assertion có sẵn. Xem PROJECT-STATUS về lệch XML/`.txt` của báo cáo unit.
- **Cần chốt/kiểm chứng:** sort ổn định, chuẩn hóa/phạm vi unique tên, ghi đồng thời, chính sách Company còn User và dọn file logo sau thay/xóa hoặc upload chưa gắn bản ghi. Hiện lỗi FK dựa vào constraint/advice, chưa có hành vi chuyển User hay xóa mềm Company.
- **Quy ước thay đổi mới:** [PROJECT-RULES](../../../../../../../../docs/PROJECT-RULES.md) yêu cầu entity hạn chế setter, sort ổn định và test MySQL; entity hiện dùng setter và constructor Lombok công khai. [API_SPEC](../../../../../../../../docs/API_SPEC.md) còn để một phần Company trong nhóm đích và [ARCHITECTURE](../../../../../../../../docs/ARCHITECTURE.md) còn mô tả module tương lai; lấy mã ở trên làm hiện trạng, chốt thiết kế riêng trước thay đổi hợp đồng.

## Refactor Log

- **2026-11-10:** Tạo `CONTEXT.md` từ mã nguồn tại HEAD `7189352`, đối chiếu với [OpenApiIntegrationTest](../../../../../../../../src/test/java/com/example/hrmanagement/controller/OpenApiIntegrationTest.java), [API_SPEC.md](../../../../../../../../docs/API_SPEC.md), [DATABASE.md](../../../../../../../../docs/DATABASE.md) và [PROJECT-STATUS.md](../../../../../../../../docs/PROJECT-STATUS.md). Ghi nhận hợp đồng hiện có, lỗi `409` khi update giữ nguyên tên và các phần chờ hoàn thiện.
- **2026-11-23:** Đồng bộ GET theo ID, RBAC, transaction, kiểm tra trùng loại ID hiện tại, quan hệ User–Company và test đã thêm. Ghi riêng cơ chế lỗi FK/409 hiện có với chính sách xóa/logo còn cần chốt. Đối chiếu tĩnh HEAD `0232bac`, mã/test, API/schema và ADR liên quan; giữ mục lịch sử 2026-11-10. Chỉ cập nhật CONTEXT, không sửa source hoặc chạy build/test/HTTP.
