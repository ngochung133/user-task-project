# Kiến trúc HR Management API

## Hiện trạng

`CrudApplication` nằm ở `com.example.crud` và scan các package bên dưới. AuthController gọi AuthenticationManager và JwtService. UserController gọi UserService qua interface, còn UserServiceImpl dùng UserRepository để truy cập MySQL. [Entry point](../src/main/java/com/example/crud/CrudApplication.java) · [Mã ứng dụng](../src/main/java/com/example/crud/)

## Cấu trúc feature-based hiện tại

```text
src/main/java/com/example/crud/
├── CrudApplication.java
├── global/
│   ├── config/              # SecurityConfig
│   ├── exception/           # Exception và advice dùng chung
│   └── shared/              # ApiResponse
└── modules/
    ├── auth/
    │   ├── controller/      # AuthController
    │   ├── dto/             # Login request và response
    │   ├── security/        # UserDetailsService
    │   └── service/         # JwtService
    └── user/
        ├── controller/      # UserController
        ├── dto/             # User request và response
        ├── entity/          # User
        ├── mapper/          # UserMapper
        ├── repository/      # UserRepository
        └── service/
            ├── UserService.java
            └── impl/
                └── UserServiceImpl.java
```

Mỗi module tạo package theo nhu cầu thực tế. Test mirror package tương ứng trong `src/test/java`. Dùng `global/util/` khi có utility thực sự dùng chung.

## Mở rộng theo roadmap

Permission, Company, Role và File sẽ nằm trong các package riêng dưới `modules/` khi được triển khai. Permission và Company là hai module độc lập. Role quản lý liên kết tới Permission. User tham chiếu Company và Role. Auth dùng dữ liệu User để xác thực. Khi RBAC được triển khai, tầng security điều phối kiểm tra quyền qua hợp đồng của module. Giữ chiều phụ thuộc một chiều và tránh vòng lặp. [Schema đích](DATABASE.md)

## Tách service thành interface và implementation

1. Đưa các chữ ký nghiệp vụ mà caller cần vào interface trong `service/`. [UserService](../src/main/java/com/example/crud/modules/user/service/UserService.java)
2. Đưa nghiệp vụ và dependency vào class `implements` trong `service/impl/`. Đặt `@Service` trên class và `@Override` trên các phương thức thực thi hợp đồng. Dùng mapper cho phần chuyển entity sang response khi được tái sử dụng. [UserServiceImpl](../src/main/java/com/example/crud/modules/user/service/impl/UserServiceImpl.java) · [UserMapper](../src/main/java/com/example/crud/modules/user/mapper/UserMapper.java)
3. Khai báo kiểu interface trong field và constructor của controller. Spring tiêm implementation khi có đúng một bean phù hợp. [UserController](../src/main/java/com/example/crud/modules/user/controller/UserController.java)
4. Trong unit test, `@InjectMocks` khởi tạo class implementation và truyền các dependency đã mock. Integration test kiểm tra việc wiring thông qua HTTP. [UserServiceImplTest](../src/test/java/com/example/crud/modules/user/service/impl/UserServiceImplTest.java)

## Xác thực và phân quyền

**Hiện tại.** Spring Security dùng BCrypt, JWT HS256 qua Nimbus, Bearer Resource Server và session stateless. Người dùng đăng nhập qua email. Token có subject là email và claim `roles` chứa authority `ROLE_USER`, sinh từ role `USER` gán cố định. Chain kiểm tra đã xác thực, chưa có policy Role–Permission. Xem quyền truy cập từng route ở [API_SPEC.md](API_SPEC.md).

**Đích.** Tách đăng ký khỏi tạo nhân sự do admin. Lấy role từ dữ liệu người dùng và kiểm tra permission theo HTTP method + route đã chuẩn hóa. Kiểm thử route có biến, truy cập ẩn danh và truy cập thiếu quyền. Tránh cấp quyền chỉ vì path có cùng tiền tố. Chốt chiến lược JWT và xác thực lại trước khi chuyển sang [refresh token](decisions/001-refresh-token-strategy.md).
