package com.example.crud.global.exception;

import java.io.Serial;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter 
public class ResourceAlreadyExistException extends RuntimeException{
    @Serial 
    private static final long serialVersionUID = 1L;
    
    private final String resourceName;
    private final String fieldName;
    private final Object fieldValue;

    public ResourceAlreadyExistException(String resourceName, String fieldName, Object fieldValue){
        super(String.format("%s is existed with %s = %s",resourceName,fieldName,fieldValue));
        this.resourceName = resourceName;
        this.fieldName = fieldName;
        this.fieldValue = fieldValue;
    }

}
