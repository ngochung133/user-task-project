package com.example.crud.modules.auth.controller;

import com.example.crud.modules.auth.service.JwtService;

import com.example.crud.global.config.MySqlTestConfiguration;
import com.example.crud.modules.user.entity.User;
import com.example.crud.modules.auth.dto.LoginRequestDTO;
import com.example.crud.modules.user.repository.UserRepository;
import org.springframework.http.HttpHeaders;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({
        MySqlTestConfiguration.class,
        AuthTestHelper.class
})
@Transactional
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired 
    private JwtService jwtService;

    @Autowired 
    private AuthTestHelper authTestHelper;
    
    private User userValid(String email){
        User user = new User();
        user.setName("test");
        user.setEmail(email);
        user.setPassword("123456");
        user.setAddress("hanoi");
        return user;
    }

    @Nested 
    @DisplayName ("Access API with real accessToken")
    class accessAPI{

        @Test 
        @DisplayName ("Get all users")

    void getAllUsers() throws Exception {
    String accessToken =
            authTestHelper.createAccessToken("test@gmail.com","123456");

    mockMvc.perform(get("/users")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].email").value("test@gmail.com"))
            .andExpect(jsonPath("$.data[0].name").value("test"));
        }

    }

    @Nested
    @DisplayName ("Login sai khong lay duoc accessToken")

    class wrongLogin{
        @Test
        @DisplayName ("Wrong password")
        
        void loginWithWrongPassword() throws Exception{
        User user = userValid("test@gmail.cop");
        user.setPassword(passwordEncoder.encode("hashPassword"));
        User userSaved = userRepository.saveAndFlush(user);

        LoginRequestDTO login = LoginRequestDTO.builder() 
                                .email(userSaved.getEmail())
                                .password("wrongPassword")
                                .build();
        mockMvc.perform(post("/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(login)))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.data.accessToken").doesNotExist());
        }   

        @Test 
        @DisplayName ("Wrong email")

        void loginWithWrongEmail() throws Exception{
            String email = "notexist@gmail.com";

            LoginRequestDTO login = LoginRequestDTO.builder()
            .email(email)
            .password("123456")
            .build();

            mockMvc.perform(post("/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.data.accessToken").doesNotExist());
        }
    }
 }
