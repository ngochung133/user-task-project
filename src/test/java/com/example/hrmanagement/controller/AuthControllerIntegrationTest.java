package com.example.hrmanagement.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Set;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.auth.dto.RegisterRequest;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;
import com.example.hrmanagement.helper.AuthTestHelper;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

import jakarta.servlet.http.Cookie;
import jakarta.transaction.Transactional;
import tools.jackson.databind.ObjectMapper;

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
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthTestHelper authTestHelper;

    @Autowired
    private PermissionAuthorizationManager permissionAuthorizationManager;

    private Role userRole;

    @BeforeEach
    void setUpRbac() {
        Permission viewUsers = new Permission();
        viewUsers.setName("VIEW_USERS");
        viewUsers.setApiPath("/api/v1/users");
        viewUsers.setMethod("GET");
        viewUsers.setModule("USER");
        viewUsers = permissionRepository.saveAndFlush(viewUsers);

        userRole = new Role();
        userRole.setName("USER");
        userRole.setDescription("Default user role");
        userRole.setPermissions(Set.of(viewUsers));
        userRole = roleRepository.saveAndFlush(userRole);

        permissionAuthorizationManager.loadCache();
    }

    private User userValid(String email) {
        User user = new User();
        user.setName("test");
        user.setEmail(email);
        user.setPassword("123456");
        user.setAddress("hanoi");
        return user;
    }

    @Nested
    @DisplayName("Access API with real accessToken")
    class AccessAPI {

        @Test
        @DisplayName("Get all users with RBAC role")
        void getAllUsers() throws Exception {
            String accessToken = authTestHelper.createAccessToken("test@gmail.com", "123456", Set.of(userRole));

            mockMvc.perform(get("/api/v1/users")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content[0].email").value("test@gmail.com"))
                    .andExpect(jsonPath("$.data.content[0].name").value("test"));
        }

        @Test
        @DisplayName("Logout thu hồi refresh token qua cookie và chặn refresh lại")
        void logoutRevokesRefreshTokenViaCookie() throws Exception {
            User user = userValid("logout@gmail.com");
            user.setPassword(passwordEncoder.encode("123456"));
            user.setRoles(Set.of(userRole));
            userRepository.saveAndFlush(user);

            LoginRequestDTO login = LoginRequestDTO.builder()
                    .email("logout@gmail.com")
                    .password("123456")
                    .build();

            String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, Matchers.containsString("refresh_token=")))
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            String refreshToken = objectMapper.readTree(loginBody).path("data").path("refreshToken").asText();

            mockMvc.perform(post("/api/v1/auth/logout")
                            .cookie(new Cookie("refresh_token", refreshToken)))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.SET_COOKIE, Matchers.containsString("Max-Age=0")));

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .cookie(new Cookie("refresh_token", refreshToken)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Register gán mặc định role USER, login thành công và gọi được API được phép, bị 403 với API không có quyền")
        void registerAssignsDefaultRoleAndEnforcesRbac() throws Exception {
            RegisterRequest registerReq = new RegisterRequest(
                    "New Member", "newmember@example.com", "Password123", 24, User.GenderEnum.MALE, "Ha Noi");

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(registerReq)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.email").value("newmember@example.com"));

            LoginRequestDTO login = LoginRequestDTO.builder()
                    .email("newmember@example.com")
                    .password("Password123")
                    .build();

            String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isOk())
                    .andReturn()
                    .getResponse()
                    .getContentAsString();

            String accessToken = objectMapper.readTree(loginBody).path("data").path("accessToken").asText();
            String refreshToken = objectMapper.readTree(loginBody).path("data").path("refreshToken").asText();

            mockMvc.perform(get("/api/v1/users")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                    .andExpect(status().isOk());

            mockMvc.perform(get("/api/v1/companies")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                    .andExpect(status().isForbidden());

            // Refresh rotation: cấp token mới và vô hiệu hóa token cũ
            mockMvc.perform(post("/api/v1/auth/refresh")
                            .cookie(new Cookie("refresh_token", refreshToken)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());

            mockMvc.perform(post("/api/v1/auth/refresh")
                            .cookie(new Cookie("refresh_token", refreshToken)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Register từ chối mật khẩu vượt quá 72 byte UTF-8 với 400")
        void registerRejectsPasswordOver72Bytes() throws Exception {
            String tooLongPassword = "a".repeat(73);
            RegisterRequest registerReq = new RegisterRequest(
                    "Long Pass", "longpass@example.com", tooLongPassword, 25, User.GenderEnum.OTHER, "Ha Noi");

            mockMvc.perform(post("/api/v1/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(registerReq)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.statusCode").value(400));
        }
    }

    @Nested
    @DisplayName("Login sai không lấy được accessToken")
    class WrongLogin {

        @Test
        @DisplayName("Wrong password")
        void loginWithWrongPassword() throws Exception {
            User user = userValid("test@gmail.cop");
            user.setPassword(passwordEncoder.encode("hashPassword"));
            User userSaved = userRepository.saveAndFlush(user);

            LoginRequestDTO login = LoginRequestDTO.builder()
                    .email(userSaved.getEmail())
                    .password("wrongPassword")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.data.accessToken").doesNotExist());
        }

        @Test
        @DisplayName("Wrong email")
        void loginWithWrongEmail() throws Exception {
            LoginRequestDTO login = LoginRequestDTO.builder()
                    .email("notexist@gmail.com")
                    .password("123456")
                    .build();

            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(login)))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.data.accessToken").doesNotExist());
        }
    }
}
