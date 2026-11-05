# Tiến độ HR Management API

Cập nhật 2026-11-05. Baseline lấy từ mã và test trong repo `crud`.

## Hiện trạng

| Hạng mục | Mức triển khai |
|---|---|
| Nền tảng | Java 25, Spring Boot 4.1.1, Maven Wrapper, Spring MVC, JPA/MySQL, Jakarta Validation, Security Resource Server, response wrapper và global advice. |
| User | Có list/create/update/delete, BCrypt và response DTO. Còn nhận entity làm request, thiếu get theo ID, phân trang và quan hệ HR. |
| Auth | Có login bằng email/mật khẩu và Bearer JWT HS256, role cố định `USER`. Chưa có profile `/me`, refresh, logout hay phân quyền theo dữ liệu. |
| Kiểm thử | Có 10 unit test User, 15 integration test User và 3 integration test Auth; integration test dùng MySQL Testcontainers 8.4. Báo cáo XML Surefire có sẵn ghi nhận 28 test, không lỗi và không bỏ qua. Lần chạy lại trong phiên này chưa chạy được test; xem ghi nhận bên dưới. |
| Company, Permission, Role, RBAC, Upload | Chưa triển khai trong repo này. |
| Kiến trúc | Auth và User nằm trong `feature/`. Các thành phần dùng chung nằm ở cấp ứng dụng. User có service interface, implementation và mapper. Test tổ chức theo trách nhiệm. Xem [ARCHITECTURE.md](ARCHITECTURE.md). |

Đối chiếu [POM](../pom.xml), [mã hiện tại](../src/main/java/com/example/crud/), [test](../src/test/java/com/example/crud/) và [API hiện hành](API_SPEC.md).

## Ghi nhận phiên 2026-11-05

- Đã đối chiếu diff và mã: Auth/User ở `feature/`; thành phần dùng chung ở `config/`, `dto/`, `exception/`, `security/`. Test ở `controller/`, `service/`, `helper/`, `config/`. Thay đổi package và tài liệu tương ứng đang có trong working tree, chưa commit. [ADR-003](decisions/003-feature-package-layout.md) đã chấp nhận bố cục này.
- Hợp đồng hiện tại vẫn dùng `/users` và `/auth/login`; tạo User public, các thao tác đọc/sửa/xóa User yêu cầu xác thực JWT, chưa phân quyền theo dữ liệu. Quy ước cho API HR mới là `/api/v1`, request DTO dạng record, validation và quyền theo hợp đồng được chốt; đây chưa phải hợp đồng đã triển khai cho User/Auth hiện hữu.
- Kiểm chứng phiên này: đã kiểm tra tĩnh mã, test và báo cáo XML trong `target/surefire-reports/`. Chạy `./mvnw -o test` thất bại trước khi chạy test vì không mở được file lock trong `~/.m2/repository/.locks/`. Chưa xác nhận lại suite trong phiên này; số 28 test thành công ở trên là kết quả báo cáo có sẵn.
- Chưa bắt đầu các mục roadmap 2–6. ADR refresh token và upload vẫn là đề xuất. Task tiếp theo là nền tảng bảo mật và dữ liệu: chốt cách đưa secret ra ngoài cấu hình, chính sách tạo/sửa User và kế hoạch unique email/migration trước khi triển khai phần phụ thuộc.

## Roadmap đề xuất

1. **Baseline và tách feature · Hoàn thành.** Đặt Auth và User trong `feature/` theo bố cục tham chiếu, giữ cây test ban đầu và chạy suite bằng MySQL Testcontainers.
2. **Nền tảng bảo mật và dữ liệu.** Tách secret khỏi cấu hình mặc định. Chốt chính sách tạo/sửa User, tính duy nhất của email và kế hoạch dữ liệu trước khi mở rộng hợp đồng HR.
3. **Permission và Company.** Xây hai module CRUD độc lập, với validation, phân trang, DB constraint khi có và test JWT.
4. **Role và User HR.** Thêm quan hệ Role–Permission, User–Role, User–Company và API User có version theo hợp đồng được chốt.
5. **Auth hoàn chỉnh.** Thêm profile, đăng ký theo chính sách được duyệt, refresh/logout theo ADR được duyệt, rồi tích hợp kiểm tra quyền theo route và HTTP method.
6. **Upload và hoàn thiện.** Bổ sung avatar/logo theo ADR được duyệt, sau đó rà API, migration và test hồi quy.

## Điểm cần chốt khi đến phạm vi tương ứng

- Cấu hình mặc định chứa khóa JWT và mật khẩu DB dạng literal. Luồng hiện tại cấp JWT 24 giờ. Chốt cách chuyển secret/TTL và ảnh hưởng đến token đang dùng trong task bảo mật riêng.
- `POST /users` hiện public. Tách đăng ký khỏi tạo User do admin, và chốt danh sách trường được sửa, khi triển khai hợp đồng HR.
- Thời hạn refresh, cookie/CSRF, vòng đời token và cấu hình upload nằm trong ADR đề xuất. Tài liệu của dự án tham chiếu chỉ cung cấp mẫu.
