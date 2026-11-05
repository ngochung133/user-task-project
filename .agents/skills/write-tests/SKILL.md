---
name: write-tests
description: Use when adding unit or HTTP integration tests for an existing CRUD HR module or security behavior.
---

# Viết test cho HR API

1. Đọc contract hiện hành, mã nguồn, test và module context. Liệt kê hành vi cần bảo vệ theo entry point. Đặt test theo cây test trong `docs/PROJECT-RULES.md` và dùng JUnit/Mockito cho service.
2. Dùng MockMvc, `@SpringBootTest`, `@AutoConfigureMockMvc`, `@ActiveProfiles("test")` và import `MySqlTestConfiguration` cho integration test cần DB. Tận dụng fixture Auth và MySQL Testcontainers đang có. Kiểm tra `docs/PROJECT-RULES.md` cho quy tắc datasource.
3. Kiểm tra status/body và hiệu ứng lưu trữ khi có write. Bao phủ ca thành công, lỗi validation, not found, conflict và xác thực theo endpoint. Thêm `403` khi policy quyền đã triển khai.
4. Chạy test mục tiêu bằng `./mvnw -Dtest=TenLopTest test`, rồi suite phù hợp. Nếu Docker thiếu, chạy phần độc lập có thể chạy và ghi rõ integration test bị chặn. Chỉ báo pass từ kết quả chạy của phiên. Tuyệt đối tránh trỏ `create-drop` vào DB mặc định hoặc dùng H2 để thay MySQL.
