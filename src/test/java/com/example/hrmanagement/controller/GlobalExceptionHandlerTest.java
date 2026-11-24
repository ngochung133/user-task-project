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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

    @Test
    @DisplayName("Vi phạm ràng buộc DB trả 409 Conflict và không lộ chi tiết SQL")
    void dataIntegrityViolationReturnsConflictWithoutSqlDetails() {
        var response = new GlobalExceptionHandler().handleDataIntegrityViolation(
                new DataIntegrityViolationException("wrapper",
                        new RuntimeException("Duplicate entry 'test' for key 'companies.UK_name'")));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatusCode()).isEqualTo(409);
        assertThat(response.getBody().getMessage()).doesNotContain("UK_name");
    }

    @Test
    @DisplayName("File vượt giới hạn multipart trả 413 Content Too Large")
    void maxUploadSizeReturns413() {
        var response = new GlobalExceptionHandler().handleMaxUploadSize(
                new MaxUploadSizeExceededException(8_388_608L));

        assertThat(response.getStatusCode().value()).isEqualTo(413);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatusCode()).isEqualTo(413);
    }

    @Test
    @DisplayName("Thiếu multipart part trả 400 Bad Request")
    void missingPartReturns400() {
        var response = new GlobalExceptionHandler().handleMissingRequestPart(
                new MissingServletRequestPartException("file"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatusCode()).isEqualTo(400);
    }

    @Test
    @DisplayName("Tài nguyên tĩnh hoặc đường dẫn không tồn tại trả 404 và chỉ ghi WARN")
    void noResourceFoundReturns404AndLogsWarning() {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            var response = new GlobalExceptionHandler().handleNoResourceFound(
                    new NoResourceFoundException(
                            HttpMethod.GET,
                            "/uploads/logos/nnh-entertainment.png",
                            "uploads/logos/nnh-entertainment.png"));

            assertThat(response.getStatusCode().value()).isEqualTo(404);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().getStatusCode()).isEqualTo(404);
            assertThat(response.getBody().getError()).isEqualTo("NOT_FOUND");
            assertThat(appender.list).singleElement().satisfies(event -> {
                assertThat(event.getLevel()).isEqualTo(Level.WARN);
                assertThat(event.getThrowableProxy()).isNull();
            });
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
