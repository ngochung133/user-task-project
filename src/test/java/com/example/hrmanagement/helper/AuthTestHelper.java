package com.example.hrmanagement.helper;

import com.example.hrmanagement.feature.auth.JwtService;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import tools.jackson.databind.ObjectMapper;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.user.UserRepository;

public class AuthTestHelper {
    
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

    //C1: Tạo Helper Method trong một Base Class (Tốt cho dự án vừa & nhỏ)
    public String createAccessToken(String email, String rawPassword) throws Exception{
        User user = new User();
        user.setName("test");
        user.setEmail(email);
        user.setAddress("hanoi");
        user.setPassword(passwordEncoder.encode(rawPassword));

        User userInDB = userRepository.saveAndFlush(user);

        LoginRequestDTO login = LoginRequestDTO.builder()
        .email(userInDB.getEmail())
        .password(rawPassword)
        .build();


        //Biến response ở đây sẽ chứa toàn bộ nội dung phần thân của phản hồi HTTP 
        // (Response Body) được trả về từ API POST /auth/login
        String response = mockMvc.perform(post("/auth/login")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(login)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
        .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
        .andReturn()
        .getResponse()
        .getContentAsString();

        String accessToken = objectMapper.readTree(response)
        .path("data")
        .path("accessToken")
        .asText();
        return  accessToken;
    }
}


        // c2 nhanh hon
//     public String generateTokenForUser(String email) {
//         Authentication authentication =
//                 new UsernamePasswordAuthenticationToken(
//                         email,
//                         null,
//                         List.of(new SimpleGrantedAuthority("ROLE_USER")));

//         return jwtService.generateToken(authentication);
//      }
// }

