package com.example.crud.modules.user.service;

import java.util.List;

import com.example.crud.modules.user.dto.UserResponseDTO;
import com.example.crud.modules.user.entity.User;

public interface UserService {

    List<UserResponseDTO> fetchAllUser();

    UserResponseDTO createUser(User inputUser);

    UserResponseDTO updateUser(Long id, User user);

    void deleteUserByID(Long id);
}
