# ADR-003 · Package theo feature cho mã ứng dụng

**Trạng thái** Đã chấp nhận.

## Quyết định

Dùng bố cục của dự án tham chiếu Hỏi Dân IT cho mã ứng dụng. Đặt controller, entity, repository, service interface và implementation cạnh nhau trong `feature/<feature>/`, với DTO trong `dto/` của feature. Đặt cấu hình, bảo mật, DTO dùng chung và exception ở cấp ứng dụng.

Giữ cây test theo trách nhiệm ban đầu của repo `hr-management`. Integration test HTTP nằm trong `controller/`, unit test nghiệp vụ trong `service/`, helper trong `helper/` và cấu hình test trong `config/`.

## Hệ quả

Thay đổi package giữ nguyên các điểm vào HTTP, schema, cấu hình test và nghiệp vụ hiện có. `UserServiceTest` vẫn kiểm thử `UserServiceImpl`. [Cấu trúc hiện tại](../ARCHITECTURE.md)
