package com.example.hrmanagement.feature.user;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.dto.UserFilterDTO;
import com.example.hrmanagement.feature.user.dto.UserRequestDTO;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;


import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CompanyRepository companyRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional (readOnly = true)
    public Page<UserResponseDTO> fetchAllUser(Pageable pageable,UserFilterDTO filter) {
        Specification<User> spec = Specification.allOf(
            UserSpecification.hasAge(filter.age()),
            UserSpecification.hasEmail(filter.email()),
            UserSpecification.hasName(filter.name())
        );
        Page<UserResponseDTO> userList = this.userRepository.findAll(spec,pageable)
        .map(UserResponseDTO::fromEntity);
        return userList;
    }

    @Override
    @Transactional 
    public UserResponseDTO createUser(UserRequestDTO request) {
        User user = new User();
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResourceAlreadyExistException("Người dùng", "Email",request.getEmail());
        }
        List<Role> roles = this.roleRepository.findAllById(request.getRoleIDs());
        Set<Long> misisngRoleIds = new HashSet<>(request.getRoleIDs());

        roles.forEach(role -> misisngRoleIds.remove(role.getId()));

        if(!misisngRoleIds.isEmpty()){
            throw new ResourceNotFoundException("Role", "id", misisngRoleIds);
        }
        if(request.getCompanyId() != null){
        Company company = this.companyRepository.findById(request.getCompanyId())
        .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));
        
        user.setCompany(company);

        }
        user.setName(request.getName());
        user.setGender(request.getGender());
        user.setAge(request.getAge());
        user.setAddress(request.getAddress());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRoles(new HashSet<>(roles));
        this.userRepository.saveAndFlush(user);
        return UserResponseDTO.fromEntity(user);
    }

    @Override
    @Transactional 
    public UserResponseDTO updateUser(Long id, UserRequestDTO request) {
        User userInDB = userRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("User", "id", id)) ;
        if(this.userRepository.existsByEmailAndIdNot(request.getEmail(), id)){
            throw new ResourceAlreadyExistException("User", "email", request.getEmail());
        }
        if(request.getCompanyId() != null){
            Company company = this.companyRepository.findById(request.getCompanyId())
            .orElseThrow(() -> new ResourceNotFoundException("Company", "id", request.getCompanyId()));
            userInDB.setCompany(company);
        }
        List<Role> roles = this.roleRepository.findAllById(request.getRoleIDs());
        Set<Long> missingRoleIds = new HashSet<>(request.getRoleIDs());
        roles.forEach(role -> missingRoleIds.remove(role.getId()));
        if(!missingRoleIds.isEmpty()){
            throw new ResourceNotFoundException("Role", "id", missingRoleIds);
        }
        userInDB.setAddress(request.getAddress());
        userInDB.setName(request.getName());
        userInDB.setAge(request.getAge());
        userInDB.setGender(request.getGender());
        userInDB.setPassword(passwordEncoder.encode(request.getPassword()));
        userInDB.setRoles(new HashSet<>(roles));
        userInDB.setEmail(request.getEmail());
        this.userRepository.saveAndFlush(userInDB);
        return UserResponseDTO.fromEntity(userInDB);
    }
 
    @Override
    @Transactional
    public void deleteUserByID(Long id) {
        userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        userRepository.deleteById(id);
    }
}
