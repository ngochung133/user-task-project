package com.example.hrmanagement.feature.role;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.ManyToAny;
import org.hibernate.annotations.UpdateTimestamp;

import com.example.hrmanagement.feature.permission.Permission;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter 
@Getter 
@NoArgsConstructor 
@AllArgsConstructor 
@Entity 
@Table(name = "roles", uniqueConstraints = {
    @UniqueConstraint (columnNames = "name")
})
public class Role {

    @Id 
    @GeneratedValue (strategy = GenerationType.IDENTITY)
    private Long id;

    @Column (nullable = false, length = 255)
    private String name;

    @Column (nullable = false, length = 255)
    private String description;

    @ManyToMany (fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    @JoinTable (
        name = "role_permission",
        joinColumns = @JoinColumn (
            name = "role_id",
            nullable = false
        ),
        inverseJoinColumns = @JoinColumn (
            name = "permission_id",
            nullable = false
        )
    )
    private Set<Permission>  permissions = new HashSet<>();

    @CreationTimestamp 
    private Instant createdAt;

    @UpdateTimestamp 
    private Instant updateAt;

}
