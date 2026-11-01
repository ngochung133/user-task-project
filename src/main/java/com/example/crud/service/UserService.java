package com.example.crud.service;

import com.example.exception.ResourceAlreadyExistException;

import org.springframework.stereotype.Service;

import com.example.crud.model.User;
import com.example.crud.model.dto.response.UserResponseDTO;
import com.example.crud.repository.UserRepository;
import java.util.List;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

  public UserResponseDTO convertUserToDTO(User user){
    return UserResponseDTO.builder().id(user.getId())
                                    .name(user.getName())
                                    .email(user.getEmail())
                                    .address(user.getAddress())
                                    .build();
  }
  
    public UserResponseDTO createUser(User inputUser) {
    if (userRepository.existsByEmail(inputUser.getEmail())) {
        throw new ResourceAlreadyExistException(
                "Người dùng", "Email", inputUser.getEmail());
    }
    return convertUserToDTO(userRepository.save(inputUser));
    }

    public List<UserResponseDTO> getUsers() {
        return userRepository.findAll().stream()
                .map(this::convertUserToDTO)
                .toList();
    }

}
