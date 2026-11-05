package com.example.crud.modules.user.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.crud.global.exception.ResourceAlreadyExistException;
import com.example.crud.global.exception.ResourceNotFoundException;
import com.example.crud.modules.user.dto.UserResponseDTO;
import com.example.crud.modules.user.entity.User;
import com.example.crud.modules.user.mapper.UserMapper;
import com.example.crud.modules.user.repository.UserRepository;
import com.example.crud.modules.user.service.UserService;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public List<UserResponseDTO> fetchAllUser() {
        return userRepository.findAll().stream()
                .map(UserMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponseDTO createUser(User inputUser) {
        if (userRepository.existsByEmail(inputUser.getEmail())) {
            throw new ResourceAlreadyExistException("Người dùng", "Email", inputUser.getEmail());
        }
        inputUser.setId(null);
        inputUser.setPassword(passwordEncoder.encode(inputUser.getPassword()));
        return UserMapper.toResponse(userRepository.save(inputUser));
    }

    @Override
    public UserResponseDTO updateUser(Long id, User user) {
        User userInDB = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "Id", id));
        if (!userInDB.getEmail().equals(user.getEmail()) && userRepository.existsByEmail(user.getEmail())) {
            throw new ResourceAlreadyExistException("User", "email", user.getEmail());
        }
        userInDB.setName(user.getName());
        userInDB.setEmail(user.getEmail());
        userInDB.setPassword(passwordEncoder.encode(user.getPassword()));
        userInDB.setAddress(user.getAddress());
        return UserMapper.toResponse(userRepository.save(userInDB));
    }

    @Override
    public void deleteUserByID(Long id) {
        userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        userRepository.deleteById(id);
    }
}
