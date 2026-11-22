package com.example.hrmanagement.feature.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.example.hrmanagement.feature.user.dto.UserFilterDTO;
import com.example.hrmanagement.feature.user.dto.UserRequestDTO;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

public interface UserService {

    Page<UserResponseDTO> fetchAllUser(Pageable pageable, UserFilterDTO filter);

    UserResponseDTO getUserById(Long id);

    UserResponseDTO createUser(UserRequestDTO request);

    UserResponseDTO updateUser(Long id, UserRequestDTO request);

    void deleteUserByID(Long id);
}
