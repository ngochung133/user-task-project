package com.example.crud.modules.user.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.example.crud.global.shared.ApiResponse;
import com.example.crud.modules.user.dto.UserResponseDTO;
import com.example.crud.modules.user.entity.User;
import com.example.crud.modules.user.service.UserService;

import jakarta.validation.Valid;

@RestController
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public ResponseEntity<?> getUser() {
        List<UserResponseDTO> dto = this.userService.fetchAllUser();
        return ApiResponse.success(dto);
    }

    @PostMapping("/users")
        public ResponseEntity<?> postUser(@Valid @RequestBody User user){
            UserResponseDTO dto = this.userService.createUser(user);
            return ApiResponse.created(dto);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable("id") Long id, @Valid @RequestBody User user) {
        UserResponseDTO dto = this.userService.updateUser(id, user);
        return ApiResponse.success(dto);
    }
    
    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id){
        this.userService.deleteUserByID(id);
        return ApiResponse.success("Delete Success");
    }
}
