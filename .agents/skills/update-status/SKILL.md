---
name: update-status
description: Use when asked to record CRUD HR project status or when a feature workflow requires a status update.
---

# Cập nhật tiến độ HR

1. Đọc `docs/PROJECT-STATUS.md`. Xác nhận phần đã làm bằng diff, mã và kết quả test mới nhất của chính repo này.
2. Ghi ngày phiên, hạng mục đã có, phần đang dở hoặc chưa bắt đầu, điểm cần chốt và task tiếp theo. Giữ ADR đề xuất và roadmap ở nhóm tương lai cho tới khi có triển khai.
3. Chỉ ghi test pass khi có kết quả chạy. Nếu chỉ kiểm tra tĩnh, ghi rõ. Ví dụ, Permission hoàn thành trong repo tham chiếu vẫn là chưa triển khai ở repo này cho đến khi mã và test tương ứng xuất hiện.
4. Chỉnh đúng file status trong phạm vi được giao. Việc cập nhật status không bao gồm stage, commit, push hay thay đổi source.
