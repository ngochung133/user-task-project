package com.example.hrmanagement.feature.permission;

import org.springframework.web.bind.annotation.RestController;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.dto.PageResponseDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionFilterDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionRequestDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionResponseDTO;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;




@RestController 
@RequiredArgsConstructor
@RequestMapping("/api/v1/permissions")
public class PermissionController {
    private final PermissionService permissionService;

    @PostMapping
    public ResponseEntity<?> createPermission( @Valid @RequestBody PermissionRequestDTO request) {
        PermissionResponseDTO dto = this.permissionService.create(request);
        return ApiResponse.created(dto);
    }
    
    @GetMapping
    public ResponseEntity<?> getAllPermission(
            @ModelAttribute PermissionFilterDTO filter, Pageable pageable) {
        Page<PermissionResponseDTO> permissions =
                permissionService.getAllPermission(pageable, filter);
        return ApiResponse.success(PageResponseDTO.from(permissions));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getPermissionById(@PathVariable long id) {
        PermissionResponseDTO dto = this.permissionService.getById(id);
        return ApiResponse.success(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePermission(@PathVariable long id, @Valid @RequestBody PermissionRequestDTO request) {
        PermissionResponseDTO dto = this.permissionService.update(id, request);
        return ApiResponse.success(dto);
    }
    
    @DeleteMapping ("/{id}")
    public ResponseEntity<?> deletePermission(@PathVariable long id){
        this.permissionService.deleteById(id);
        return ApiResponse.success("Delete successfully");
    }
}
