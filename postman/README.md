# HR Management — Postman

Collection: `hr-management.postman_collection.json` (Postman Collection v2.1).

## Chạy lại

1. Khởi động dự án với MySQL và cấu hình môi trường hợp lệ.
2. Trong Postman, Import file collection nếu chưa có `HR Management - API Tests`.
3. Chọn collection → Run → Local, Functional, 1 iteration, No Environment.
4. Giữ đủ 34 request theo thứ tự. `baseUrl` mặc định là `http://localhost:8080`.
5. Tắt **Stop run if an error occurs** để các bước cleanup tiếp tục chạy; tắt **Keep variable values**, bật **Turn off logs during run**, bật **Run collection without using stored cookies**, tắt **Save cookies after collection run**.
6. Start run. Xem Passed / Failed trong kết quả.

Chỉ chạy với DB phát triển tại máy của bạn. Bộ request tạo tài khoản test riêng có email `postman-<runId>@example.test`, sinh mật khẩu test, login lấy JWT và ghi nhận ID Company/Permission mới tạo. Request cleanup chỉ xóa các ID vừa ghi nhận; tài khoản test bị xóa cuối lượt. Không cần nhập tài khoản thật hoặc khóa JWT vào file collection.

Nếu dừng giữa chừng, dữ liệu test có thể chưa được dọn. Xem kết quả các request tạo để lấy đúng ID và tên có runId của lượt đó, rồi dọn riêng các bản ghi test. Không dùng ID của dữ liệu có sẵn.

Các request `[regression]` kiểm tra hành vi mong muốn; chúng được giữ nguyên kỳ vọng khi API lỗi, không đổi kỳ vọng thành 409/500 để làm kết quả xanh.

## Phạm vi

- Auth: login đúng/sai, JWT và homepage.
- User: tạo, list, sửa, trùng email, validation và xóa.
- Company: CRUD hiện có, JWT, trùng tên, validation, lọc tên, phân trang, kiểm tra cập nhật đã lưu và xóa ID thiếu.
- Permission: CRUD, JWT, trùng path/method, validation, lọc và phân trang, kiểm tra cập nhật đã lưu.

Chỉ dùng route đang có trong mã nguồn; không tạo endpoint Role, refresh token hoặc get Company theo ID khi project chưa triển khai.

Kết quả chạy thực tế: xem `RUN-RESULTS.md`. Các trường hợp đồng thời, migration, tải lớn, và RBAC chưa nằm trong collection này.
