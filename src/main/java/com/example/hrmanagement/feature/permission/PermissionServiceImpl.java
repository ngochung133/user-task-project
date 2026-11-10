package com.example.hrmanagement.feature.permission;

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
        if(permissionRepository.existsByApiPathAndMethod(request.getApiPath(), request.getMethod())){
            throw new ResourceAlreadyExistException(
                "Permission", "apiPath + method", request.getApiPath() + " " + request.getMethod());
        }
        Permission p = new Permission();
        p.setName(request.getName());
        p.setMethod(request.getMethod());
        p.setApiPath(request.getApiPath());
        p.setModule(request.getModule());
        this.permissionRepository.save(p);
        return PermissionResponseDTO.fromEntity(p);
    }

    @Override
    @Transactional 
    public PermissionResponseDTO update(Long id, PermissionRequestDTO request) {
        //formatter:off
    Permission permissionInDB = this.permissionRepository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
    if(this.permissionRepository.existsByApiPathAndMethodAndIdNot(request.getApiPath(), request.getMethod(),id)){
        throw new ResourceAlreadyExistException("Permission",
        "Api + Method",
        request.getApiPath() + " " + request.getMethod());
    }
    permissionInDB.setApiPath(request.getApiPath());
    permissionInDB.setMethod(request.getMethod());
    permissionInDB.setModule(request.getModule());
    permissionInDB.setName(request.getName());
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
