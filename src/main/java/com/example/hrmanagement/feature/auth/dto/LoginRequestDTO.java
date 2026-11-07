package com.example.hrmanagement.feature.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter 
@Getter
@NoArgsConstructor 
@AllArgsConstructor 
@Builder 
public class LoginRequestDTO {

    @NotBlank (message = "email can not be blank")
    @Email (message = "email has to be correct format")
    private String email;
    
    @NotBlank (message = "password can not be blank")
    @Size (min = 6, message = "password length min = 8")
    private String password;
}
