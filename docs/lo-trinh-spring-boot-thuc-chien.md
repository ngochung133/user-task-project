# Phụ lục thực chiến cho Task Manager API

**Áp dụng cho repo hiện tại:** Spring Boot 4.1.1, Java 25, Maven, Spring MVC, Data JPA, MySQL, Validation và Spring Security. Phần này bổ sung cho PDF *Lộ trình Spring Boot - Task Manager REST API* 13 trang. Học theo chặng; mỗi chặng chỉ xong khi code chạy, test đạt và bạn giải thích được quyết định chính.

## 1. Kiểm kê PDF và code hiện tại

| Chủ đề | PDF cũ | Repo hiện tại | Việc cần bổ sung |
|---|---|---|---|
| REST, DI, DTO, validation, JPA | Có lộ trình và ví dụ | Mới có khung, còn lỗi biên dịch | Bài tập theo endpoint, tiêu chí đạt và test |
| Xử lý lỗi, transaction, ownership | Có nguyên tắc | Handler đặt ngoài vùng quét component; service dở | Bài tập lỗi, transaction, phân quyền hai tài khoản |
| JWT, RBAC, refresh token | JWT có một chặng; RBAC và refresh token chưa thành bài riêng | Chưa triển khai | Bài tập security theo cấp độ, test từ chối và thu hồi |
| Swagger/OpenAPI | **Chưa có** | Chưa có dependency/cấu hình | Thêm tài liệu API chạy được và kiểm tra hợp đồng |
| Unit, web, repository, integration test | Có danh sách loại test ở trang 10-11 | Chỉ có `contextLoads()` | Ma trận test, ca biên, cơ sở dữ liệu MySQL thật bằng Testcontainers |
| Migration, cấu hình môi trường, CI, vận hành | Có nhắc ngắn | Chưa triển khai | Bài tập Flyway, profiles, secrets, Actuator, CI và README |

Repo hiện không biên dịch được: `UserController` và `UserService` viết dở; `User` có `@NotBlank(` chưa đóng; `UserRepository.exexistsByEmail` sai tên; `@NoArgsConstructor` không tiêm được `final UserRepository`. `GlobalExceptionHandler` nằm trong `com.example.exception`, ngoài cây package `com.example.crud` của `@SpringBootApplication`; kiểu trả về còn lồng `ResponseEntity`. Hai DTO và `AuthController` rỗng. `application.properties` chưa có datasource. Không sửa mọi thứ một lần: hoàn thành từng bài và giữ build xanh.

## 2. Cách học và thứ tự

Một buổi làm một lát cắt dọc nhỏ: đọc mục tiêu → tự viết contract HTTP → viết test thất bại có ý nghĩa → code → chạy test → gọi API bằng HTTP client → ghi lại điều chưa hiểu. AI được dùng để hỏi vì sao test sai hoặc review diff sau khi đã tự thử. Mỗi bài có **đầu ra** (file/API cụ thể), **ca kiểm tra** và **câu hỏi tự giải thích**. Không cần áp lịch bốn tuần; hoàn thành theo tiêu chí đạt.

Luồng chính: **0. Build → 1. User API → 2. Lỗi/validation → 3. Task/JPA/Flyway → 4. Authentication/ownership → 5. RBAC/refresh → 6. OpenAPI → 7. Vận hành/CI**. Viết test ngay ở bài liên quan; bài 7 chỉ hoàn thiện bộ test và pipeline. Những mục như cache, message queue, microservices là phần mở rộng, không phải điều kiện để một Task API nhỏ đạt chất lượng.

## Bắt đầu ngay với repo này

1. Chạy `./mvnw -q -DskipTests compile`, ghi lại **lỗi đầu tiên** thay vì sửa ngẫu nhiên tất cả file.
2. Sửa lần lượt `User.java` (annotation dở), `UserController.java` (khai báo method), `UserService.java` (constructor và method dở), rồi `UserRepository.java` (tên query method). Chạy lại compile sau mỗi thay đổi nhỏ.
3. Đưa `GlobalExceptionHandler` vào vùng quét của ứng dụng và bỏ kiểu `ResponseEntity` lồng; kiểm tra một lỗi 404 qua HTTP sau khi có endpoint.
4. Chuẩn bị MySQL/test datasource và biến môi trường theo README sẽ viết; chạy `./mvnw test`. Test `contextLoads()` chỉ chứng minh context khởi động, chưa chứng minh CRUD đúng.
5. Tạo **một** test đầu tiên `createUser_whenValid_returns201AndNoPassword`, rồi làm `POST /api/users` đủ để test xanh. Tiếp tục `createUser_whenDuplicateEmail_returns409`, `getUser_whenMissing_returns404` trước khi chuyển sang Task.

