package com.easywms.common;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    ResponseEntity<?> business(BusinessException ex) { return response(ex.getStatus(), ex.getMessage()); }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> forbidden(AccessDeniedException ex) { return response(HttpStatus.FORBIDDEN, "无权访问该资源"); }
    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
    ResponseEntity<?> validation(Exception ex) { return response(HttpStatus.BAD_REQUEST, ex.getMessage()); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception ex) { return response(HttpStatus.INTERNAL_SERVER_ERROR, "服务暂时不可用，请联系管理员"); }
    private ResponseEntity<?> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message, "timestamp", Instant.now()));
    }
}
