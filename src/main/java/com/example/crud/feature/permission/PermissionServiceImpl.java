package com.example.crud.feature.permission;

import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Pageable;
import com.example.crud.exception.ResourceAlreadyExistException;
import com.example.crud.exception.ResourceNotFoundException;
import com.example.crud.feature.permission.dto.PermissionFilterDTO;
import com.example.crud.feature.permission.dto.PermissionRequestDTO;
import com.example.crud.feature.permission.dto.PermissionResponseDTO;
import jakarta.transaction.Transactional;
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
    .orElseThrow(() -> new ResourceNotFoundException("Permisison", "id", id));
    if(this.permissionRepository.existsByApiPathAndMethod(request.getApiPath(), request.getMethod())){
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
    public PermissionResponseDTO getById(Long id) {
        Permission permission = this.permissionRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", id));
        return PermissionResponseDTO.fromEntity(permission);
    }

    @Override
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
    public void deleteById(long id){
        this.permissionRepository.deleteById(id);
    }

}
