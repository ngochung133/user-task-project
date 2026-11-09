package com.example.hrmanagement.feature.permission;

import java.time.Instant;

import org.hibernate.annotations.Collate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.annotation.Generated;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity 
@Table(name = "permissions", uniqueConstraints = {
    @UniqueConstraint (columnNames = {"api_path", "method"})
})
@Setter 
@Getter 
@NoArgsConstructor 
@AllArgsConstructor 
public class Permission{
    
    @Id 
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    private long id;

    @Column(nullable = false, length = 255)     
    private String name;

    @Collate("utf8mb4_0900_bin")
    @Column (name = "api_path", nullable = false, length = 255)
    private String apiPath;

    @Column(nullable = false, length = 255)
    private String method;

    @Column (nullable = false, length = 255)
    private String module;

    @CreationTimestamp 
    @Column (nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp 
    @Column (nullable = false)
    private Instant updateAt;
}

