# Quy ước phát triển HR Management API

Áp dụng cho mã mới và phần được yêu cầu chuyển đổi. Dùng mã và test của repo này để xác nhận hành vi hiện tại. Các thiết kế mang nhãn **Đích** hoặc **Đề xuất** chỉ mô tả công việc tương lai. Khi tài liệu lệch với mã hoặc ADR, ghi rõ tác động và chốt phần ảnh hưởng đến thay đổi trước khi triển khai.

## Học và thực hành cùng AI

- Người học tự sửa mã và chạy test. AI giải thích kiến thức, đưa ví dụ trong chat, chỉ cách kiểm tra và review khi được yêu cầu. Khi áp dụng skill, giữ phạm vi hướng dẫn trừ khi người học giao rõ việc sửa file.
- Khi gặp kỹ thuật thực tế liên quan đến task, giải thích bằng tình huống trong repo. Chỉ bổ sung vào quy ước những điểm có điều kiện áp dụng cụ thể và có thể kiểm tra.

## Package và đặt tên

- Dùng `com.example.hrmanagement.feature.<feature>` cho feature mới. Đặt controller, entity, repository, service interface và implementation trực tiếp trong package feature. Đặt DTO trong `feature/<feature>/dto/`. Đặt thành phần dùng chung ở `config/`, `dto/`, `exception/` và `security/` cấp ứng dụng. Xem [cây package và ví dụ service](ARCHITECTURE.md).
- Dùng `<Feature>Controller`, `<Feature>Service`, `<Feature>ServiceImpl`, `<Feature>Repository`, `<Action><Feature>Request` và `<Feature>Response`. Tên Java dùng PascalCase cho lớp, camelCase cho biến/phương thức, UPPER_SNAKE_CASE cho hằng số và snake_case cho bảng/cột.
- Dùng constructor injection với field `final` cho component mới. Dùng Lombok `@RequiredArgsConstructor` khi constructor chỉ nhận dependency và viết constructor tường minh khi cần logic khởi tạo riêng.
- Với DTO dạng class, dùng Lombok `@Getter` và `@Setter` theo nhu cầu đọc hoặc gán field. Với request dùng setter để nhận JSON, dùng `@NoArgsConstructor` khi cần khai báo constructor rỗng.
- Với JPA entity, dùng `@Getter` và `@NoArgsConstructor(access = AccessLevel.PROTECTED)`. Viết constructor và phương thức nghiệp vụ cho các thao tác tạo hoặc cập nhật. Giới hạn setter ở từng field thực sự cần gán và tránh `@Data` trên entity.

## HTTP và nghiệp vụ

- Controller nhận request, dùng `@Valid` với `@RequestBody`, gọi service interface và trả `ResponseEntity<ApiResponse<T>>` cho API JSON mới. Dùng factory và JSON envelope của repo. Kiểm tra status và field thực tế trước khi sửa endpoint hiện hữu.
- DTO mới mặc định dùng Java `record`. Đặt Jakarta Validation trên component của request. Service trả DTO, dùng mapper của module khi cần tái sử dụng logic ánh xạ. Loại mật khẩu, hash và khóa ký khỏi response và log. Chỉ trả token qua hợp đồng Auth được định nghĩa và luôn loại token khỏi log.
- Service giữ nghiệp vụ và đặt `@Transactional` ở phương thức ghi. Repository dùng Spring Data derived query hoặc JPQL khi cần, trả `Optional<T>` cho truy vấn đơn có thể rỗng.
- API HR mới dùng tiền tố `/api/v1`. Thay đổi route, HTTP status, quyền truy cập hoặc response shape của API hiện có cần phạm vi và test tương thích rõ ràng. [Hợp đồng API](API_SPEC.md)
- Dùng exception nghiệp vụ và advice dùng chung. Trả `400` cho input không hợp lệ, `404` cho tài nguyên không tồn tại, `409` cho xung đột, `401` cho thiếu hoặc sai xác thực và `403` khi người đã xác thực thiếu quyền. Giữ stack trace và chi tiết SQL ở log nội bộ.

## Permission

