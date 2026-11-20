package com.example.hrmanagement.feature.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

@Repository 
public interface RefreshTokenRepository extends JpaRepository<RefreshToken,Long> {

//Ngăn hai request cùng sử dụng một refresh token.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByToken(String token);
}
