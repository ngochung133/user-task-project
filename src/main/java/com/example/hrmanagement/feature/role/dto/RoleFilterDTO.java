package com.example.hrmanagement.feature.role.dto;

import java.util.Set;

public record RoleFilterDTO(
    String name,
    String description,
    Set<Long> permissionIds
) {
    
}


