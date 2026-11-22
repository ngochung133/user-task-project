package com.example.hrmanagement.config;

import com.example.hrmanagement.feature.auth.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ScheduledTasks {

    private static final Logger log = LoggerFactory.getLogger(ScheduledTasks.class);
    private final RefreshTokenRepository refreshTokenRepository;

    @Scheduled(cron = "0 0 2 * * *", zone = "Asia/Ho_Chi_Minh")
    // @Scheduled(fixedRate = 10_000) 
    public void cleanupExpiredRefreshTokens() {
        int deletedCount = refreshTokenRepository.deleteExpiredTokens();
        log.info("Deleted {} expired refresh tokens", deletedCount);
    }
}
