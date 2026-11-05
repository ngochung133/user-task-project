# Quy ước phát triển HR Management API

Áp dụng cho mã mới và phần được yêu cầu chuyển đổi. Dùng mã và test của repo này để xác nhận hành vi hiện tại. Các thiết kế mang nhãn **Đích** hoặc **Đề xuất** chỉ mô tả công việc tương lai. Khi tài liệu lệch với mã hoặc ADR, ghi rõ tác động và chốt phần ảnh hưởng đến thay đổi trước khi triển khai.

## Học và thực hành cùng AI

- Người học tự sửa mã và chạy test. AI giải thích kiến thức, đưa ví dụ trong chat, chỉ cách kiểm tra và review khi được yêu cầu. Khi áp dụng skill, giữ phạm vi hướng dẫn trừ khi người học giao rõ việc sửa file.
- Khi gặp kỹ thuật thực tế liên quan đến task, giải thích bằng tình huống trong repo. Chỉ bổ sung vào quy ước những điểm có điều kiện áp dụng cụ thể và có thể kiểm tra.

## Package và đặt tên

- Dùng `com.example.crud.feature.<feature>` cho feature mới. Đặt controller, entity, repository, service interface và implementation trực tiếp trong package feature. Đặt DTO trong `feature/<feature>/dto/`. Đặt thành phần dùng chung ở `config/`, `dto/`, `exception/` và `security/` cấp ứng dụng. Xem [cây package và ví dụ service](ARCHITECTURE.md).
- Dùng `<Feature>Controller`, `<Feature>Service`, `<Feature>ServiceImpl`, `<Feature>Repository`, `<Action><Feature>Request` và `<Feature>Response`. Tên Java dùng PascalCase cho lớp, camelCase cho biến/phương thức, UPPER_SNAKE_CASE cho hằng số và snake_case cho bảng/cột.
- Constructor injection tường minh với field `final` cho component mới. Giữ Lombok đang dùng trong các lớp cũ cho tới khi task yêu cầu chuyển đổi. Tránh `@Data` trên JPA entity.

## HTTP và nghiệp vụ

- Controller nhận request, dùng `@Valid` với `@RequestBody`, gọi service interface và trả `ResponseEntity<ApiResponse<T>>` cho API JSON mới. Dùng factory và JSON envelope của repo. Kiểm tra status và field thực tế trước khi sửa endpoint hiện hữu.
- DTO mới dùng Java `record` và request có Jakarta Validation. Service trả DTO, dùng mapper của module khi cần tái sử dụng logic ánh xạ. Loại mật khẩu, hash và khóa ký khỏi response và log. Chỉ trả token qua hợp đồng Auth được định nghĩa và luôn loại token khỏi log.
- Service giữ nghiệp vụ và đặt `@Transactional` ở phương thức ghi. Repository dùng Spring Data derived query hoặc JPQL khi cần, trả `Optional<T>` cho truy vấn đơn có thể rỗng.
- API HR mới dùng tiền tố `/api/v1`. Thay đổi route, HTTP status, quyền truy cập hoặc response shape của API hiện có cần phạm vi và test tương thích rõ ràng. [Hợp đồng API](API_SPEC.md)
- Dùng exception nghiệp vụ và advice dùng chung. Trả `400` cho input không hợp lệ, `404` cho tài nguyên không tồn tại, `409` cho xung đột, `401` cho thiếu hoặc sai xác thực và `403` khi người đã xác thực thiếu quyền. Giữ stack trace và chi tiết SQL ở log nội bộ.

## Dữ liệu và bảo mật

- Khai báo constraint DB cho bất biến như email duy nhất hoặc cặp đường dẫn/phương thức duy nhất. Kiểm tra trước để trả lỗi rõ, dùng constraint để giữ đúng khi có ghi đồng thời.
- Entity mới có mapping bảng/cột rõ ràng, enum dùng `EnumType.STRING`, audit dùng `Instant` do Hibernate quản lý và relation mặc định LAZY khi có thể. Kiểm tra dữ liệu hiện hữu và ảnh hưởng của migration trước khi thêm constraint.
- Dùng BCrypt cho mật khẩu. Đọc secret từ môi trường hoặc secret store cho cấu hình mới. Tách xác thực JWT và phân quyền. Giữ Bearer JWT qua Spring Security Resource Server. Thay đổi thuật toán, TTL, public routes hoặc cookie/CSRF là thay đổi riêng có test và quyết định ghi rõ. [Kiến trúc bảo mật](ARCHITECTURE.md#xác-thực-và-phân-quyền)

## Kiểm thử và tài liệu

- Dưới `src/test/java/com/example/crud/`, đặt integration test HTTP trong `controller/`, unit test nghiệp vụ trong `service/`, helper trong `helper/` và cấu hình test trong `config/`. Dùng JUnit/Mockito và MockMvc. Đặt tên test theo hành vi, thêm `@DisplayName`. Bao phủ thành công, input lỗi, dữ liệu thiếu/trùng và quyền truy cập khi áp dụng. Kiểm tra cả trạng thái lưu nếu endpoint ghi dữ liệu.
- Integration test dùng profile `test`, MySQL Testcontainers qua `MySqlTestConfiguration` và Docker. Chỉ dùng `create-drop` trên schema test cô lập. Cấm H2 hoặc chuyển test sang datasource mặc định khi Docker thiếu. Chạy `./mvnw test` khi đủ điều kiện và báo đúng phần chạy được.
- Khi mục tiêu của integration test là xác minh commit hoặc rollback của service, gọi service qua bean Spring hoặc qua HTTP từ bên ngoài transaction do test quản lý. Kiểm tra trạng thái DB sau khi lời gọi kết thúc và dọn dữ liệu test riêng.
- Cập nhật [API_SPEC.md](API_SPEC.md) và [DATABASE.md](DATABASE.md) theo hợp đồng đã thay đổi. Ghi `CONTEXT.md` cho module có quyết định đáng lưu và ADR cho thay đổi kiến trúc. Ghi tiến độ bằng `$update-status` khi được yêu cầu hoặc khi workflow feature cần.
