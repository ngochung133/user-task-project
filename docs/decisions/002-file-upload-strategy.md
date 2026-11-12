# ADR-002 · Upload logo công ty

**Trạng thái** Đề xuất. Repo hiện nhận trường `logo` dạng chuỗi qua API Company. Upload avatar thuộc roadmap.

## Hợp đồng đề xuất

1. Gọi `POST /api/v1/files` với Bearer JWT và `multipart/form-data` gồm part `file` và `folder=logos`.
2. Khi lưu thành công, trả `201` qua `ApiResponse`. Phần `data` gồm `fileName`, `folder`, `fileUrl`, `size` tính bằng byte và `uploadedAt` theo UTC.
3. Client gửi `data.fileName` vào trường `logo` của `POST /api/v1/companies` hoặc `PUT /api/v1/companies/{id}`. Client dùng `fileUrl` để đọc ảnh qua `GET /uploads/logos/{fileName}`.

Trả `400` khi thiếu part hoặc dữ liệu sai, `401` khi thiếu hoặc sai JWT, `413` khi quá dung lượng và `404` khi file cần đọc không tồn tại.

## Lưu trữ và validation

- Lưu ảnh trên đĩa tại `${app.upload.base-dir}/logos`. Đề xuất mặc định là `uploads/logos` tính từ thư mục chạy ứng dụng. Khi deploy, chọn thư mục còn dữ liệu sau khi ứng dụng khởi động lại.
- Đề xuất tối đa 5 MiB mỗi file và 6 MiB mỗi request. Bắt đầu với JPEG (`.jpg`, `.jpeg`), PNG và GIF. Chỉ bổ sung WebP khi đã chọn cách kiểm tra nội dung tương ứng.
- Sinh tên file bằng UUID và phần mở rộng đã kiểm tra. Từ chối tên gốc chứa thành phần đường dẫn, ảnh có nội dung sai định dạng và đường dẫn đích thoát khỏi thư mục logo. Trả đúng kiểu MIME khi đọc ảnh.

## Cần chốt trước khi triển khai

- Quyền đọc logo. Đề xuất dùng Bearer JWT cho lượt đầu. Nếu cần hiển thị công khai, chốt phạm vi route đọc trước khi mở.
- Vòng đời file sau khi thay logo, xóa Company hoặc upload thành công nhưng lưu Company thất bại. Luồng hai bước có thể tạo file chưa được gắn với bản ghi.

[Quy ước upload logo](../PROJECT-RULES.md#upload-logo-công-ty)
