---
name: write-context
description: Use when creating or updating implementation context for an existing CRUD HR feature module.
---

# Ghi CONTEXT của module

1. Kiểm tra module tồn tại, đọc mã, test, API/schema và ADR liên quan. Nếu module mới nằm trong roadmap, ghi nhận nó chưa có context triển khai và dừng. Thiết kế module tương lai thuộc docs hoặc ADR.
2. Đặt `CONTEXT.md` trong package hiện có của module khi được yêu cầu. Ghi **Mục đích**, **Quyết định và lý do**, **Phụ thuộc**, **Giới hạn**, **Refactor Log**. Dẫn file hoặc test cho quyết định quan trọng.
3. Khi cập nhật, giữ lịch sử và thêm mục có ngày vào Refactor Log. Tách điều đã triển khai khỏi đề xuất chưa được duyệt. Hoàn thành khi từng khẳng định về hành vi đều đối chiếu được với mã hoặc test.
