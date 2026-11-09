package com.example.hrmanagement.feature.role;

import java.util.Set;

import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;

public class RoleSpecification {
    public static Specification<Role> equalIfPresent(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String normalized = value.trim();   
        return (root, query,cb) -> cb.equal(root.get(field), normalized);
    }
    public static Specification<Role> containsIgnoreCase(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.toLowerCase().trim();
        return(root, query,cb) -> cb.like(cb.lower(root.get(field)), "%" + nomalized + "%");
    }

    public static Specification<Role> hasName(String name){
        return equalIfPresent("name", name);
    }
    public static Specification<Role> hasDescription(String description){
        return containsIgnoreCase("description",description);
    }

    public static Specification<Role> hasAllPermissionIds(Set<Long> permissionIds) {
    if (permissionIds == null || permissionIds.isEmpty()) {
        return Specification.unrestricted();
    }
    return (root, query, cb) -> {
        Predicate[] predicates = permissionIds.stream()
                .map(id -> cb.equal(root.join("permissions").get("id"), id))
                .toArray(Predicate[]::new);
        return cb.and(predicates);
        };
    }
}
