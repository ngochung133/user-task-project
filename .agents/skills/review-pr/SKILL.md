---
name: review-pr
description: Use when reviewing a pull request or a specified change range in the hr-management project.
---

# Review thay đổi HR API

1. Xác định PR, base/ref hoặc phạm vi diff người dùng yêu cầu. Kiểm tra staged, unstaged và untracked chỉ đọc. Nếu có nhiều phạm vi hợp lý, xác nhận phạm vi review trước khi quy kết finding.
2. Đọc yêu cầu, `docs/PROJECT-RULES.md` và context module. Trace từ route qua security, service, repository đến DB. So sánh hợp đồng trước/sau khi có thay đổi API hoặc migration.
3. Kiểm tra validation, DTO và dữ liệu nhạy cảm, quyền theo route/method, transaction, ghi đồng thời, tương thích với dữ liệu cũ, coverage và cách cô lập DB test.
4. Báo finding theo mức độ ảnh hưởng, mỗi finding có file/dòng, điều kiện tái hiện và hậu quả. Tách kiểm chứng đã thực hiện khỏi khoảng trống test. Với yêu cầu review, giữ thay đổi ở dạng nhận xét.
