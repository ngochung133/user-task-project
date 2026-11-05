---
name: new-feature
description: Use when implementing a requested HR feature module in the CRUD project.
---

# Xây module HR

1. Đọc `AGENTS.md`, quy ước, roadmap, kiến trúc, API spec, schema và context module nếu có. Đối chiếu các dependency đã tồn tại. Xác định API, validation, quyền, invariant và ảnh hưởng schema của module được giao.
2. Nếu còn mâu thuẫn ảnh hưởng hợp đồng, báo điểm cần chốt và tiếp tục phần độc lập. Ví dụ, Company CRUD có thể độc lập, còn quy tắc xóa Company đã có User cần thống nhất cùng mapping User–Company.
3. Đặt mã mới theo cây package trong `docs/PROJECT-RULES.md`. Làm theo thứ tự entity/repository, DTO, service interface/implementation rồi controller. Dùng hạ tầng có sẵn của repo. Chuyển package legacy hoặc đổi hợp đồng hiện hữu chỉ khi đó là phạm vi được giao.
4. Áp dụng `$write-tests` cho service và HTTP. Đối chiếu các case hợp lệ, không hợp lệ, thiếu/trùng dữ liệu và quyền truy cập theo hợp đồng.
5. Cập nhật API/schema theo mã. Dùng `$write-context` khi có quyết định module cần lưu và `$update-status` để ghi trạng thái feature.
6. Báo các endpoint, thay đổi schema, lệnh đã chạy, kết quả và phần còn chờ. Một module chỉ được ghi hoàn thành khi deliverable và bằng chứng phù hợp với phạm vi.