Áp dụng khi triển khai module Permission theo [API đích](API_SPEC.md#api-hr-đích) và [schema đích](DATABASE.md#mô-hình-hr-đích).

- Dùng request và response record riêng. Response có thể dùng `static fromEntity()` để ánh xạ trực tiếp các trường đã tải. `PUT /api/v1/permissions/{id}` lấy ID từ URL. Request body chỉ chứa các trường cần cập nhật.
- Bỏ khoảng trắng hai đầu và viết hoa `method`, `module` với `Locale.ROOT` trước khi kiểm tra allowlist và lưu. Allowlist ban đầu cho `method` gồm `GET`, `POST`, `PUT`, `PATCH`, `DELETE`. Với `module`, dùng mã feature `AUTH`, `USER`, `COMPANY`, `PERMISSION`, `ROLE`. Trả `400` cho giá trị ngoài allowlist. Lưu dưới dạng chuỗi.
- `apiPath` là mẫu đường dẫn ứng dụng bắt đầu bằng `/`, ví dụ `/api/v1/users/{id}`. Bỏ khoảng trắng hai đầu, giữ nguyên hoa/thường và từ chối URL đầy đủ, query string hoặc fragment. Dùng cùng giá trị đã chuẩn hóa khi kiểm tra trùng và lưu. Đặt unique constraint `(api_path, method)` ở MySQL và trả `409` khi trùng, kể cả khi hai yêu cầu ghi đồng thời. Dùng collation phù hợp với quy tắc so khớp đường dẫn.
- Dùng `Instant` cho `createdAt` và `updatedAt`, để Hibernate quản lý timestamp và trả thời gian UTC trong JSON.
- List mặc định sắp xếp theo `id ASC`. Nếu cho sắp xếp theo trường khác, dùng `id` làm tiêu chí phụ để giữ thứ tự ổn định giữa các trang.
- Khi triển khai Role, để Role sở hữu quan hệ ManyToMany qua bảng `role_permission`, với khóa chính ghép và FK tới hai bảng. Kiểm tra tất cả Permission ID trước khi lưu danh sách trong cùng giao dịch. Tránh cascade xóa thực thể ở đầu kia. Chốt cách xử lý Permission còn được gán trước khi triển khai DELETE.
- Dùng MySQL Testcontainers qua `MySqlTestConfiguration`. Kiểm tra method/module sai trả `400`, dữ liệu trùng sau chuẩn hóa trả `409`, `PUT` dùng ID trên URL, audit timestamp đọc lại đúng và phân trang giữ thứ tự khi giá trị sort bị trùng. Khi kiểm thử liên kết Role, xác nhận một Permission ID không tồn tại khiến toàn bộ thao tác gán thất bại.

## Upload logo công ty

Áp dụng khi triển khai upload logo theo [ADR-002](decisions/002-file-upload-strategy.md). ADR mô tả hợp đồng đề xuất.

- Tách upload ảnh và ghi Company thành hai bước. Upload trả tên file do server sinh. Client dùng tên đó cho trường `logo` trong request tạo hoặc cập nhật Company.
- Chỉ nhận thư mục trong allowlist, với `logos` là giá trị cho luồng logo. Kiểm tra file rỗng, dung lượng, phần mở rộng và nội dung ảnh thực tế. Dùng giới hạn multipart ở tầng HTTP và kiểm tra lại dung lượng trong service.
- Lấy thư mục gốc từ cấu hình. Sinh tên file duy nhất trên server, chuẩn hóa đường dẫn đích và kiểm tra file nằm trong thư mục logo trước khi ghi hoặc đọc. Hai request trùng tên gốc phải lưu được hai file riêng.
- Yêu cầu Bearer JWT cho upload. Đặt rule của endpoint upload trước matcher public `/api/v1/**`. Chỉ mở quyền đọc công khai cho route logo đã được chốt và kiểm thử.
- Kiểm thử upload và đọc ảnh hợp lệ, lưu đúng file, thiếu multipart part, file quá lớn, nội dung giả ảnh, path traversal, trùng tên gốc và request thiếu JWT.

## Dữ liệu và bảo mật

- Khai báo constraint DB cho bất biến như email duy nhất hoặc cặp đường dẫn/phương thức duy nhất. Kiểm tra trước để trả lỗi rõ, dùng constraint để giữ đúng khi có ghi đồng thời.
- Entity mới có mapping bảng/cột rõ ràng, enum dùng `EnumType.STRING`, audit dùng `Instant` do Hibernate quản lý và relation mặc định LAZY khi có thể. Kiểm tra dữ liệu hiện hữu và ảnh hưởng của migration trước khi thêm constraint.
- Dùng BCrypt cho mật khẩu. Đọc secret từ môi trường hoặc secret store cho cấu hình mới. Tách xác thực JWT và phân quyền. Giữ Bearer JWT qua Spring Security Resource Server. Thay đổi thuật toán, TTL, public routes hoặc cookie/CSRF là thay đổi riêng có test và quyết định ghi rõ. [Kiến trúc bảo mật](ARCHITECTURE.md#xác-thực-và-phân-quyền)

## Kiểm thử và tài liệu

- Dưới `src/test/java/com/example/hrmanagement/`, đặt integration test HTTP trong `controller/`, unit test nghiệp vụ trong `service/`, helper trong `helper/` và cấu hình test trong `config/`. Dùng JUnit/Mockito và MockMvc. Đặt tên test theo hành vi, thêm `@DisplayName`. Bao phủ thành công, input lỗi, dữ liệu thiếu/trùng và quyền truy cập khi áp dụng. Kiểm tra cả trạng thái lưu nếu endpoint ghi dữ liệu.
- Integration test dùng profile `test`, MySQL Testcontainers qua `MySqlTestConfiguration` và Docker. Chỉ dùng `create-drop` trên schema test cô lập. Cấm H2 hoặc chuyển test sang datasource mặc định khi Docker thiếu. Chạy `./mvnw test` khi đủ điều kiện và báo đúng phần chạy được.
- Khi mục tiêu của integration test là xác minh commit hoặc rollback của service, gọi service qua bean Spring hoặc qua HTTP từ bên ngoài transaction do test quản lý. Kiểm tra trạng thái DB sau khi lời gọi kết thúc và dọn dữ liệu test riêng.
- Cập nhật [API_SPEC.md](API_SPEC.md) và [DATABASE.md](DATABASE.md) theo hợp đồng đã thay đổi. Ghi `CONTEXT.md` cho module có quyết định đáng lưu và ADR cho thay đổi kiến trúc. Ghi tiến độ bằng `$update-status` khi được yêu cầu hoặc khi workflow feature cần.
