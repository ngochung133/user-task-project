package com.example.exception;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.example.crud.helper.ApiResponse;

@RestControllerAdvice 
public class GlobalExceptionHandler {
     private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

     @ExceptionHandler(MethodArgumentNotValidException.class)
     public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        var details = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        return ResponseEntity.status((HttpStatus.BAD_REQUEST))
                .body(ApiResponse.badRequest("Dữ liệu đầu vào không hợp lệ", details));
     }

     @ExceptionHandler(MethodArgumentTypeMismatchException.class)
     public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String expectedType = ex.getRequiredType() != null
                ? ex.getRequiredType().getSimpleName() : "phù hợp";
        return ApiResponse.badRequest("Tham số '" + ex.getName()
                + "' phải có kiểu " + expectedType);
     }

     @ExceptionHandler(ResourceNotFoundException.class)
     public ResponseEntity<?> hanldeResourceNotFound(ResourceNotFoundException ex){
        log.warn("ResourceNotFoundException: {}",ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.notFound(ex.getMessage()));
     }

     @ExceptionHandler(ResourceAlreadyExistException.class)
        public ResponseEntity<?> handleResourceAlreadyExist(ResourceAlreadyExistException ex){
            log.warn("ResourceAlreadyExistException {}",ex.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.conflict(ex.getMessage()));
        }
}
