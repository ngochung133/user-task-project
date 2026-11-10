package com.example.hrmanagement.feature.role;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.dto.RoleFilterDTO;
import com.example.hrmanagement.feature.role.dto.RoleRequestDTO;
import com.example.hrmanagement.feature.role.dto.RoleResponseDTO;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override 
    @Transactional 
    public RoleResponseDTO create(RoleRequestDTO request){

        if(this.roleRepository.existsByName(request.name())){
            throw new ResourceAlreadyExistException("Role", "name", request.name());
        }
        List<Permission> permissions = this.permissionRepository.findAllById(request.permissionIds());

        Set<Long> missingIds = new HashSet<>(request.permissionIds());

        permissions.forEach(permisison -> missingIds.remove(permisison.getId()));

        if(!missingIds.isEmpty()){
            throw new ResourceNotFoundException("Permission", "id", missingIds);
        }
        Role role = new Role();
        role.setName(request.name());
        role.setDescription(request.description());
        role.setPermissions(new HashSet<>(permissions));
        this.roleRepository.saveAndFlush(role);
        return RoleResponseDTO.fromEntity(role);
    }  

    @Override 
    @Transactional 
    public RoleResponseDTO update(Long id, RoleRequestDTO request){
        Role roleInDB = this.roleRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
        if(this.roleRepository.existsByNameAndIdNot(request.name(), id)){
            throw new ResourceAlreadyExistException("Role", "name", request.name());
        }
        //check xem permission co exist trong database khong
        List<Permission> permissions = this.permissionRepository.findAllById(request.permissionIds());
        Set<Long> missingIds = new HashSet<>(request.permissionIds());
        permissions.forEach(permission ->  missingIds.remove(permission.getId()));

        if(!missingIds.isEmpty()){
            throw new ResourceNotFoundException("Permission", "id" , missingIds);
        }

        roleInDB.setName(request.name());
        roleInDB.setDescription(request.description());
        roleInDB.setPermissions(new HashSet<>(permissions));
        this.roleRepository.saveAndFlush(roleInDB);
        return RoleResponseDTO.fromEntity(roleInDB);
    }

    @Override 
    @Transactional (readOnly = true)
    public RoleResponseDTO getById(Long id){
        Role role = this.roleRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
        return RoleResponseDTO.fromEntity(role);
    }

    @Override 
    @Transactional 
    public void  delete(Long id){
        Role role = this.roleRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Role", "id", id));
        this.roleRepository.deleteById(id);
    }

    @Override 
    @Transactional (readOnly = true)
    public Page<RoleResponseDTO> getAll(Pageable pageable, RoleFilterDTO filter){
        Specification<Role> spec = Specification.allOf(
            RoleSpecification.hasName(filter.name()),
            RoleSpecification.hasDescription(filter.description()),
            RoleSpecification.hasAllPermissionIds(filter.permissionIds()));
        Page<RoleResponseDTO> roleList = this.roleRepository.findAll(spec, pageable)
        .map(RoleResponseDTO::fromEntity);
        return roleList;
    }
}
