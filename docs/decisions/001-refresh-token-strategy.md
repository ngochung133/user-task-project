# ADR-001 · Refresh token cho SPA và mobile

**Trạng thái** Đề xuất. Repo hiện cấp access token từ `POST /auth/login`.

## Đề xuất

Giữ access token qua Bearer. SPA nhận refresh token qua cookie HttpOnly, Secure và giới hạn Path. Mobile gửi refresh token qua JSON body. Thiết kế hợp đồng theo loại client để SPA không đồng thời nhận refresh token đọc được từ response JSON. Chốt hành vi khi request cung cấp cả hai nguồn.

Lưu hash của refresh token, chủ sở hữu, thời hạn và trạng thái thu hồi trong MySQL. Khi refresh, xử lý rotation và ghi token mới trong một transaction. Khi logout, thu hồi refresh token tương ứng và xóa cookie nếu có.

## Cần chốt trước khi làm

- Chốt loại refresh token, thời hạn, thuật toán và khóa ký access token, cũng như tác động lên JWT hiện tại.
- Chốt topology SPA/API, SameSite, CORS và cơ chế CSRF cho route có cookie theo cách triển khai thực tế.
- Chốt hành vi retry hoặc tái sử dụng token cũ, logout theo phiên hay toàn bộ phiên, và cleanup token hết hạn.
- Tiêu chí test gồm SPA, mobile, token hết hạn hoặc bị thu hồi, refresh đồng thời, logout và xác nhận refresh token không dùng được như Bearer access token.
