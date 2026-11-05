package com.example.crud.exception;

import java.io.Serial;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter 
public class ResourceNotFoundException extends RuntimeException {
    @Serial 
    private static final long serialVersionUID = 1L;
    
    private final String resourceName;
    private final String fieldName;
    private final Object fieldValue;

    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue){
        super(String.format("%s with %s = %s can not be found",resourceName,fieldName,fieldValue));
        this.resourceName = resourceName;
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
    }

}
