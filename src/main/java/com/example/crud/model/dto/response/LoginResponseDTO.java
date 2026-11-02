package com.example.crud.model.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter 
@Getter 
@NoArgsConstructor 
@AllArgsConstructor 
public class LoginResponseDTO {

    private String accessToken;
    private String tokenType;
    private long tokenExpiration;

}
