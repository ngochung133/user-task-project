package com.example.crud.modules.user.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Email;
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
@Entity
@Table(name = "users")
public class User {

    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "name can not be null")
    @Size(min = 2, max = 100, message = "length name have to be between 2 and 100")
    private String name;

    @NotBlank(message = "Email can not be null")
    @Email(message = "email format is incorrect")
    private String email;

    @NotBlank (message = "password can not be null")
    @Size(min = 6, message = "password length min = 6")
    private String password;

    @NotBlank(message = "Address can not be null")
    private String address;
}
