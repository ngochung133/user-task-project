package com.example.crud.model.dto.request;

import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDTO {

    @NotBlank(message = "Email can not be null")
    @Email(message = "email format is incorrect")
    private String email;

    @NotBlank (message = "password can not be null")
    @Size(min = 6, message = "password length min = 6")
    private String password;

    
}
