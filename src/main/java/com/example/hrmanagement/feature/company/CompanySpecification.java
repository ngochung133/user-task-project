package com.example.hrmanagement.feature.company;

import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

public class CompanySpecification {
    public static Specification<Company> equalIfPresent(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.trim();

        return (root, query, cb) ->
        cb.equal(root.get(field), nomalized);
    }

    public static Specification<Company> containsIgnoreCase(String field, String value){
        if(value == null || value.isBlank()){
            return Specification.unrestricted();
        }
        String nomalized = value.trim().toLowerCase(Locale.ROOT);

        return (root, query, cb) ->
        cb.like(cb.lower(root.get(field)), "%" + nomalized + "%");
    }

    public Specification<Company> hasName(String name){
        return containsIgnoreCase("name", name);
    }

    public Specification<Company> hasDescription(String description){
        return containsIgnoreCase("description", description);
    }

    public Specification<Company> hasLogo(String logo){
        return equalIfPresent("logo", logo);
    }

    public Specification<Company> hasAddress(String address){
        return equalIfPresent("address", address);
    }
}
