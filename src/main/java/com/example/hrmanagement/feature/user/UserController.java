package com.example.hrmanagement.feature.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.dto.PageResponseDTO;
import com.example.hrmanagement.feature.user.dto.UserFilterDTO;
import com.example.hrmanagement.feature.user.dto.UserRequestDTO;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

import io.swagger.v3.oas.annotations.security.SecurityRequirements;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<?> getUser(Pageable pageable, @ModelAttribute UserFilterDTO filter) {
        Page<UserResponseDTO> users = this.userService.fetchAllUser(pageable, filter);
        return ApiResponse.success(PageResponseDTO.from(users));
    }
    //@SecurityRequirements để trống trên postUser báo cho 
    // OpenAPI/Swagger rằng endpoint này không yêu cầu Bearer token,
    @SecurityRequirements
    @PostMapping
    public ResponseEntity<?> postUser(@Valid @RequestBody UserRequestDTO request) {
        UserResponseDTO dto = this.userService.createUser(request);
        return ApiResponse.created(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody UserRequestDTO request) {
        UserResponseDTO dto = this.userService.updateUser(id, request);
        return ApiResponse.success(dto);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id){
        this.userService.deleteUserByID(id);
        return ApiResponse.success("Delete Success");
    }
}
