package com.example.hrmanagement.feature.permission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository 
public interface PermissionRepository extends JpaRepository<Permission, Long>
,JpaSpecificationExecutor<Permission> {
    boolean existsByApiPathAndMethod(String apiPath, String method);
    boolean existsByApiPathAndMethodAndIdNot(String apiPath, String method, Long id);
}
