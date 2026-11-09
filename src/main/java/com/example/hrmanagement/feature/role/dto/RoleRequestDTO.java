package com.example.hrmanagement.feature.role.dto;

import java.util.Set;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public  record RoleRequestDTO(
    
    @NotBlank (message = "Name can not be blank")
    String name,
    
    @NotBlank (message = "Description can not be blank")
    String description,

    @NotNull (message = "List permission can not be null")
    Set<@Positive @NotNull Long> permissionIds

) {
}



