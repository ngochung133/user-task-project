package com.example.hrmanagement.feature.role.dto;

import java.time.Instant;
import java.util.List;

import org.hibernate.mapping.Set;

import com.example.hrmanagement.feature.permission.dto.PermissionResponseDTO;
import com.example.hrmanagement.feature.role.Role;

public record RoleResponseDTO(

    Long id,

    String name,

    String description,

    List<PermissionResponseDTO> permisisons,

    Instant createdAt,

    Instant updatedAt
    
) {
    public static RoleResponseDTO fromEntity(Role role){

        List<PermissionResponseDTO> permissions = role.getPermissions()
        .stream()
        .map(permisison -> PermissionResponseDTO.fromEntity(permisison)).toList();

        return new RoleResponseDTO(role.getId(),
        role.getName(),
        role.getDescription(),
        permissions,
        role.getCreatedAt(),
        role.getUpdateAt());
    }
}  



