package com.example.hrmanagement.feature.user.dto;
import java.util.Set;
import com.example.hrmanagement.feature.user.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter 
@NoArgsConstructor 
@AllArgsConstructor 
public class UserRequestDTO {

    @NotBlank(message = "name can not be null")
    @Size(min = 2, max = 100, message = "length name have to be between 2 and 100")
    private String name;

    @NotBlank(message = "Email can not be null")
    @Email(message = "email format is incorrect")
    private String email;

    @NotBlank (message = "password can not be null")
    @Size(min = 6, message = "password length min = 6")
    private String password;

    @Min (value = 1,message = "age have to greater or equal 1")
    @Max(value = 150, message =" age have to lower or equal 150")
    private Integer age;

    private User.GenderEnum gender;

    private Long companyId;
    
    @NotNull 
    private Set<@Positive @NotNull Long> roleIDs;

    @NotBlank(message = "Address can not be null")
    private String address;
}
