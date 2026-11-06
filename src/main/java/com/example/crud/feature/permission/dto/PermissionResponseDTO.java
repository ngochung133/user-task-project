package com.example.crud.feature.permission.dto;

import java.time.Instant;

import com.example.crud.feature.permission.Permission;

import lombok.Builder;

@Builder 
public record PermissionResponseDTO(
    Long id,
    String name,
    String apiPath,
    String method,
    String module,
    Instant createdAt,
    Instant updatedAt
) {
    public static PermissionResponseDTO fromEntity(Permission permission) {
        return new PermissionResponseDTO(
                permission.getId(),
                permission.getName(),
                permission.getApiPath(),
                permission.getMethod(),
                permission.getModule(),
                permission.getCreatedAt(),
                permission.getUpdateAt()
        );
    }
}
