package com.example.hrmanagement.feature.role;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.hrmanagement.feature.role.dto.RoleFilterDTO;
import com.example.hrmanagement.feature.role.dto.RoleRequestDTO;
import com.example.hrmanagement.feature.role.dto.RoleResponseDTO;

@Service 
public interface RoleService {

    RoleResponseDTO create(RoleRequestDTO request);

    RoleResponseDTO update(Long id, RoleRequestDTO request);

    Page<RoleResponseDTO>  getAll(Pageable pageable, RoleFilterDTO filter);

    void delete(Long id);

    
} 

