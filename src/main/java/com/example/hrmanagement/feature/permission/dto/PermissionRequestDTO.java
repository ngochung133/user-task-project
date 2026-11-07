package com.example.hrmanagement.feature.permission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter 
@Getter 
@NoArgsConstructor 
@AllArgsConstructor 
public class PermissionRequestDTO {

    @NotBlank (message = "name can not be blank")
    @Size(max = 255)
    private String name;

    @NotBlank (message = "apiPath can not be blank")
    @Size(max = 255)
    private String apiPath;

    @NotBlank (message = "method can not be blank")
    @Size(max = 255)
    private String method;

    @NotBlank (message = "module can not be blank")
    @Size(max = 255)
    private String module;
}
