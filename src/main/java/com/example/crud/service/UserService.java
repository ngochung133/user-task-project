package com.example.crud.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.example.crud.model.User;
import com.example.crud.model.dto.response.UserResponseDTO;
import com.example.crud.repository.UserRepository;
import com.example.exception.ResourceAlreadyExistException;
import com.example.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

public UserResponseDTO convertUserToDTO(User user){
    //formater:off
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

  public List<UserResponseDTO> fetchAllUser(){
    //formatter:off
    List<UserResponseDTO> userList = this.userRepository.findAll()
    .stream().map(user -> UserResponseDTO.builder()
                                          .id(user.getId())
                                          .name(user.getName())
                                          .email(user.getEmail())
                                          .address(user.getAddress())
                                          .build()
    ).collect(Collectors.toList());
    return userList;
  }

  public UserResponseDTO updateUser(Long id, User user){
    //formatter:off
    User userInDB = this.userRepository.findById(id)
    .orElseThrow(() -> new ResourceNotFoundException("User", "Id", id));
    userInDB.setName(user.getName());
    userInDB.setEmail(user.getEmail());
    userInDB.setPassword(user.getPassword());
    userInDB.setAddress(user.getAddress());
    return convertUserToDTO(this.userRepository.save(userInDB));
  }

  public void deleteUserByID(Long id){
    this.userRepository.deleteById(id);
  }
}
