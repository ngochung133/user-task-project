package com.example.hrmanagement.feature.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Builder 
public record LoginResponseDTO(
    String accessToken,
    String refreshToken
) {
} 


