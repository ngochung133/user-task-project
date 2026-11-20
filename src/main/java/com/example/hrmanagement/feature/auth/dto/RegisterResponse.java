package com.example.hrmanagement.feature.auth.dto;

import java.time.Instant;

import com.example.hrmanagement.feature.user.User;

public record RegisterResponse(
    Long id,
    String name,
    String email,
    Integer age,
    String address,
    Instant createdAt,
    Instant updateAt
) {
    public static RegisterResponse fromEntity(User user){
        return new RegisterResponse(user.getId(),
            user.getName(),
            user.getEmail(),
            user.getAge(),
            user.getAddress(),
            user.getCreatedAt(),
            user.getUpdateAt());
    }
}


