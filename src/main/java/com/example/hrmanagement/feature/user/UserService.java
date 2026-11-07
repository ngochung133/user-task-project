package com.example.hrmanagement.feature.user;

import java.util.List;

import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

public interface UserService {

    List<UserResponseDTO> fetchAllUser();

    UserResponseDTO createUser(User inputUser);

    UserResponseDTO updateUser(Long id, User user);

    void deleteUserByID(Long id);
}
