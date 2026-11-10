package com.example.hrmanagement.feature.permission;

import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

public class PermissionSpecification {
    private PermissionSpecification(){}

    // so sánh khớp 100%
    private static Specification<Permission> equalIfPresent(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.trim().toUpperCase(Locale.ROOT);

        return (root,query,cb) -> cb.equal(root.get(field),nomalized);
    }
    
    // bỏ qua viết hoa ,thường 
    private static Specification<Permission> containsIgnoreCase(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.trim().toLowerCase(Locale.ROOT);
        return (root,query,cb) -> 
        cb.like(cb.lower(root.get(field)), "%" + nomalized + "%");
    }

    public static Specification<Permission> hasName(String name){
        return containsIgnoreCase("name", name);
    }

    public static Specification<Permission> hasMethod (String method){
        return equalIfPresent("method", method);
    }
    
    public static Specification<Permission> hasModule(String module){
        return equalIfPresent("module", module);
    }
}
