package com.example.hrmanagement.feature.user;

import java.util.Locale;

import org.springframework.beans.factory.BeanRegistry.Spec;
import org.springframework.data.jpa.domain.Specification;

public class UserSpecification {

    public static Specification<User> eualIfExist(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.trim();
        return (root, query,cb) ->
        cb.equal(root.get(field), nomalized);
    }

    public static Specification<User> containsIgnoreCase(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.trim().toLowerCase(Locale.ROOT);
        return (root, query, cb) ->
        cb.like(cb.lower(root.get(field)),nomalized);
    }

    public static Specification<User> hasName(String name){
        return containsIgnoreCase("name",name);
    }
    public static Specification<User> hasAge(Integer age){
        if(age == null){
            return Specification.unrestricted();
        }
        return (root,query,cb) ->
        cb.equal(root.get("age"),age);
    }
    public static Specification<User> hasEmail(String email){
        return containsIgnoreCase("email", email);
    }
}
