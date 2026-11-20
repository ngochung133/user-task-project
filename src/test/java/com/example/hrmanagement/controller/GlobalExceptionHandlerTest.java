package com.example.hrmanagement.controller;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.BadCredentialsException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    @Test
    @DisplayName("Sai thông tin đăng nhập trả 401 và ghi WARN không lộ chi tiết xác thực")
    void badCredentialsReturnsUnauthorizedAndLogsWarning() {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            var response = new GlobalExceptionHandler().handleBadCredentials(
                    new BadCredentialsException("sensitive-authentication-detail"));

            assertThat(response.getStatusCode().value()).isEqualTo(401);
            assertThat(response.getBody()).isInstanceOfSatisfying(ApiResponse.class, body -> {
                assertThat(body.getStatusCode()).isEqualTo(401);
                assertThat(body.getError()).isEqualTo("Unauthorized");
                assertThat(body.getData()).isNull();
                assertThat(body.getMessage()).doesNotContain("sensitive-authentication-detail");
            });
            assertThat(appender.list).singleElement().satisfies(event -> {
                assertThat(event.getLevel()).isEqualTo(Level.WARN);
                assertThat(event.getFormattedMessage()).doesNotContain("sensitive-authentication-detail");
                assertThat(event.getThrowableProxy()).isNull();
            });
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
