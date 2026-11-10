package com.example.hrmanagement.feature.company;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.hrmanagement.feature.company.dto.CompanyFilterDTO;
import com.example.hrmanagement.feature.company.dto.CompanyRequestDTO;
import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.company.dto.CompanyResponseDTO;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor 
@Service 
public class CompanyServiceImpl implements CompanyService {
    private final CompanyRepository companyRepository;

    @Override 
    @Transactional 
    public CompanyResponseDTO create(CompanyRequestDTO request){
        if(this.companyRepository.existsByName(request.name())){
            throw new ResourceAlreadyExistException("Company", "Name", request.name());
        }
        Company company = new Company();
        company.setName(request.name());
        company.setDescription(request.description());
        company.setAddress(request.address());
        company.setLogo(request.logo());
        this.companyRepository.saveAndFlush(company);
        return CompanyResponseDTO.fromEntity(company);
    }
    
    @Override 
    @Transactional 
    public CompanyResponseDTO update(Long id, CompanyRequestDTO request){
        Company companyInDb = this.companyRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        if(this.companyRepository.existsByNameAndIdNot(request.name(),id)){
            throw new ResourceAlreadyExistException("Company", "name", request.name());
        }
        companyInDb.setName(request.name());
        companyInDb.setAddress(request.address());
        companyInDb.setDescription(request.description());
        companyInDb.setLogo(request.logo());
        this.companyRepository.saveAndFlush(companyInDb);
        return CompanyResponseDTO.fromEntity(companyInDb);
    }

    @Override 
    @Transactional (readOnly = true)
    public CompanyResponseDTO getById(Long id){
        Company company = this.companyRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        return CompanyResponseDTO.fromEntity(company);
    }

    @Override 
    @Transactional 
    public void delete(Long id){
        companyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Company", "id", id));
        this.companyRepository.deleteById(id);
    }

    @Override 
    @Transactional (readOnly = true)
    public Page<CompanyResponseDTO> getAll(Pageable pageable, CompanyFilterDTO filter){
        CompanySpecification specification = new CompanySpecification();
        Specification<Company> spec = Specification.allOf(
        specification.hasName(filter.name()),
        specification.hasDescription(filter.description()),
        specification.hasLogo(filter.logo()),
        specification.hasAddress(filter.address())
        );
        Page<CompanyResponseDTO> response = this.companyRepository.findAll(spec, pageable).map(CompanyResponseDTO::fromEntity);
        return response;
    }
    
}   
