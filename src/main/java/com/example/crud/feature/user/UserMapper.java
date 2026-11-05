package com.example.crud.feature.user;

import com.example.crud.feature.user.dto.UserResponseDTO;

public final class UserMapper {

    private UserMapper() {
    }

    public static UserResponseDTO toResponse(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .address(user.getAddress())
                .build();
    }
}
