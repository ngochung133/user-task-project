package com.example.hrmanagement.feature.permission;

import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;
import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.permission.dto.PermissionFilterDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionRequestDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionResponseDTO;

import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;

    @Override 
    @Transactional 
    public PermissionResponseDTO create(PermissionRequestDTO request){
        String name = request.getName().trim();
        String apiPath = request.getApiPath().trim();
        String method = request.getMethod().trim().toUpperCase(Locale.ROOT);
        String module = request.getModule().trim().toUpperCase(Locale.ROOT);
        if(permissionRepository.existsByApiPathAndMethod(apiPath, method)){
            throw new ResourceAlreadyExistException(
                "Permission", "apiPath + method", apiPath + " " + method);
        }
        Permission p = new Permission();
        p.setName(name);
        p.setMethod(method);
        p.setApiPath(apiPath);
        p.setModule(module);
        this.permissionRepository.save(p);
        return PermissionResponseDTO.fromEntity(p);
    }

    @Override   
    @Transactional 
    public PermissionResponseDTO update(Long id, PermissionRequestDTO request) {
        //formatter:off
    Permission permissionInDB = this.permissionRepository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
    String name = request.getName().trim();
    String apiPath = request.getApiPath().trim();
    String method = request.getMethod().trim().toUpperCase(Locale.ROOT);
    String module = request.getModule().trim().toUpperCase(Locale.ROOT);
    if(this.permissionRepository.existsByApiPathAndMethodAndIdNot(apiPath, method,id)){
        throw new ResourceAlreadyExistException("Permission",
        "Api + Method",
        apiPath + " " + method);
    }
    permissionInDB.setApiPath(apiPath);
    permissionInDB.setMethod(method);
    permissionInDB.setModule(module);
    permissionInDB.setName(name);
    this.permissionRepository.saveAndFlush(permissionInDB);
    return PermissionResponseDTO.fromEntity(permissionInDB);
    }

    @Override
    @Transactional (readOnly = true)
    public PermissionResponseDTO getById(Long id) {
        Permission permission = this.permissionRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
        return PermissionResponseDTO.fromEntity(permission);
    }

    @Override
    @Transactional (readOnly = true)
    public Page<PermissionResponseDTO> getAllPermission(Pageable pageable, PermissionFilterDTO filter) {
        //formatter:off
        Specification<Permission> spec = Specification.allOf(
        PermissionSpecification.hasMethod(filter.method()),
        PermissionSpecification.hasModule(filter.module()),
        PermissionSpecification.hasName(filter.name())
    );
    Page<PermissionResponseDTO> permissionList =  permissionRepository.findAll(spec, pageable)
        .map(PermissionResponseDTO::fromEntity);
        return permissionList;
    }

    @Override 
    @Transactional 
    public void deleteById(long id){
        this.permissionRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
        this.permissionRepository.deleteById(id);
    }

}
