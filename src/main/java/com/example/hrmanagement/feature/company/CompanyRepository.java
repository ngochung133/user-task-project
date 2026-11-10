package com.example.hrmanagement.feature.company;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository 
public interface CompanyRepository extends JpaRepository<Company, Long>
,JpaSpecificationExecutor<Company> {
    
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name,Long id);
}
