# Tiến độ HR Management API

Cập nhật 2026-11-05. Baseline lấy từ mã và test trong repo `crud`.

## Hiện trạng

| Hạng mục | Mức triển khai |
|---|---|
| Nền tảng | Java 25, Spring Boot 4.1.1, Maven Wrapper, Spring MVC, JPA/MySQL, Jakarta Validation, Security Resource Server, response wrapper và global advice. |
| User | Có list/create/update/delete, BCrypt và response DTO. Còn nhận entity làm request, thiếu get theo ID, phân trang và quan hệ HR. |
| Auth | Có login bằng email/mật khẩu và Bearer JWT HS256, role cố định `USER`. Chưa có profile `/me`, refresh, logout hay phân quyền theo dữ liệu. |
| Kiểm thử | Unit test User và integration test Auth/User dùng MySQL Testcontainers 8.4 khi cần DB. `./mvnw -o clean test` chạy 28 test thành công sau khi chuyển sang `global/` và `modules/`. |
| Company, Permission, Role, RBAC, Upload | Chưa triển khai trong repo này. |
| Kiến trúc | Auth và User nằm trong `modules/`. Các thành phần dùng chung nằm trong `global/`. User có service interface, implementation và mapper. Test mirror package. Xem [ARCHITECTURE.md](ARCHITECTURE.md). |

Đối chiếu [POM](../pom.xml), [mã hiện tại](../src/main/java/com/example/crud/), [test](../src/test/java/com/example/crud/) và [API hiện hành](API_SPEC.md).

## Roadmap đề xuất

1. **Baseline và tách module · Hoàn thành.** Chuyển Auth và User sang `modules/`, gom thành phần dùng chung vào `global/`, tách User service và chạy suite bằng MySQL Testcontainers.
2. **Nền tảng bảo mật và dữ liệu.** Tách secret khỏi cấu hình mặc định. Chốt chính sách tạo/sửa User, tính duy nhất của email và kế hoạch dữ liệu trước khi mở rộng hợp đồng HR.
3. **Permission và Company.** Xây hai module CRUD độc lập, với validation, phân trang, DB constraint khi có và test JWT.
4. **Role và User HR.** Thêm quan hệ Role–Permission, User–Role, User–Company và API User có version theo hợp đồng được chốt.
5. **Auth hoàn chỉnh.** Thêm profile, đăng ký theo chính sách được duyệt, refresh/logout theo ADR được duyệt, rồi tích hợp kiểm tra quyền theo route và HTTP method.
6. **Upload và hoàn thiện.** Bổ sung avatar/logo theo ADR được duyệt, sau đó rà API, migration và test hồi quy.

## Điểm cần chốt khi đến phạm vi tương ứng

- Cấu hình mặc định chứa khóa JWT và mật khẩu DB dạng literal. Luồng hiện tại cấp JWT 24 giờ. Chốt cách chuyển secret/TTL và ảnh hưởng đến token đang dùng trong task bảo mật riêng.
- `POST /users` hiện public. Tách đăng ký khỏi tạo User do admin, và chốt danh sách trường được sửa, khi triển khai hợp đồng HR.
- Thời hạn refresh, cookie/CSRF, vòng đời token và cấu hình upload nằm trong ADR đề xuất. Tài liệu của dự án tham chiếu chỉ cung cấp mẫu.
