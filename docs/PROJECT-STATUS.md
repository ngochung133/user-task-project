# Tiến độ HR Management API

Cập nhật 2026-11-07. Baseline lấy từ mã và test trong repo `hr-management`.

## Hiện trạng

| Hạng mục | Mức triển khai |
|---|---|
| Nền tảng | Java 25, Spring Boot 4.1.1, Maven Wrapper, Spring MVC, JPA/MySQL, Jakarta Validation, Security Resource Server, response wrapper và global advice. |
| User | Có list/create/update/delete, BCrypt và response DTO. Còn nhận entity làm request, thiếu get theo ID, phân trang và quan hệ HR. |
| Auth | Có login bằng email/mật khẩu và Bearer JWT HS256, role cố định `USER`. Chưa có profile `/me`, refresh, logout hay phân quyền theo dữ liệu. |
| Permission | Đang triển khai trong `feature/permission`: có entity, constraint `(api_path, method)`, request/response DTO, service interface/implementation và năm route CRUD. List dùng `Pageable` và Specification lọc theo name/method/module. Còn lỗi và thiếu kiểm thử; chưa xác nhận API hoạt động qua HTTP/MySQL. |
| Kiểm thử | Cây nguồn có 10 unit test User, 15 integration test User và 3 integration test Auth; integration test dùng MySQL Testcontainers 8.4. Chưa có test Permission trong cây nguồn. Các báo cáo Surefire hiện có không đại diện cho một lần chạy toàn bộ suite trên code hiện tại; xem ghi nhận phiên bên dưới. |
| Company, Role, RBAC, Upload | Chưa triển khai trong repo này. |
| Kiến trúc | Auth, User và Permission nằm trong `feature/`. Các thành phần dùng chung nằm ở cấp ứng dụng. User có service interface, implementation và mapper. Permission ánh xạ response bằng `fromEntity()`. Test tổ chức theo trách nhiệm. Xem [ARCHITECTURE.md](ARCHITECTURE.md). |

Đối chiếu [POM](../pom.xml), [mã hiện tại](../src/main/java/com/example/hrmanagement/), [test](../src/test/java/com/example/hrmanagement/) và [API hiện hành](API_SPEC.md).

## Ghi nhận phiên 2026-11-07

