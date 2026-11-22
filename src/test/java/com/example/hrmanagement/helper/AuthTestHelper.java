package com.example.hrmanagement.helper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashSet;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;

import tools.jackson.databind.ObjectMapper;

public class AuthTestHelper {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public String createAccessToken(String email, String rawPassword) throws Exception {
        return createAccessToken(email, rawPassword, Set.of());
    }

    public String createAccessToken(String email, String rawPassword, Set<Role> roles) throws Exception {
        User user = new User();
        user.setName("test");
        user.setEmail(email);
        user.setAddress("hanoi");
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRoles(new HashSet<>(roles));

        User userInDB = userRepository.saveAndFlush(user);

        LoginRequestDTO login = LoginRequestDTO.builder()
                .email(userInDB.getEmail())
                .password(rawPassword)
                .build();

        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .header("User-Agent", "JUnit-Test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(response)
                .path("data")
                .path("accessToken")
                .asText();
    }
}
