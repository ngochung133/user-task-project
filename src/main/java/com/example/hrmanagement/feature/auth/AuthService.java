package com.example.hrmanagement.feature.auth;

import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.auth.dto.LoginResponseDTO;
import com.example.hrmanagement.feature.auth.dto.RegisterRequest;
import com.example.hrmanagement.feature.auth.dto.RegisterResponse;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

public interface AuthService {
    public RegisterResponse register(RegisterRequest request);

    public LoginResponseDTO login(LoginRequestDTO request, String deviceInfo, String ipAddress);

    public LoginResponseDTO refresh(String rawRefreshToken);

    public void logout(String rawRefreshToken);

    public UserResponseDTO getCurrentUser(String email);
}
