# Kết quả Postman — 2026-11-08

Đã import `HR Management - API Tests` vào Postman desktop và chạy bằng Collection Runner tại workspace đang mở của người dùng.

- Thời điểm hiển thị trong Postman: 00:15:12, múi giờ Asia/Ho_Chi_Minh.
- Base URL: `http://localhost:8080`.
- Local / Functional, 1 iteration, đủ 34 request, No Environment.
- 73 assertion: **66 passed, 7 failed**, 0 execution errors.
- Thời gian: 2 giây 382 ms; response trung bình 35 ms.

## Các request có assertion thất bại

| Request | Kỳ vọng | Thực tế | Assertion thất bại |
|---|---|---|---|
| 17 — Update company keeping same name | 200, address cập nhật | 409 Conflict | 3: status, envelope data, address |
| 29 — Update permission using path ID | 200, đúng ID/name | 500 Internal Server Error | 3: status, envelope data, ID/name |
| 30 — Verify permission update persisted | Tên Permission đã cập nhật | 200 nhưng vẫn tên cũ | 1: tên đã lưu |

Đây là 7 assertion thất bại trong 3 request, tương ứng hai luồng cập nhật bị lỗi; các lỗi đọc `data` là hệ quả của response lỗi, không phải ba nguyên nhân độc lập.

Đối chiếu mã nguồn ở thời điểm chạy:

- `CompanyServiceImpl.update()` kiểm tra `existsByName()` mà chưa loại bản ghi đang sửa, nên giữ tên cũ bị báo trùng.
- `PermissionController.updatePermission()` truyền `null` thay vì ID trên path vào service, nên update trả lỗi và dữ liệu không thay đổi.

## Cleanup đã kiểm chứng

- Company được xóa; request list tiếp theo xác nhận không còn fixture. Xóa lại ID đó trả 404 và assertion đạt.
- Permission được xóa; GET theo ID trả 404.
- User test được xóa; list xác nhận không còn User test.

Login/JWT, User CRUD, Company validation và các test khác đều đạt các assertion đã khai báo. Kết quả chỉ phản ánh lượt chạy này và các case trong collection; không xác nhận toàn bộ API đã hoàn thiện.

Không sửa mã Java trong lượt tạo và chạy Postman. Báo cáo không chứa JWT, mật khẩu hay response danh sách người dùng.
