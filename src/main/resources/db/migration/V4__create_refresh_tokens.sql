CREATE TABLE refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token VARCHAR(512) NOT NULL,
    user_id BIGINT NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    revoked BIT(1) NOT NULL DEFAULT b'0',
    device_info VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255) NOT NULL,
    created_at DATETIME(6) NULL,

    PRIMARY KEY (id),
    CONSTRAINT uk_refresh_tokens_token UNIQUE (token),
    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

-- COLLATE=utf8mb4_0900_ai_ci 
-- Quy định cách so sánh và sắp xếp chuỗi, bao gồm kiểm tra UNIQUE:
-- 0900: dựa trên quy tắc Unicode phiên bản 9.0.
-- ai: không phân biệt dấu.
-- ci: không phân biệt chữ hoa/chữ thường.

-- ENGINE=InnoDB
-- Chọn cơ chế lưu trữ cho bảng. InnoDB hỗ trợ transaction, rollback và khóa ngoại, 
-- phù hợp với việc lưu user/token trong repo của bạn.

