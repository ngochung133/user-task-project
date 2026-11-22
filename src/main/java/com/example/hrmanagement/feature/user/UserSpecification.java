package com.example.hrmanagement.feature.user;

import java.util.Locale;

import org.springframework.core.convert.converter.Converter;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

public class UserSpecification {

    public static Specification<User> equalIfExist(String field, String value){
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
        cb.like(cb.lower(root.get(field)), "%" + nomalized + "%");
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
    public static Specification<User> ageFrom(Integer minAge){
        if(minAge == null){
            return Specification.unrestricted();
        }
        return (root,query, cb) ->
            cb.greaterThanOrEqualTo(root.get("age"), minAge);
    }
    public static Specification<User> ageTo(Integer maxAge){
        if(maxAge == null){
            return Specification.unrestricted();
        }
        return (root,query,cb) ->
            cb.lessThanOrEqualTo(root.get("age"),maxAge);
    }

    public static Specification<User> hasGender(User.GenderEnum gender) {
        if (gender == null) {
            return Specification.unrestricted();
        }
        return (root, query, cb) -> cb.equal(root.get("gender"), gender);
    }

    @Component
    public static class GenderEnumConverter implements Converter<String, User.GenderEnum> {
        @Override
        public User.GenderEnum convert(String source) {
            String normalized = source.trim();
            if (normalized.isEmpty()) {
                return null;
            }
            return User.GenderEnum.valueOf(normalized.toUpperCase(Locale.ROOT));
        }
    }
}
