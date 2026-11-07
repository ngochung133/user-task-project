package com.example.hrmanagement.feature.company.dto;

import java.time.Instant;

import com.example.hrmanagement.feature.company.Company;

public record CompanyResponseDTO(
        Long id,
        String name,
        String description,
        String address,
        String logo,
        Instant createdAt,
        Instant updatedAt
) {
    public static CompanyResponseDTO fromEntity(Company company){
        return new CompanyResponseDTO(
            company.getId(),
            company.getName(),
            company.getDescription(),
            company.getAddress(),
            company.getLogo(),
            company.getCreatedAt(),
            company.getUpdatedAt());
    }
}


