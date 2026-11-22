package com.example.hrmanagement.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import com.example.hrmanagement.dto.ApiResponse;

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
        return ApiResponse.notFound(ex.getMessage());
     }

     @ExceptionHandler(ResourceAlreadyExistException.class)
        public ResponseEntity<?> handleResourceAlreadyExist(ResourceAlreadyExistException ex){
            log.warn("ResourceAlreadyExistException {}",ex.getMessage());
            return ApiResponse.conflict(ex.getMessage());
        }

     @ExceptionHandler(DataIntegrityViolationException.class)
     public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("DataIntegrityViolationException: {}", ex.getMostSpecificCause().getMessage());
        return ApiResponse.conflict("Dữ liệu bị trùng lặp hoặc đang được tham chiếu, không thể thực hiện thao tác");
     }

     @ExceptionHandler(BadCredentialsException.class)
     public ResponseEntity<?> handleBadCredentials(BadCredentialsException ex) {
        log.warn("Đăng nhập thất bại: email hoặc mật khẩu không chính xác");
        return ApiResponse.unauthorized("Email hoặc mật khẩu không chính xác");
     }

   @ExceptionHandler(InvalidTokenException.class)
   public ResponseEntity<ApiResponse<Void>> handleInvalidToken(InvalidTokenException ex) {
      log.warn("InvalidTokenException: {}", ex.getMessage());
      return ApiResponse.unauthorized(ex.getMessage());
   }

   @ExceptionHandler(Exception.class)
     public ResponseEntity<ApiResponse<Void>> handleGeneral(Exception ex) {
        log.error("Unexpected exception", ex);
        return ApiResponse.error("Đã xảy ra lỗi hệ thống, vui lòng thử lại sau");
     }

   @ExceptionHandler(FileUploadException.class)
   public ResponseEntity<?> handleFileUpload(FileUploadException ex){
      return ApiResponse.badRequest(ex.getMessage());
   }

   @ExceptionHandler(MaxUploadSizeExceededException.class)
   public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
      log.warn("MaxUploadSizeExceededException: {}", ex.getMessage());
      return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
              .body(ApiResponse.ofError(
                      HttpStatus.CONTENT_TOO_LARGE.value(),
                      "Dung lượng file hoặc request vượt quá giới hạn cho phép",
                      HttpStatus.CONTENT_TOO_LARGE.getReasonPhrase()));
   }

   @ExceptionHandler({MissingServletRequestPartException.class, MissingServletRequestParameterException.class})
   public ResponseEntity<ApiResponse<Void>> handleMissingRequestPart(Exception ex) {
      log.warn("Missing request part/parameter: {}", ex.getMessage());
      return ApiResponse.badRequest("Thiếu tham số hoặc tệp tin bắt buộc trong request");
   }
}
