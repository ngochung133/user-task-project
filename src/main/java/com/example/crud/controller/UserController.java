package com.example.crud.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.example.crud.helper.ApiResponse;
import com.example.crud.model.User;
import com.example.crud.service.UserService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import lombok.RequiredArgsConstructor;

@RestController 
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/users")
    public ResponseEntity<?> getUser() {
        return ApiResponse.success(userService.getUsers());
    }

    @PostMapping("/users")
    public ResponseEntity<?> postUser(@Valid @RequestBody User user) {
        return ApiResponse.created(userService.createUser(user));
    }
}
