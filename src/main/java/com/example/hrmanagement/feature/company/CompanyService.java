package com.example.hrmanagement.feature.company;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;

import com.example.hrmanagement.feature.company.dto.CompanyFilterDTO;
import com.example.hrmanagement.feature.company.dto.CompanyRequestDTO;
import com.example.hrmanagement.feature.company.dto.CompanyResponseDTO;

@Service
public interface CompanyService {

    CompanyResponseDTO create(CompanyRequestDTO request);

    CompanyResponseDTO update(Long id,CompanyRequestDTO request);

    Page<CompanyResponseDTO> getAll(Pageable pageable, CompanyFilterDTO filter);

    void delete(Long id);
    
}