- **Đổi tên project:** Git root hiện tại là `/Users/ngochung/Documents/spring/hr-management`. Đồng bộ tên repo trong tài liệu/hướng dẫn AI, Maven artifact/name, `spring.application.name` và cấu hình chạy VS Code thành `hr-management`. Các liên kết tài liệu dùng đường dẫn tương đối nên vẫn áp dụng sau khi đổi thư mục. Theo yêu cầu tiếp theo, đã chuyển cây mã nguồn và test từ package cũ sang `com.example.hrmanagement`, đổi entry point thành `HrManagementApplication`, đồng bộ import, cấu hình chạy và liên kết tài liệu. Việc chuyển package giữ nguyên nội dung nghiệp vụ đang làm. Kết quả kiểm chứng chuyển package được ghi bên dưới; không xác nhận thêm tiến độ feature.
- **Kiểm chứng chuyển package:** đối chiếu 43 file Java với bản chụp trước khi chuyển, xác nhận chỉ thay tên package/entry point; kiểm tra đường dẫn package, cấu hình chạy VS Code và 68 liên kết nội bộ đạt. `./mvnw -o -DskipTests test-compile` bị chặn bởi file lock Maven trong `~/.m2`; chạy lại với `-Daether.syncContext.named.factory=noop` tới bước biên dịch nhưng thất bại: `Company.java` đang comment toàn bộ nên repository không tìm thấy lớp Company, cùng các lỗi constructor/getter trong mã. Chưa chạy test; không sửa nghiệp vụ ngoài phạm vi đổi đường dẫn.
- **Đã có:** mã Permission đã nằm trong commit `d45485f` (`Permission and Pageable with Dynamic Filter`). Working tree đang bổ sung repository `JpaSpecificationExecutor`, filter record, các Specification và `PageResponseDTO`. Controller có `POST/GET /api/v1/permissions` và `GET/PUT/DELETE /api/v1/permissions/{id}`. Đây là hiện trạng mã, chưa phải xác nhận các endpoint đã đạt hợp đồng. [Controller](../src/main/java/com/example/hrmanagement/feature/permission/PermissionController.java) · [Service](../src/main/java/com/example/hrmanagement/feature/permission/PermissionServiceImpl.java) · [Repository](../src/main/java/com/example/hrmanagement/feature/permission/PermissionRepository.java)
- **Phân trang và lọc đang làm:** cấu hình HTTP dùng page bắt đầu từ 1, size mặc định 10 và tối đa 100. Service kết hợp các điều kiện name/method/module rồi trả `Page<PermissionResponseDTO>`. `PageResponseDTO.from(Page)` đã có nhưng chưa có caller; controller vẫn bọc trực tiếp `Page` trong `ApiResponse`. Chưa áp dụng sort mặc định `id ASC` và tiêu chí phụ theo quy ước. [Specification](../src/main/java/com/example/hrmanagement/feature/permission/PermissionSpecification.java) · [PageResponseDTO](../src/main/java/com/example/hrmanagement/dto/PageResponseDTO.java)
- **Lỗi và phần còn thiếu:** mẫu LIKE hiện tại vẫn là `"%s" + nomalized + "%"`, nên tìm `name=read` tạo `%sread%` và bỏ sót tên `Read users`. Controller PUT đang truyền `null` thay vì ID trên URL; kiểm tra trùng khi update chưa loại ID của chính bản ghi. Create/update chưa chuẩn hóa và kiểm tra allowlist method/module hoặc cú pháp apiPath theo quy ước; chưa có xử lý riêng để trả `409` khi unique constraint bị vi phạm do ghi đồng thời. Chưa xác minh audit timestamp và constraint trên MySQL.
- **Quyền và hợp đồng cần chốt:** route Permission hiện đi qua `anyRequest().authenticated()`, chưa có kiểm tra quyền quản trị hoặc RBAC. Cần chốt quyền truy cập và response phân trang trước khi coi API Permission hoàn thành. Shape `page/pageSize/pages/total/result` trong tài liệu vẫn là đề xuất; DTO mới dùng `content/page/size/totalElements/totalPages/hasNext/hasPrevious`. [API đích](API_SPEC.md#api-hr-đích) · [Quy ước Permission](PROJECT-RULES.md#permission)
- **Kiểm chứng:** lượt review trong phiên đã biên dịch 29 file Java vào thư mục tạm thành công và dùng harness gọi Specification thật để xác nhận lỗi LIKE khi mẫu còn là `%sread%s`. Sau review, mẫu đã được sửa một phần thành `%sread%`; trạng thái này mới được đối chiếu tĩnh, chưa chạy lại harness hoặc biên dịch. Không chạy test mới trong lượt cập nhật status. Lần chạy unit test trước đó trong phiên ghi nhận 10 test User và 8 test Permission thành công khi nạp Mockito qua `-javaagent`; 8 test Permission kiểm tra phiên bản service cũ đã được hoàn tác và file test đã bị xóa, nên không xác nhận bộ lọc hiện tại. Báo cáo integration Auth/User có sẵn ghi nhận 18 test thành công; chưa chạy lại HTTP/MySQL cho code hiện tại. Lần kiểm tra Docker trong phiên bị từ chối truy cập socket.
- **Task tiếp theo:** sửa mẫu LIKE; sửa luồng PUT dùng ID trên URL và loại chính ID khi kiểm tra trùng; hoàn thiện validation/chuẩn hóa và xử lý xung đột DB. Sau khi chốt hợp đồng list và quyền truy cập, nối DTO phân trang, bảo đảm sort ổn định, bổ sung unit test bộ lọc và integration test HTTP với MySQL Testcontainers. Chưa bắt đầu Company, Role, RBAC hoặc Upload; các quyết định nền tảng bảo mật/dữ liệu ở roadmap 2 vẫn còn mở.

## Ghi nhận phiên 2026-11-05

- Đã đối chiếu diff và mã: Auth/User ở `feature/`; thành phần dùng chung ở `config/`, `dto/`, `exception/`, `security/`. Test ở `controller/`, `service/`, `helper/`, `config/`. Thay đổi package và tài liệu tương ứng đang có trong working tree, chưa commit. [ADR-003](decisions/003-feature-package-layout.md) đã chấp nhận bố cục này.
- Hợp đồng hiện tại vẫn dùng `/users` và `/auth/login`. Tạo User public. Đọc, sửa và xóa User yêu cầu JWT. Phân quyền theo dữ liệu và tiền tố `/api/v1` thuộc API HR đích. Quy ước DTO và validation nằm trong [PROJECT-RULES.md](PROJECT-RULES.md).
- Kiểm chứng phiên này: đã kiểm tra tĩnh mã, test và báo cáo XML trong `target/surefire-reports/`. Chạy `./mvnw -o test` thất bại trước khi chạy test vì không mở được file lock trong `~/.m2/repository/.locks/`. Chưa xác nhận lại suite trong phiên này; số 28 test thành công ở trên là kết quả báo cáo có sẵn.
- Chưa bắt đầu các mục roadmap 2–6. ADR refresh token và upload vẫn là đề xuất. Task tiếp theo là nền tảng bảo mật và dữ liệu: chốt cách đưa secret ra ngoài cấu hình, chính sách tạo/sửa User và kế hoạch unique email/migration trước khi triển khai phần phụ thuộc.

## Roadmap đề xuất

1. **Baseline và tách feature · Hoàn thành.** Đặt Auth và User trong `feature/` theo bố cục tham chiếu, giữ cây test ban đầu và chạy suite bằng MySQL Testcontainers.
2. **Nền tảng bảo mật và dữ liệu.** Tách secret khỏi cấu hình mặc định. Chốt chính sách tạo/sửa User, tính duy nhất của email và kế hoạch dữ liệu trước khi mở rộng hợp đồng HR.
3. **Permission và Company · Đang làm một phần.** Permission đã có mã CRUD, phân trang và bộ lọc nhưng chưa hoàn thiện validation, hợp đồng và kiểm thử; Company chưa bắt đầu. Hoàn thiện từng module với DB constraint và test JWT.
4. **Role và User HR.** Thêm quan hệ Role–Permission, User–Role, User–Company và API User có version theo hợp đồng được chốt.
5. **Auth hoàn chỉnh.** Thêm profile, đăng ký theo chính sách được duyệt, refresh/logout theo ADR được duyệt, rồi tích hợp kiểm tra quyền theo route và HTTP method.
6. **Upload và hoàn thiện.** Bổ sung avatar/logo theo ADR được duyệt, sau đó rà API, migration và test hồi quy.

## Điểm cần chốt khi đến phạm vi tương ứng

- Cấu hình mặc định chứa khóa JWT và mật khẩu DB dạng literal. Luồng hiện tại cấp JWT 24 giờ. Chốt cách chuyển secret/TTL và ảnh hưởng đến token đang dùng trong task bảo mật riêng.
- `POST /users` hiện public. Tách đăng ký khỏi tạo User do admin, và chốt danh sách trường được sửa, khi triển khai hợp đồng HR.
- Thời hạn refresh, cookie/CSRF, vòng đời token và cấu hình upload nằm trong ADR đề xuất. Tài liệu của dự án tham chiếu chỉ cung cấp mẫu.
