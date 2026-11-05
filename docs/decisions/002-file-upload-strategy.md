# ADR-002 · Upload avatar và logo

**Trạng thái** Đề xuất. Repo hiện chưa có upload.

## Đề xuất

Lưu avatar/logo ở thư mục riêng cấu hình được. API upload dự kiến là `POST /api/v1/files` với multipart. Service trả định danh file để client cập nhật User hoặc Company ở bước riêng. Dùng tên file do server sinh và whitelist loại ảnh, kiểm tra nội dung, dung lượng và đường dẫn đích. Thực thi quyền upload ở tầng API.

## Cần chốt trước khi làm

- Chốt giới hạn dung lượng, loại ảnh, quyền đọc file và URL trả về. Chỉ mở đường dẫn đọc công khai nếu phạm vi truy cập đã được duyệt.
- Chốt vòng đời file khi thay avatar/logo, khi upload xong nhưng chưa gắn vào bản ghi và khi rollback thao tác ghi.
- Xác nhận thư mục tồn tại qua lần deploy lại. Khi cần nhiều instance, quyết định lưu trữ dùng chung trong ADR riêng.
- Tiêu chí test gồm upload hợp lệ, file quá lớn, loại hoặc nội dung sai, path traversal và truy cập trái quyền.
