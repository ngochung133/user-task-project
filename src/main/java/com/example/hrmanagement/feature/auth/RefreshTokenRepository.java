package com.example.hrmanagement.feature.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.LockModeType;

@Repository 
public interface RefreshTokenRepository extends JpaRepository<RefreshToken,Long> {

//Ngăn hai request cùng sử dụng một refresh token.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByToken(String token);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM refresh_tokens WHERE expires_at < NOW()", nativeQuery = true)
    int deleteExpiredTokens();
}
