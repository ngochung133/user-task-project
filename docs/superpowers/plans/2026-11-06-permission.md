# Kế hoạch triển khai Permission

**Mục tiêu.** Xây API quản lý danh mục Permission với năm thao tác CRUD, kiểm tra dữ liệu, phân trang và quyền quản trị. Thực hiện từng mốc và chỉ chuyển bước sau khi ca kiểm thử của mốc đó chạy đúng.

**Kiến trúc.** Spring Security kiểm tra người gọi trước khi request đến controller. Controller nhận HTTP và gọi service. Service áp dụng quy tắc nghiệp vụ trong giao dịch rồi dùng repository để đọc hoặc ghi MySQL. Response record ánh xạ dữ liệu từ entity.

**Nền tảng.** Java 25, Spring Boot, Spring MVC, Jakarta Validation, Spring Data JPA, MySQL 8.4, JUnit, Mockito, MockMvc và Testcontainers.

**Hiện trạng.** Package `feature/permission` đã có hai class khung. `Permission.java` còn khai báo `public class permission`, cần sửa thành `Permission` trước khi biên dịch. API Permission nằm trong hợp đồng đích. Nguồn quyền quản trị thật còn cần chốt. [Entity hiện tại](../../../src/main/java/com/example/hrmanagement/feature/permission/Permission.java) · [Quy tắc Permission](../../PROJECT-RULES.md#permission) · [API đích](../../API_SPEC.md#api-hr-đích) · [Schema đích](../../DATABASE.md#mô-hình-hr-đích)

## 1. Hiểu bản ghi Permission

Ví dụ `GET /users` là quyền đọc danh sách User. `POST /users` là thao tác khác dù chung đường dẫn. Vì vậy danh tính nghiệp vụ là **cặp `(apiPath, method)`**. `id` nhận diện bản ghi khi sửa, xóa hoặc liên kết với Role. `name` giúp người quản trị đọc danh mục. `module` dùng để nhóm quyền theo feature. Đổi tên hiển thị hay module không tạo ra quyền mới cho cùng một cặp.

Ví dụ body dùng chung cho `POST` và `PUT` trong buổi thực hành.

```json
{
  "name": "Xem danh sách người dùng",
  "apiPath": " /users ",
  "method": " get ",
  "module": " user "
}
```

Sau khi tạo, DB và response chứa `apiPath = /users`, `method = GET` và `module = USER`. Gửi lại cặp này với `name` khác vẫn xung đột. Tạo bản ghi danh mục sẽ phục vụ Role ở mốc sau. Việc cấp quyền cho người dùng và áp dụng quyền khi request khớp route thuộc mốc RBAC. [Roadmap HR](../../PROJECT-STATUS.md#roadmap-đề-xuất)

## 2. Chốt hợp đồng trước khi viết phần phụ thuộc

Các giới hạn, status thành công, cú pháp path và tham số list dưới đây là **đề xuất cho bài thực hành**. Đối chiếu với `API_SPEC.md` và `DATABASE.md` trước khi coi chúng là hợp đồng đã chốt.

| Trường | Quy tắc đề xuất | Lý do |
|---|---|---|
| `name` | Chuỗi bắt buộc, bỏ khoảng trắng hai đầu, tối đa 100 ký tự | Giữ tên hiển thị dễ đọc và đồng bộ giới hạn API với DB. |
| `apiPath` | Chuỗi bắt buộc, bỏ khoảng trắng hai đầu, tối đa 255 ký tự, giữ hoa/thường | Lưu mẫu route dưới dạng nhất quán để so trùng. |
| `method` | Chuỗi bắt buộc, bỏ khoảng trắng hai đầu, viết hoa với `Locale.ROOT`. Chấp nhận `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | Mỗi method là một thao tác riêng. Cột chuỗi dài tối đa 10 ký tự. |
| `module` | Chuỗi bắt buộc, chuẩn hóa giống `method`. Chấp nhận `AUTH`, `USER`, `COMPANY`, `PERMISSION`, `ROLE` | Mã feature nhất quán giúp nhóm quyền. Cột chuỗi dài tối đa 32 ký tự. |

**Cú pháp `apiPath`.** Đề xuất nhận `/` hoặc các segment phân cách bằng `/`. Mỗi segment là tên cố định gồm chữ ASCII, số, `.`, `_`, `~`, `-` hoặc một biến như `{id}`. Tên biến bắt đầu bằng chữ cái và có thể chứa chữ số hoặc `_`. Giữ một dấu `/` cuối nếu có để biểu diễn route như `/auth/`. Từ chối segment rỗng ở giữa, `.` và `..`, khoảng trắng bên trong, URL đầy đủ, query, fragment, backslash, percent encoding và wildcard. Trước khi dùng bản ghi để phân quyền, chốt cách so khớp route thực tế, kể cả hai mẫu chỉ khác tên biến như `{id}` và `{userId}`. Unique constraint trong bài này so cặp chuỗi đã lưu.

| Endpoint | Thành công | Hành vi cần kiểm tra |
|---|---|---|
| `POST /api/v1/permissions` | `201`, `data` là Permission vừa tạo | Dữ liệu sai `400`, cặp đã tồn tại `409`. |
| `GET /api/v1/permissions/{id}` | `200`, `data` là Permission | ID sai `400`, ID hợp lệ nhưng thiếu bản ghi `404`. |
| `GET /api/v1/permissions` | `200`, `data` có `page`, `pageSize`, `pages`, `total`, `result` | Tham số sai `400`. Trang vượt dữ liệu trả `200` và `result: []`. |
| `PUT /api/v1/permissions/{id}` | `200`, `data` là Permission đã sửa | Thay thế cả bốn trường nghiệp vụ. ID trên URL xác định bản ghi. ID sai hoặc body sai `400`, thiếu bản ghi `404`, cặp thuộc bản ghi khác `409`. |
| `DELETE /api/v1/permissions/{id}` | `200` với thông báo theo `ApiResponse` | ID sai `400`, thiếu bản ghi `404`. Khi có Role, đề xuất trả `409` nếu Permission còn được gán. |

`PermissionResponseDTO` có `id`, bốn trường nghiệp vụ, `createdAt`, `updatedAt`. Dùng `ApiResponse` hiện có. ID hợp lệ là số `Long` dương. Request DTO chứa bốn trường trong bảng. Đề xuất bỏ qua riêng thuộc tính `id` nếu client gửi thêm trong body `PUT`. Test gửi ID của bản ghi B trong body, gọi URL của A, rồi xác nhận chỉ A thay đổi. [ApiResponse](../../../src/main/java/com/example/hrmanagement/dto/ApiResponse.java)

**Tham số list.** Đề xuất `page=1` với phạm vi từ `1` đến `10000`, `size=10` với phạm vi từ `1` đến `100`. Giới hạn cả hai để chặn truy vấn offset quá lớn. `sort` nhận một cặp `field,direction`, mặc định `id,asc`. Cho phép `id`, `name`, `module`, `createdAt` và hai hướng `asc`, `desc`. Với trường khác `id`, nối thêm `id ASC` để các bản ghi bằng nhau có thứ tự nhất quán. Chuyển page HTTP sang page index của repository đúng một lần bằng `page - 1`. Response giữ page theo cách đếm của HTTP.

**Truy cập.** Đề xuất dành cả năm route cho quản trị viên. Không có JWT hợp lệ trả `401`. Người đã xác thực nhưng thiếu quyền trả `403`. Security hiện dùng `anyRequest().authenticated()` và login cấp `ROLE_USER`. Chốt nguồn cấp quyền quản trị và cách áp dụng authority trước khi mở route. [SecurityConfig](../../../src/main/java/com/example/hrmanagement/config/SecurityConfig.java#L65) · [CustomerDetailService](../../../src/main/java/com/example/hrmanagement/security/CustomerDetailService.java#L27)

## 3. Workflow thực hành

Viết mã theo thứ tự A → B → C → D. Sau mỗi mốc, chạy `./mvnw -DskipTests compile` và review mã trước khi chuyển mốc. Viết và chạy các test mới ở phần 4, sau khi hoàn thành mã Permission. Review từng mốc xác nhận phần mã đã sẵn sàng cho bước sau. Kết quả test cuối mới xác nhận hành vi.

### Mốc A. Mapping Permission và repository

**File.** `feature/permission/Permission.java`, `feature/permission/PermissionRepository.java`. Các đường dẫn `feature/` trong kế hoạch nằm dưới `src/main/java/com/example/hrmanagement/`.

- [ ] Đổi tên class thành `Permission`. Khai báo bảng `permissions`, ID `Long` tự sinh, mapping cột `NOT NULL` và giới hạn chuỗi tương ứng. Khai báo constraint có tên `uk_permissions_api_path_method` trên `api_path` và `method`.
- [ ] Dùng `Instant` với timestamp tạo/cập nhật do Hibernate quản lý. `created_at` giữ nguyên khi sửa. Dùng Lombok `@Getter` và `@NoArgsConstructor(access = AccessLevel.PROTECTED)` trên `Permission`. Viết constructor nhận bốn trường nghiệp vụ và phương thức `replaceDetails(...)` để cập nhật. Tạo `PermissionRepository extends JpaRepository<Permission, Long>`.
- [ ] Chốt collation của `api_path` phân biệt hoa/thường và dùng cùng cách so sánh trên MySQL test và schema đích. Với MySQL 8.4 và `utf8mb4`, `utf8mb4_0900_bin` là một lựa chọn. Nếu DB đã có bảng, kiểm tra schema và dữ liệu trước khi áp dụng constraint hoặc đổi collation. [MySQL 8.4 về Unicode và collation](https://dev.mysql.com/doc/refman/8.4/en/charset-unicode-sets.html)

**Vì sao làm trước.** `existsBy…` là một lần đọc. Hai giao dịch có thể cùng thấy rằng cặp chưa tồn tại. Constraint là nơi buộc MySQL giữ đúng bất biến kể cả khi hai giao dịch ghi cùng lúc.

### Mốc B. Tạo Permission qua service

**File.** `feature/permission/dto/PermissionRequestDTO.java`, `feature/permission/dto/PermissionResponseDTO.java`, `feature/permission/PermissionService.java` và `feature/permission/PermissionServiceImpl.java`.

- [ ] Khai báo request và response bằng Java record. Đặt Jakarta Validation cho trường bắt buộc trên request. Trong service, chuẩn hóa rồi kiểm tra giới hạn và allowlist để quy tắc còn hiệu lực khi service được gọi trực tiếp. Nếu đặt giới hạn kích thước trên JSON thô, giữ hợp đồng nhất quán với quy tắc giới hạn sau khi chuẩn hóa. Dùng `static PermissionResponseDTO fromEntity(Permission permission)` để ánh xạ các field đã tải.
- [ ] Viết `PermissionResponseDTO createPermission(PermissionRequestDTO request)`. Trình tự là chuẩn hóa → xác thực dữ liệu → kiểm tra trùng → ghi trong `@Transactional` → ánh xạ response. Repository cần `boolean existsByApiPathAndMethod(String apiPath, String method)`.
- [ ] Dùng exception đầu vào cụ thể để controller có thể trả `400`. Dùng `ResourceAlreadyExistException` cho cặp trùng. Khi ghi, dùng `saveAndFlush` để lỗi unique xuất hiện trong phạm vi xử lý của service. Chỉ chuyển vi phạm đúng constraint `uk_permissions_api_path_method` thành `409`. Cho các lỗi DB khác đi theo luồng lỗi hệ thống và để giao dịch lỗi rollback. [Advice hiện có](../../../src/main/java/com/example/hrmanagement/exception/GlobalExceptionHandler.java#L36)

**Vì sao thứ tự quan trọng.** Nếu tra cứu trước khi chuẩn hóa thì `" get "` và `"GET"` có thể đi qua hai nhánh khác nhau dù đại diện cùng thao tác.

### Mốc C. Đọc, sửa, xóa và phân trang ở service

**File.** Bổ sung `feature/permission/dto/UpdatePermissionRequest.java`, `feature/permission/dto/PermissionPageResponse.java`. Mở rộng interface, implementation, repository từ mốc B.

- [ ] Viết `PermissionResponseDTO getPermission(Long id)` dùng `findById` và `ResourceNotFoundException`. Viết `PermissionResponseDTO updatePermission(Long id, UpdatePermissionRequest request)`. Kiểm tra ID, tìm bản ghi, chuẩn hóa và kiểm tra body, rồi tra cặp trùng bằng `existsByApiPathAndMethodAndIdNot(String apiPath, String method, Long id)`. Chỉ thay các trường sau khi kiểm tra xong. Ghi trong giao dịch và xử lý lỗi unique lúc flush giống create.
- [ ] Viết `PermissionPageResponse listPermissions(int page, int size, String sort)`. Validate tham số, tạo `Pageable`, gọi `findAll(pageable)`, map kết quả bằng `fromEntity()` và lấy tổng từ `Page`. `PermissionPageResponse` là record chứa bốn trường metadata và `List<PermissionResponseDTO> result`.
- [ ] Viết `void deletePermission(Long id)` trong giao dịch. Tìm bản ghi trước khi xóa để phân biệt xóa thành công và tài nguyên đã vắng mặt. Kiểm tra lại DB sau xóa. Trước khi tích hợp `role_permission`, chốt hành vi xóa có liên kết và thay đổi `method` hoặc `apiPath` khi quyền đã được gán. Hai thao tác này có thể thay đổi quyền hiệu lực của các Role đang tham chiếu cùng ID.

**Vì sao update khác create.** Bản ghi đang sửa đã giữ cặp hiện tại. Loại đúng ID đó khỏi truy vấn trùng để cho phép sửa tên hoặc module. `id ASC` ở cuối sort giữ thứ tự giữa các trang khi tập dữ liệu giữ nguyên.

### Mốc D. Nối HTTP và kiểm tra quyền truy cập

**File.** `feature/permission/PermissionController.java`, advice xử lý lỗi phù hợp với phạm vi Permission. Quy tắc truy cập mới nằm ở tầng Security sau khi chốt nguồn authority.

- [ ] Gắn `@RestController`, base path `/api/v1/permissions` và constructor nhận `PermissionService`. Dùng `@Valid @RequestBody` cho `POST`/`PUT`, lấy ID từ `@PathVariable` và dùng factory hiện có của `ApiResponse`. Advice hiện có handler tổng quát trả `500`, nên kiểm tra mapping cụ thể cho lỗi đầu vào của Permission và giữ hành vi các route cũ. [GlobalExceptionHandler](../../../src/main/java/com/example/hrmanagement/exception/GlobalExceptionHandler.java#L53)
- [ ] Áp dụng rule dành cho quản trị viên trên cả route collection và route theo ID, trước `anyRequest().authenticated()`. Nếu dùng claim `roles` đã ký, chốt cách chuyển claim thành authority. JWT hiện lưu sẵn chuỗi như `ROLE_USER`, nên khi cấu hình converter, kiểm tra để prefix `ROLE_` chỉ xuất hiện một lần. Kiểm tra JWT thật qua filter chain để xác nhận ánh xạ claim. Test với authority gắn sẵn vẫn hữu ích cho controller nhưng chưa chứng minh đường đi của token thật. [JwtService](../../../src/main/java/com/example/hrmanagement/feature/auth/JwtService.java#L28) · [Spring Security về chuyển JWT claim thành authority](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html#oauth2resourceserver-jwt-authorization)

**Vì sao cần kiểm tra qua HTTP.** Unit test xác nhận nghiệp vụ. MockMvc với MySQL kiểm tra cả binding, validate, status, bảo mật và việc DB có ghi như dự kiến.

## 4. Viết test và xác nhận hoàn thành

Dùng profile `test` và import `MySqlTestConfiguration` cho các test cần DB.

### Repository

`PermissionRepositoryIntegrationTest` trong `src/test/java/com/example/hrmanagement/repository/`.

- [ ] Viết test lưu `GET /users` và `POST /users` thành công. Lưu thêm `GET /Users` thành công theo quy tắc phân biệt hoa/thường. Ghi lại `GET /users` phải lỗi unique. Sau lỗi, đọc lại từ một giao dịch độc lập và xác nhận chỉ có một bản ghi `GET /users`.
- [ ] Kiểm tra audit sau khi đọc lại từ DB. Tạo có đủ hai timestamp. Sửa một trường thật sự, xác nhận `createdAt` giữ nguyên và `updatedAt` phản ánh lần sửa. Dùng fixture có timestamp cũ nếu cần so sánh nghiêm ngặt, để tránh phụ thuộc vào độ phân giải đồng hồ. Kiểm tra round-trip ở một JVM timezone khác UTC.

### Service

`PermissionServiceTest` trong `src/test/java/com/example/hrmanagement/service/`.

- [ ] Viết unit test kiểm tra repository nhận `/users`, `GET`, `USER` từ payload ở phần 1. Với method, module, path hoặc tên sai, xác nhận service từ chối trước khi ghi. Khi pre-check báo trùng, xác nhận không gọi save. Kiểm tra cả nhánh lỗi unique phát sinh lúc flush và lỗi DB khác.
- [ ] Kiểm thử sửa tên nhưng giữ nguyên cặp thì thành công. Đổi sang cặp của bản ghi khác thì trả lỗi xung đột và giữ nguyên dữ liệu cũ. Kiểm thử ID thiếu trả lỗi not found. Dùng fixture đã commit và đọc lại sau request khi xác minh rollback thật.

- [ ] Kiểm thử `page=0`, `page=10001`, `size=101`, sort sai, trang rỗng và hai trang với nhiều bản ghi trùng tên.

### HTTP

`PermissionControllerIntegrationTest` trong `src/test/java/com/example/hrmanagement/controller/`.

- [ ] Tạo integration test với `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")` và `@Import(MySqlTestConfiguration.class)`. Kiểm tra `401` khi thiếu hoặc sai token, `403` với token người dùng thường và status thành công theo bảng khi caller có quyền. Với write, kiểm tra cả JSON và dữ liệu lưu sau khi request kết thúc. [Mẫu integration test](../../../src/test/java/com/example/hrmanagement/controller/UserControllerIntegrationTest.java#L33)
- [ ] Thêm ca hai request quản trị tạo cùng cặp đã chuẩn hóa qua các giao dịch riêng. Kỳ vọng một `201`, một `409` và đúng một bản ghi. Với test kiểm tra commit hoặc rollback, để service quản lý giao dịch, sau đó truy vấn DB riêng và dọn fixture. MockMvc với authority giả lập hoặc JWT quản trị tạo bằng fixture chỉ chứng minh môi trường test. Xác nhận đường cấp quyền thật trước khi bật API cho người dùng.

- [ ] Kiểm thử body rỗng, JSON hỏng và ID âm.

### Kiểm tra cuối

- [ ] Chạy `./mvnw test` với Docker và MySQL Testcontainers. Ghi số test chạy, lỗi và phần bị chặn nếu có.
- [ ] Đối chiếu năm endpoint với bảng hợp đồng. Kiểm tra lại đặc biệt các ca sai quyền, sai format, update giữ cặp cũ, cập nhật trùng, hai write cạnh tranh và dữ liệu trang rỗng.
- [ ] Cập nhật `API_SPEC.md` và `DATABASE.md` theo mã sau khi các đề xuất thành quyết định. Ghi tiến độ theo bằng chứng từ test và đánh dấu riêng mốc Role/RBAC.

**Việc đầu tiên.** Hoàn thành mapping và repository ở mốc A, biên dịch rồi gửi review.
