package com.example.crud.modules.user.mapper;

import com.example.crud.modules.user.dto.UserResponseDTO;
import com.example.crud.modules.user.entity.User;

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
