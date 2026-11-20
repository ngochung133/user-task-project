package com.example.hrmanagement.feature.auth.dto;

import java.nio.charset.StandardCharsets;

import com.example.hrmanagement.feature.user.User.GenderEnum;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank(message = "Name can not be null")
        @Size(min = 2, max = 100, message = "length name have to be from 2 to 100 character")
        String name,

        @NotBlank(message = "Email can not be null")
        @Email(message = "Invalid email form")
        String email,

        @NotBlank(message = "Password can not be null")
        @Size(min = 8, max = 100, message = "Password length have to be greater or equal 8 character")
        String password,

        @Min(value = 1, message = "Age have to greater than 0")
        @Max(value = 150, message = "Invalid age")
        Integer age,

        GenderEnum gender,

        @NotBlank (message = "Address can not be null")
        @Size(max = 255, message = "address have to be less than 255 character")
        String address
) {
        @JsonIgnore
@AssertTrue(message = "Password không được vượt quá 72 byte UTF-8")
public boolean isPasswordWithinBcryptLimit() {
    return password == null
            || password.getBytes(StandardCharsets.UTF_8).length <= 72;
}
}

