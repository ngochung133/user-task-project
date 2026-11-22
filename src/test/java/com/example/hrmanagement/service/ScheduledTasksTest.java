package com.example.hrmanagement.service;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.example.hrmanagement.config.ScheduledTasks;
import com.example.hrmanagement.feature.auth.RefreshTokenRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;

import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.withSettings;
import static org.mockito.MockMakers.PROXY;

class ScheduledTasksTest {

    private final RefreshTokenRepository repository = mock(
            RefreshTokenRepository.class, withSettings().mockMaker(PROXY));

    @ParameterizedTest
    @ValueSource(ints = {0, 3})
    @DisplayName("Cleanup ghi INFO với số token đã xóa, kể cả khi không có token hết hạn")
    void cleanupLogsDeletedCount(int deletedCount) {
        when(repository.deleteExpiredTokens()).thenReturn(deletedCount);
        Logger logger = (Logger) LoggerFactory.getLogger(ScheduledTasks.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            new ScheduledTasks(repository).cleanupExpiredRefreshTokens();

            assertThat(appender.list).singleElement().satisfies(event -> {
                assertThat(event.getLevel()).isEqualTo(Level.INFO);
                assertThat(event.getFormattedMessage())
                        .isEqualTo("Deleted " + deletedCount + " expired refresh tokens");
            });
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    @DisplayName("Cleanup thất bại không ghi log xóa thành công")
    void cleanupDoesNotLogSuccessWhenDeleteFails() {
        when(repository.deleteExpiredTokens()).thenThrow(new IllegalStateException("Database unavailable"));
        Logger logger = (Logger) LoggerFactory.getLogger(ScheduledTasks.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            assertThatThrownBy(() -> new ScheduledTasks(repository).cleanupExpiredRefreshTokens())
                    .isInstanceOf(IllegalStateException.class);
            assertThat(appender.list).isEmpty();
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    @DisplayName("Lịch cleanup chạy lúc 02:00 giờ Việt Nam mỗi ngày")
    void cleanupRunsAtTwoAmVietnamTime() throws NoSuchMethodException {
        Scheduled scheduled = ScheduledTasks.class.getMethod("cleanupExpiredRefreshTokens")
                .getAnnotation(Scheduled.class);
        ZonedDateTime beforeRun = ZonedDateTime.parse("2026-11-22T01:59:59+07:00[Asia/Ho_Chi_Minh]")
                .withZoneSameInstant(ZoneId.of(scheduled.zone()));
        CronExpression cron = CronExpression.parse(scheduled.cron());

        ZonedDateTime nextRun = cron.next(beforeRun);
        assertThat(nextRun).isEqualTo(ZonedDateTime.parse("2026-11-22T02:00:00+07:00[Asia/Ho_Chi_Minh]"));
        assertThat(cron.next(nextRun))
                .isEqualTo(ZonedDateTime.parse("2026-11-23T02:00:00+07:00[Asia/Ho_Chi_Minh]"));
    }
}