Giữ thay đổi thành các commit nhỏ. Nếu build còn đỏ vì một file viết dở, chưa cần thêm JWT, Swagger hay Docker vào code; các phần đó đã có bài riêng ở dưới.

## Bài 0 - Cứu bộ khung và hiểu Dependency Injection

**Đầu ra:** `./mvnw -q -DskipTests compile` thành công; ứng dụng khởi động được với MySQL local hoặc test profile. Sửa cú pháp ở ba file đang dở; đổi repository method thành `existsByEmailIgnoreCase`; dùng constructor injection rõ ràng; đưa exception/handler vào package con của `com.example.crud` hoặc cấu hình quét có chủ đích. Chọn một kiểu response lỗi, không lồng `ResponseEntity`. Rà dependency: OAuth2 Authorization Server dùng để *phát hành* token theo OAuth2; đừng giữ starter này chỉ vì API sẽ *xác minh* bearer JWT.

**Tự kiểm tra:** build sạch; `contextLoads` chạy với test datasource; có thể chỉ ra bean nào được Spring tạo và service nhận repository bằng cách nào. **Câu hỏi:** Vì sao `final UserRepository` với `@NoArgsConstructor` không phải constructor injection?

## Bài 1 - User API, DTO và HTTP contract

**Đầu ra:** `POST /api/users` (201), `GET /api/users/{id}` (200/404), `GET /api/users` (có page/size), `PUT /api/users/{id}` (200), `DELETE /api/users/{id}` (204). Tạo request DTO và response DTO; không nhận/trả JPA entity trực tiếp. Chuẩn hóa email trước khi lưu; database có unique constraint; response tuyệt đối không có password/hash. Sau khi thêm auth, thay API hồ sơ công khai bằng `/api/users/me` theo PDF gốc.

**Test cần viết:** `@WebMvcTest` + `MockMvc` cho status/JSON/validation; service unit test cho email trùng và ID không tồn tại; repository test cho email duy nhất và truy vấn không phân biệt hoa thường. Kiểm tra `POST` hợp lệ trả 201; tên rỗng trả 400; email trùng trả 409; ID lạ trả 404; JSON không có `password`. **Câu hỏi:** Controller, service và repository mỗi lớp giữ quyết định nào?

## Bài 2 - Validation và lỗi nhất quán

**Đầu ra:** request DTO có `@NotBlank`, `@Email`, `@Size`, `@Valid`; lỗi dùng một contract duy nhất (khuyến nghị `ProblemDetail` với `code` ổn định). Xử lý `MethodArgumentNotValidException`, lỗi tham số trực tiếp nếu dùng method validation, 404, 409 và lỗi bất ngờ. Không đưa SQL, stack trace hay dữ liệu nhạy cảm ra client. Đừng dựa riêng vào `existsByEmail`: vẫn cần unique constraint và xử lý xung đột khi hai request đồng thời.

**Test cần viết:** mỗi loại lỗi kiểm tra HTTP status, `code`, thông điệp an toàn và field lỗi; xác nhận lỗi 500 được log phía server nhưng body không lộ exception. **Câu hỏi:** Vì sao email trùng có thể xảy ra dù service đã gọi `existsByEmail`?

## Bài 3 - Task, JPA, pagination và migration

**Đầu ra:** `Task` có owner, title, description, status, dueDate; API CRUD + đổi status; truy vấn theo owner ngay trong repository; page size giới hạn và sort ổn định (`createdAt DESC, id DESC`). Viết Flyway `V1__create_users.sql`, `V2__create_tasks.sql` (nếu schema chưa có dữ liệu cần giữ); dùng `ddl-auto=validate` khi migration quản lý schema. Với MySQL, thêm `spring-boot-starter-flyway` và `org.flywaydb:flyway-mysql` theo tài liệu Boot; không dùng song song `schema.sql` để tạo cùng schema.

