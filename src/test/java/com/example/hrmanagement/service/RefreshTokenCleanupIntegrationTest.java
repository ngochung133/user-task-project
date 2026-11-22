package com.example.hrmanagement.service;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.auth.RefreshTokenRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(MySqlTestConfiguration.class)
class RefreshTokenCleanupIntegrationTest {

    @Autowired
    private RefreshTokenRepository repository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @AfterEach
    void resetDatabaseClock() {
        jdbcTemplate.execute("SET timestamp = 0");
    }

    @Test
    @DisplayName("Chỉ xóa token đã hết hạn, giữ token bằng NOW và token chưa hết hạn dù đã revoked")
    void deletesOnlyTokensStrictlyBeforeDatabaseNow() {
        // Freeze MySQL's session clock so the equality boundary cannot race the test.
        jdbcTemplate.execute("SET timestamp = 1800000000");
        User user = new User();
        user.setName("Cleanup test");
        user.setEmail("cleanup@example.com");
        user.setPassword("test-password-hash");
        user.setAddress("Ha Noi");
        Long userId = userRepository.saveAndFlush(user).getId();
        jdbcTemplate.update("""
                INSERT INTO refresh_tokens (token, user_id, expires_at, revoked, device_info, ip_address)
                VALUES ('expired', ?, NOW() - INTERVAL 1 SECOND, false, 'test', '127.0.0.1'),
                       ('expired-revoked', ?, NOW() - INTERVAL 1 DAY, true, 'test', '127.0.0.1'),
                       ('equal-now', ?, NOW(), false, 'test', '127.0.0.1'),
                       ('future', ?, NOW() + INTERVAL 1 DAY, false, 'test', '127.0.0.1'),
                       ('future-revoked', ?, NOW() + INTERVAL 1 DAY, true, 'test', '127.0.0.1')
                """, userId, userId, userId, userId, userId);

        assertThat(repository.deleteExpiredTokens()).isEqualTo(2);
        assertThat(jdbcTemplate.queryForList("SELECT token FROM refresh_tokens", String.class))
                .containsExactlyInAnyOrder("equal-now", "future", "future-revoked");
        assertThat(userRepository.existsById(userId)).isTrue();
    }

    @Test
    @DisplayName("Cleanup bảng token rỗng trả số dòng xóa bằng 0")
    void emptyTableDeletesNothing() {
        assertThat(repository.deleteExpiredTokens()).isZero();
    }
}
