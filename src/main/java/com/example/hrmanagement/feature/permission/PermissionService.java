package com.example.hrmanagement.feature.permission;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.hrmanagement.feature.permission.dto.PermissionFilterDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionRequestDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionResponseDTO;

import lombok.RequiredArgsConstructor;

public interface PermissionService {

    PermissionResponseDTO create(PermissionRequestDTO request);

    PermissionResponseDTO update(Long id, PermissionRequestDTO request);

    PermissionResponseDTO getById(Long id);

    Page<PermissionResponseDTO> getAllPermission(
        Pageable pageable, PermissionFilterDTO filter);

    void deleteById(long id);
}