**Test cần viết:** repository test với MySQL Testcontainers và `@ServiceConnection`: A có 12 task, B có 2 task; trang 0 size 10 của A chứa 10 task, trang 1 chứa 2; B không thấy task A. Một full integration test kiểm tra migration chạy được trên database trống. Test `TODO` mặc định, status không hợp lệ trả 400, size > giới hạn trả 400. **Câu hỏi:** Vì sao `EnumType.STRING`, quan hệ LAZY và index `(owner_id, created_at, id)` hữu ích ở đây?

## Bài 4 - Đăng ký, đăng nhập và quyền sở hữu

**Đầu ra:** `POST /api/auth/register`, `POST /api/auth/login`, `/api/users/me`, `/api/tasks`. Băm password bằng `PasswordEncoder`; không log password/token. Chỉ lấy user ID từ danh tính đã xác thực; không tin `ownerId` trong body/query. Cấu hình `SecurityFilterChain` rõ public/private endpoints. Thêm `spring-boot-starter-oauth2-resource-server` để xác minh bearer JWT; nếu tự phát JWT để học, dùng `JwtEncoder`/`JwtDecoder` của Spring Security, không tự viết parser/filter chữ ký. Secret/khóa lấy từ môi trường, không commit. Nếu dùng identity provider ngoài, API chỉ cần Resource Server và không cần tự xây Authorization Server.

**Test cần viết:** không token → 401; token hợp lệ → 200; A tạo task X; B đọc/sửa/đổi trạng thái/xóa X → 404; B list không chứa X; thay `ownerId` trong JSON không chiếm được task. Test password lưu là hash, không phải bản rõ; JWT hết hạn bị từ chối. **Câu hỏi:** Authentication khác authorization thế nào? Vì sao có thể trả 404 cho task của người khác?

## Bài 5 - RBAC và refresh token (phần nâng cao của khóa học)

**Đầu ra:** hai role `USER`, `ADMIN`; thêm một endpoint quản trị nhỏ như `GET /api/admin/users`; đăng ký tự phục vụ luôn tạo `USER`, client không được chọn role. `USER` gọi admin endpoint → 403; `ADMIN` → 200. Thêm `POST /api/auth/refresh` và logout nếu muốn thực hành đúng chủ đề refresh token trong ảnh. Lưu **hash** refresh token, thời hạn và trạng thái thu hồi trong database; xoay vòng token khi refresh; refresh token cũ không dùng lại được; logout thu hồi token hiện hành. Thiết kế này là bài tập để hiểu vòng đời token, không phải bản thiết kế identity provider cho production.

**Test cần viết:** client gửi `role=ADMIN` khi register vẫn là USER; token USER không qua admin; refresh cũ bị từ chối sau rotation; token hết hạn/đã thu hồi bị từ chối. **Câu hỏi:** Vì sao RBAC không thay thế kiểm tra owner của từng Task?

## Bài 6 - Swagger/OpenAPI như một hợp đồng API

**Đầu ra:** thêm `org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.0` (springdoc công bố dòng 3.1.x-3.2.x tương thích Boot 4.1.x); xác nhận `/v3/api-docs` và Swagger UI chạy với cấu hình security của dự án. Tài liệu hóa từng endpoint: request/response schema, status 200/201/204/400/401/403/404/409, ví dụ lỗi, page/size/sort và Bearer JWT security scheme. Không mô tả password/hash trong response. Cho phép UI/docs ở môi trường học; ở môi trường khác quyết định rõ phạm vi truy cập.

**Bài thực hành:** từ Swagger UI đăng ký → đăng nhập → Authorize bearer → tạo Task → liệt kê → thử không token. Export JSON OpenAPI để review; so sánh contract với kết quả MockMvc. **Test cần viết:** smoke test `/v3/api-docs` trả JSON và có `/api/tasks`; web test của từng endpoint xác nhận status/schema chính, vì tài liệu tự sinh không chứng minh hành vi chạy đúng. **Câu hỏi:** Trường nào trong DTO đổi sẽ làm client cũ hỏng? Bạn sẽ version hoặc giữ tương thích ra sao?

