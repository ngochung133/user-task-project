package com.example.hrmanagement.feature.company.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompanyRequestDTO(

    @NotBlank(message = "Tên công ty không được để trống")
    @Size(max = 255, message = "Tên công ty không được vượt quá 255 ký tự")
    String name,
    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
    String description,
    @NotBlank(message = "Địa chỉ không được để trống")
    @Size(max = 255, message = "Địa chỉ không được vượt quá 255 ký tự")
    String address,
    @NotBlank(message = "Logo không được để trống")
    @Size(max = 255, message = "Logo không được vượt quá 255 ký tự")
    String logo
) {

}
