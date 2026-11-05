# CRUD · HR Management API

Mục tiêu phát triển của repo `crud` là REST API quản lý nhân sự với User, Company, Role, Permission, Auth và RBAC. Các tài liệu Task Manager cũ là tư liệu học tập. Dùng roadmap HR trong [PROJECT-STATUS.md](docs/PROJECT-STATUS.md) để chọn công việc tiếp theo.

## Trước khi làm việc

1. Xác nhận Git root và đọc [PROJECT-RULES.md](docs/PROJECT-RULES.md) cùng [PROJECT-STATUS.md](docs/PROJECT-STATUS.md). Mọi đường dẫn trong repo tính từ thư mục chứa file này.
2. Đọc [ARCHITECTURE.md](docs/ARCHITECTURE.md) khi thêm module hoặc chuyển package. Đọc [API_SPEC.md](docs/API_SPEC.md) khi chạm API, [DATABASE.md](docs/DATABASE.md) khi chạm entity/schema và [ADR liên quan](docs/decisions/) khi chạm quyết định kiến trúc.
3. Đọc `CONTEXT.md` của module nếu có, rồi kiểm tra mã và test ở entry point hiện tại. Báo riêng hợp đồng đang chạy, quy ước cho thay đổi mới và thiết kế còn chờ chốt. Nếu tài liệu mâu thuẫn hoặc thiếu quyết định ảnh hưởng hợp đồng, nêu điểm cần chốt trước khi làm phần phụ thuộc.

Chỉ sửa trong phạm vi được giao. Với yêu cầu chỉ làm tài liệu, chỉ thêm hoặc sửa file tài liệu và hướng dẫn AI thuộc phạm vi yêu cầu. Với yêu cầu lập kế hoạch hoặc chuẩn bị feature, dừng ở hợp đồng, phạm vi và bước kiểm thử dự kiến. Việc chuyển package hoặc triển khai một mục roadmap cần yêu cầu thực hiện tương ứng.

## Skills của repo

Đọc toàn bộ skill phù hợp trước khi thực hiện. Dùng `$tên-skill` hoặc mở trực tiếp file khi công cụ chưa liệt kê skill.

| Skill | Khi dùng |
|---|---|
| [`$start`](.agents/skills/start/SKILL.md) | Onboarding, tiếp tục phiên hoặc chọn task |
| [`$new-feature`](.agents/skills/new-feature/SKILL.md) | Xây module HR được yêu cầu |
| [`$write-tests`](.agents/skills/write-tests/SKILL.md) | Bổ sung test cho mã hiện có |
| [`$review-pr`](.agents/skills/review-pr/SKILL.md) | Review PR hoặc diff được chỉ định |
| [`$write-context`](.agents/skills/write-context/SKILL.md) | Ghi ngữ cảnh hoặc thay đổi quan trọng của module |
| [`$update-status`](.agents/skills/update-status/SKILL.md) | Cập nhật tiến độ khi được yêu cầu hoặc khi là deliverable của feature |