## Bài 7 - Kiểm thử tự động, chạy dự án và vận hành

**Ba lớp kiểm thử:** (1) service unit test cho rule thuần; (2) web slice `@WebMvcTest` + `MockMvc` + `@MockitoBean` cho HTTP, validation và security; (3) `@DataJpaTest`/`@SpringBootTest` + MySQL Testcontainers cho query, mapping, migration và luồng xuyên tầng. Không viết test chỉ lặp lại code; ưu tiên ca lỗi, quyền và hợp đồng API. Lập bảng coverage theo use case, không chỉ phần trăm dòng.

**Cấu hình:** `application-local.properties` cho máy học, `application-test.properties` cho test, cấu hình production-like qua biến môi trường; dùng `@ConfigurationProperties` cho nhóm cấu hình riêng. Không commit mật khẩu/khóa. README ghi Java 25, cách chạy MySQL, biến môi trường, lệnh `./mvnw verify`, URL Swagger, tài khoản mẫu tạo thế nào và vài request `curl`.

**Vận hành:** thêm Actuator health/metrics; chỉ mở các management endpoint cần thiết và bảo vệ bằng security chain. Log có request/correlation ID, không chứa token/password; lỗi 5xx có log để truy tìm. Có Docker Compose cho MySQL local; một CI job dùng JDK 25 chạy `./mvnw --batch-mode verify`, bao gồm integration test với container, rồi đóng gói executable JAR. Dùng cùng lệnh verify ở máy cá nhân và CI.

**Definition of Done:** máy sạch có Java/Docker theo README chạy được dự án; migration dựng database trống; test tự động xanh; Swagger mô tả đúng endpoint; A không truy cập Task B; không có secret trong Git; health endpoint hoạt động và không công khai thông tin quản trị nhạy cảm.

## 3. Bài tổng hợp cuối khóa

**Đề:** Một người dùng tạo Task X, đổi trạng thái sang `IN_PROGRESS`, liệt kê theo trang, rồi đăng xuất. Một người khác không được nhìn thấy hoặc sửa X. Admin xem danh sách người dùng nhưng không tự động được sửa Task X nếu chưa có rule cho phép. Tài liệu OpenAPI phải hướng dẫn gọi toàn bộ luồng; CI chạy toàn bộ test.

**Nộp để tự review:** branch hoặc commit, README, OpenAPI JSON/link Swagger local, lệnh chạy test, bảng test case và ba quyết định kỹ thuật bạn tự giải thích: (1) ranh giới transaction, (2) quyền owner, (3) vòng đời token. Nếu không giải thích được, quay lại bài tương ứng dù test đang xanh.

## 4. Mở rộng sau khi lõi đã chắc

Chọn **một** hướng theo nhu cầu công việc: truy vấn hiệu năng (N+1, index, đo query), optimistic locking khi hai người sửa cùng Task, rate limiting cho login, cache dữ liệu đọc nhiều, tích hợp API ngoài có timeout/retry, hoặc async/event. Không thêm message broker hay microservices chỉ để làm dự án trông lớn hơn.

## Tài liệu đối chiếu theo phiên bản

- Spring Boot testing: https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html
- Spring Boot Testcontainers: https://docs.spring.io/spring-boot/reference/testing/testcontainers.html
- Spring Boot database initialization/Flyway: https://docs.spring.io/spring-boot/how-to/data-initialization.html
- Spring MVC validation: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html
- Spring MVC error responses: https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html
- Spring Security JWT Resource Server: https://docs.spring.io/spring-security/reference/7.0/servlet/oauth2/resource-server/jwt.html
- Spring Security Resource Server starter: https://docs.spring.io/spring-security/reference/7.0/servlet/oauth2/index.html
- Springdoc compatibility/setup: https://springdoc.org/faq.html và https://springdoc.org/getting-started.html
- Spring Boot profiles/config: https://docs.spring.io/spring-boot/reference/features/profiles.html và https://docs.spring.io/spring-boot/reference/features/external-config.html
- Spring Boot Actuator: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- GitHub Actions Maven: https://docs.github.com/en/actions/tutorials/build-and-test-code/java-with-maven
