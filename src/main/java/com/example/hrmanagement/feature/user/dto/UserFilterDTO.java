package com.example.hrmanagement.feature.user.dto;

import com.example.hrmanagement.feature.user.User.GenderEnum;

public record UserFilterDTO(
        Integer age,
        String name,
        String email,
        Integer minAge,
        Integer maxAge,
        GenderEnum gender) {
}
