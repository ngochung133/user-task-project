package com.example.hrmanagement.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;
import com.example.hrmanagement.feature.user.dto.UserRequestDTO;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@Transactional
@AutoConfigureMockMvc
// Kích hoạt cấu hình dành cho môi trường test, ví dụ application-test.yml
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
class UserControllerIntegrationTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private PermissionAuthorizationManager permissionAuthorizationManager;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private MockMvc mockMvc;

    // Object Java -> JSON — serialize
    // JSON -> Object Java — deserialize
    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUpRbac() {
        List<Permission> perms = permissionRepository.saveAllAndFlush(List.of(
                createPermission("CREATE_USER", "/api/v1/users", "POST", "USER"),
                createPermission("VIEW_USERS", "/api/v1/users", "GET", "USER"),
                createPermission("VIEW_USER", "/api/v1/users/{id}", "GET", "USER"),
                createPermission("UPDATE_USER", "/api/v1/users/{id}", "PUT", "USER"),
                createPermission("DELETE_USER", "/api/v1/users/{id}", "DELETE", "USER")));

        Role admin = new Role();
        admin.setName("ADMIN");
        admin.setDescription("Admin test role");
        admin.setPermissions(Set.copyOf(perms));
        roleRepository.saveAndFlush(admin);

        permissionAuthorizationManager.loadCache();
    }

    private Permission createPermission(String name, String apiPath, String method, String module) {
        Permission permission = new Permission();
        permission.setName(name);
        permission.setApiPath(apiPath);
        permission.setMethod(method);
        permission.setModule(module);
        return permission;
    }

    private JwtRequestPostProcessor adminJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private String userJson(String email) {
        return """
                {
                  "name": "test",
                  "email": "%s",
                  "password": "123456",
                  "address": "Ha Noi",
                  "avatar": "avatar.png",
                  "gender": "MALE",
                  "roleIDs": []
                }
                """.formatted(email);
    }

    private UserRequestDTO userRequest(String email) {
        return new UserRequestDTO("test", email, "123456", 25, "avatar.png", User.GenderEnum.MALE, null, Set.of(), "Ha Noi");
    }

    private User userValid(String email) {
        User user = new User();
        user.setName("test");
        user.setEmail(email);
        user.setPassword("123456");
        user.setAddress("hanoi");
        user.setGender(User.GenderEnum.MALE);
        return user;
    }

    @Nested
    @DisplayName("Create User")
    class CreateUser {

        @Test
        @DisplayName("Tạo user thành công + trả về status 201 + lưu hash password và avatar")
        void createUserSuccess_Status201_SaveHashPassword() throws Exception {
            String email = "test@gmail.com";
            String json = userJson(email);

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json)
                            .with(adminJwt()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.statusCode").value(201))
                    .andExpect(jsonPath("$.data.id").isNumber())
                    .andExpect(jsonPath("$.data.name").value("test"))
                    .andExpect(jsonPath("$.data.email").value(email))
                    .andExpect(jsonPath("$.data.address").value("Ha Noi"))
                    .andExpect(jsonPath("$.data.avatar").value("avatar.png"))
                    .andExpect(jsonPath("$.data.password").doesNotExist());

            entityManager.flush();
            entityManager.clear();

            var userSaved = userRepository.findByEmail(email).orElseThrow();
            assertThat(userSaved.getName()).isEqualTo("test");
            assertThat(userSaved.getEmail()).isEqualTo("test@gmail.com");
            assertThat(userSaved.getAvatar()).isEqualTo("avatar.png");
            assertThat(userSaved.getPassword()).isNotEqualTo("123456");
            assertThat(passwordEncoder.matches("123456", userSaved.getPassword())).isTrue();
        }

        @Test
        @DisplayName("Create user fail with blank email")
        void createUserFail_withBlankEmail() throws Exception {
            String json = userJson("");
            long countBefore = userRepository.count();

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json)
                            .with(adminJwt()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.statusCode").value(400))
                    .andExpect(jsonPath("$.details", hasItem(startsWith("email:"))));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Create user fail with duplicate email")
        void createUser_withDuplicateEmail() throws Exception {
            String email = "duplicate@gmail.com";
            String json = userJson(email);

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json)
                            .with(adminJwt()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.statusCode").value(201));

            long countBefore = userRepository.count();

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json)
                            .with(adminJwt()))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.statusCode").value(409))
                    .andExpect(jsonPath("$.error").value("Conflict"));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Create user fail with incorrect format email")
        void createUser_withUncorrectFormatEmail() throws Exception {
            String json = userJson("testexample.com");
            long countBefore = userRepository.count();

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json)
                            .with(adminJwt()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.statusCode").value(400))
                    .andExpect(jsonPath("$.details").isArray())
                    .andExpect(jsonPath("$.details", hasItem(startsWith("email:"))));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Create User with short password")
        void createUser_withShortPassword() throws Exception {
            UserRequestDTO request = userRequest("test@gmail.com");
            request.setPassword("12345");
            long countBefore = userRepository.count();

            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(adminJwt()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.statusCode").value(400))
                    .andExpect(jsonPath("$.details").isArray())
                    .andExpect(jsonPath("$.details", hasItem(startsWith("password:"))));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }
    }

    @Nested
    @DisplayName("Get user")
    class GetUsers {

        @Test
        @DisplayName("Get users with authenticated admin jwt and case-insensitive gender filter")
        void getUsers_withAuthenticatedJwt() throws Exception {
            User createUser = userValid("test@gmail.com");
            createUser.setPassword(passwordEncoder.encode("126"));
            createUser.setAddress("HANOI");
            userRepository.saveAndFlush(createUser);
            entityManager.clear();

            mockMvc.perform(get("/api/v1/users")
                            .param("gender", "male")
                            .with(adminJwt()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content[0].id").value(createUser.getId()))
                    .andExpect(jsonPath("$.data.content[0].name").value(createUser.getName()))
                    .andExpect(jsonPath("$.data.content[0].email").value(createUser.getEmail()))
                    .andExpect(jsonPath("$.data.totalElements").value(1))
                    .andExpect(jsonPath("$.data.content[0].password").doesNotExist());
        }

        @Test
        @DisplayName("Get user by ID")
        void getUserById_withAuthenticatedJwt() throws Exception {
            User saved = userValid("byid@gmail.com");
            saved.setPassword(passwordEncoder.encode("123456"));
            saved = userRepository.saveAndFlush(saved);
            entityManager.clear();

            mockMvc.perform(get("/api/v1/users/{id}", saved.getId())
                            .with(adminJwt()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.id").value(saved.getId()))
                    .andExpect(jsonPath("$.data.email").value("byid@gmail.com"));
        }

        @Test
        @DisplayName("Get user with unauthenticated jwt")
        void getUser_withUnAuthenticatedJwt() throws Exception {
            mockMvc.perform(get("/api/v1/users"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Update User")
    class UpdateUser {

        @Test
        @DisplayName("Cập nhật thành công khi dữ liệu hợp lệ")
        void updateUserSucced_ShouldReturnUser() throws Exception {
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(currentUser);
            Long userId = savedUser.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            UserRequestDTO request = userRequest("update@gmail.com");
            request.setName("update");
            request.setAddress("updateAddress");
            request.setPassword("updatePassword");
            request.setAvatar("updated.png");

            mockMvc.perform(put("/api/v1/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(adminJwt()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statusCode").value(200))
                    .andExpect(jsonPath("$.data.id").value(userId))
                    .andExpect(jsonPath("$.data.name").value("update"))
                    .andExpect(jsonPath("$.data.email").value("update@gmail.com"))
                    .andExpect(jsonPath("$.data.address").value("updateAddress"))
                    .andExpect(jsonPath("$.data.avatar").value("updated.png"))
                    .andExpect(jsonPath("$.data.password").doesNotExist());

            entityManager.flush();
            entityManager.clear();
            User updatedUser = userRepository.findById(userId).orElseThrow();
            assertThat(updatedUser.getName()).isEqualTo("update");
            assertThat(updatedUser.getEmail()).isEqualTo("update@gmail.com");
            assertThat(updatedUser.getAddress()).isEqualTo("updateAddress");
            assertThat(updatedUser.getAvatar()).isEqualTo("updated.png");
            assertThat(passwordEncoder.matches("updatePassword", updatedUser.getPassword())).isTrue();
            assertThat(userRepository.existsByEmail("test@gmail.com")).isFalse();
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Cập nhật thành công khi giữ nguyên email của người dùng")
        void updateUser_withUnchangedEmail_shouldSucceed() throws Exception {
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(currentUser);
            Long userId = savedUser.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            UserRequestDTO request = userRequest("test@gmail.com");
            request.setName("Updated Name");
            request.setAddress("Da Nang");

            mockMvc.perform(put("/api/v1/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(adminJwt()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statusCode").value(200))
                    .andExpect(jsonPath("$.data.id").value(userId))
                    .andExpect(jsonPath("$.data.email").value("test@gmail.com"))
                    .andExpect(jsonPath("$.data.name").value("Updated Name"))
                    .andExpect(jsonPath("$.data.address").value("Da Nang"))
                    .andExpect(jsonPath("$.data.password").doesNotExist());

            entityManager.flush();
            entityManager.clear();
            User updatedUser = userRepository.findById(userId).orElseThrow();
            assertThat(updatedUser.getEmail()).isEqualTo("test@gmail.com");
            assertThat(updatedUser.getName()).isEqualTo("Updated Name");
            assertThat(updatedUser.getAddress()).isEqualTo("Da Nang");
            assertThat(passwordEncoder.matches("123456", updatedUser.getPassword())).isTrue();
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Từ chối cập nhật và giữ nguyên dữ liệu khi chưa xác thực")
        void updateUser_withoutJwt_shouldReturn401() throws Exception {
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(currentUser);
            Long userId = savedUser.getId();
            String originalPasswordHash = savedUser.getPassword();
            long countBefore = userRepository.count();
            entityManager.clear();

            UserRequestDTO request = userRequest("changed@gmail.com");
            request.setName("Changed Name");
            request.setAddress("Da Nang");
            request.setPassword("newPassword123");

            mockMvc.perform(put("/api/v1/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());

            entityManager.flush();
            entityManager.clear();
            User unchangedUser = userRepository.findById(userId).orElseThrow();
            assertThat(unchangedUser.getName()).isEqualTo("test");
            assertThat(unchangedUser.getEmail()).isEqualTo("test@gmail.com");
            assertThat(unchangedUser.getAddress()).isEqualTo("hanoi");
            assertThat(unchangedUser.getPassword()).isEqualTo(originalPasswordHash);
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Trả về 404 khi cập nhật người dùng không tồn tại")
        void updateUser_withIdNotExist() throws Exception {
            UserRequestDTO request = userRequest("test@gmail.com");
            long userId = -1L;
            assertThat(userRepository.existsById(userId)).isFalse();
            long countBefore = userRepository.count();

            mockMvc.perform(put("/api/v1/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(adminJwt()))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.statusCode").value(404));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Trả về 409 khi email thuộc người dùng khác")
        void updateUser_withExistedEmail() throws Exception {
            User firstUser = userValid("user1@gmail.com");
            firstUser.setPassword(passwordEncoder.encode(firstUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(firstUser);
            Long userId = savedUser.getId();

            User secondUser = userValid("user2@gmail.com");
            secondUser.setPassword(passwordEncoder.encode(secondUser.getPassword()));
            userRepository.saveAndFlush(secondUser);

            UserRequestDTO request = userRequest("user2@gmail.com");

            mockMvc.perform(put("/api/v1/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(adminJwt()))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.statusCode").value(409));
        }
    }

    @Nested
    @DisplayName("Delete User")
    class DeleteUser {

        @Test
        @DisplayName("Delete user successfully")
        void deleteUser_withExistingId() throws Exception {
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User userInDB = userRepository.saveAndFlush(currentUser);
            Long userID = userInDB.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            mockMvc.perform(delete("/api/v1/users/{id}", userID)
                            .with(adminJwt()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statusCode").value(200));

            entityManager.flush();
            entityManager.clear();
            assertThat(userRepository.existsById(userID)).isFalse();
            assertThat(userRepository.count()).isEqualTo(countBefore - 1);
        }

        @Test
        @DisplayName("Delete user with nonexistent id")
        void deleteUser_withIdNotExist() throws Exception {
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User userInDB = userRepository.saveAndFlush(currentUser);
            Long existingUserID = userInDB.getId();
            long userID = -1L;
            long countBefore = userRepository.count();
            entityManager.clear();

            mockMvc.perform(delete("/api/v1/users/{id}", userID)
                            .with(adminJwt()))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.statusCode").value(404));

            entityManager.flush();
            entityManager.clear();
            assertThat(userRepository.existsById(existingUserID)).isTrue();
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Delete user but unauthenticated")
        void deleteUser_withUnauthenticated() throws Exception {
            User user = userValid("test@gmail.com");
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            User savedUser = userRepository.saveAndFlush(user);
            Long userId = savedUser.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            mockMvc.perform(delete("/api/v1/users/{id}", userId))
                    .andExpect(status().isUnauthorized());

            entityManager.flush();
            entityManager.clear();
            User remainingUser = userRepository.findById(userId).orElseThrow();
            assertThat(remainingUser.getEmail()).isEqualTo("test@gmail.com");
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }
    }
}
