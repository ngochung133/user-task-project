package com.example.hrmanagement.feature.role;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.dto.PageResponseDTO;
import com.example.hrmanagement.feature.role.dto.RoleFilterDTO;
import com.example.hrmanagement.feature.role.dto.RoleRequestDTO;
import com.example.hrmanagement.feature.role.dto.RoleResponseDTO;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {
    private final RoleService roleService;

    @PostMapping
    public ResponseEntity<?> createRole(@Valid @RequestBody RoleRequestDTO request) {
        RoleResponseDTO dto = this.roleService.create(request);
        return ApiResponse.created(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRole(@PathVariable long id, @Valid @RequestBody RoleRequestDTO request) {
        RoleResponseDTO dto = this.roleService.update(id, request);
        return ApiResponse.success(dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRole(@PathVariable long id) {
        this.roleService.delete(id);
        return ApiResponse.success("Delete successfully");
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRoleById(@PathVariable long id){
        RoleResponseDTO dto = roleService.getById(id);
        return ApiResponse.success(dto);
    }

    @GetMapping
    public ResponseEntity<?> getAllRole(Pageable pageable, @ModelAttribute RoleFilterDTO filter) {
        Page<RoleResponseDTO> listRole = this.roleService.getAll(pageable, filter);
        return ApiResponse.success(PageResponseDTO.from(listRole));
    }
}
