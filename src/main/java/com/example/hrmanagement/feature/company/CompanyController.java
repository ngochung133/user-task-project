package com.example.hrmanagement.feature.company;

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

import com.example.hrmanagement.feature.company.dto.CompanyFilterDTO;
import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.dto.PageResponseDTO;
import com.example.hrmanagement.feature.company.dto.CompanyRequestDTO;
import com.example.hrmanagement.feature.company.dto.CompanyResponseDTO;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/companies")
@RequiredArgsConstructor 
public class CompanyController {
    private final CompanyService companyService;
    
    @PostMapping
    public ResponseEntity<?> createCompany(@Valid @RequestBody CompanyRequestDTO request){
        CompanyResponseDTO dto = this.companyService.create(request);
        return ApiResponse.created(dto);
    }

    @PutMapping ("/{id}")
    public ResponseEntity<?> updateCompany(@PathVariable long id,@Valid  @RequestBody CompanyRequestDTO request){
        CompanyResponseDTO dto = this.companyService.update(id, request);
        return ApiResponse.success(dto);
    }

    @DeleteMapping ("/{id}")
    
    public ResponseEntity<?> deleteCompany(@PathVariable long id){
        this.companyService.delete(id);
        return ApiResponse.success("Delete successfully");
    }

    @GetMapping
    public ResponseEntity<?> getAllCompany(Pageable pageable, @ModelAttribute CompanyFilterDTO filter){
        Page<CompanyResponseDTO> listCompany = this.companyService.getAll(pageable, filter);
        return ApiResponse.success((PageResponseDTO.from(listCompany)));
    }

}
