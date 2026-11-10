package com.example.hrmanagement.feature.user;

import java.util.List;
import java.util.Set;

import org.hibernate.annotations.AnyDiscriminatorImplicitValues.Strategy;

import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.role.Role;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.annotation.Generated;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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

    public enum GenderEnum{
        MALE,FEMALE,OTHER
    }

    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column (nullable = false, length = 255)
    private String name;

    @Column (nullable = false, length = 255)
    private String email;

    @Column (nullable = false, length = 255)
    private String password;

    @Column (nullable = false, length = 255)
    private String address;

    private String avatar;
    
    private Integer age;
    
    @Enumerated (EnumType.STRING)
    private GenderEnum gender;

    @ManyToOne (fetch = FetchType.LAZY)
    @JoinColumn (name = "company_id")
    private Company company;

    @ManyToMany 
    @JoinTable (
        name ="user_role",
        joinColumns = @JoinColumn (name = "user_id"),
        inverseJoinColumns = @JoinColumn (name = "role_id"))
    private Set<Role> roles;
}
