package com.example.crud.modules.user.controller;

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
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;

import com.example.crud.global.config.MySqlTestConfiguration;
import com.example.crud.modules.user.entity.User;
import com.example.crud.modules.user.repository.UserRepository;
import com.example.crud.modules.user.service.UserService;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.startsWith;
import jakarta.persistence.EntityManager;
import jakarta.transaction.TransactionScoped;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest 
@Transactional 
@AutoConfigureMockMvc 
//	Kích hoạt cấu hình dành cho môi trường test, ví dụ application-test.properties
@ActiveProfiles ("test")
@Import(MySqlTestConfiguration.class)
class UserControllerIntegrationTest {

    @Autowired 
    private UserRepository userRepository;
    @Autowired 
    private UserService userService;
    @Autowired 
    private EntityManager entityManager;
    @Autowired 
    private PasswordEncoder passwordEncoder;
    @Autowired 
    private MockMvc mockMvc;

    //Object Java → JSON — serialize 
    //String json = objectMapper.writeValueAsString(user);

    //JSON → Object Java — deserialize
    //User user = objectMapper.readValue(json, User.class);
    @Autowired
    private ObjectMapper objectMapper;


    private String userJson( String email) {
        return """
                {
                  "name": "test",
                  "email": "%s",
                  "password": "123456",
                  "address": "Ha Noi"
                }
                """.formatted(email);
    }

     //Dùng object thay vì userJson
    private User userValid(String email){
        User user = new User();
        user.setName("test");
        user.setEmail(email);
        user.setPassword("123456");
        user.setAddress("hanoi");
        return user;
    }

    @Nested 
    @DisplayName ("Create User")

    class createUser{

        @Test 
        @DisplayName ("Tạo user thành công + trả về status 201 + lưu hashpassword")

        void createUserSuccess_Status201_SaveHashPassword() throws Exception{
            String email = "test@gmail.com";
            String json = userJson(email);
            //formater:off
            mockMvc.perform(post("/users")
                            .contentType(MediaType.
                                APPLICATION_JSON)
                            .content(json))
                            .andExpect(status().isCreated())
                            .andExpect(jsonPath("$.statusCode").value(201))
                            .andExpect(jsonPath("$.data.id").isNumber())
                            .andExpect(jsonPath("$.data.name").value("test"))
                            .andExpect(jsonPath("$.data.email").value(email))
                            .andExpect(jsonPath("$.data.address").value("Ha Noi"))
                            .andExpect(jsonPath("$.data.password").doesNotExist());
            //Cap nhat du lieu xuong DB
            entityManager.flush();
            entityManager.clear();
            
            var userSaved = userRepository.findByEmail(email).orElseThrow();
            assertThat(userSaved.getName()).isEqualTo("test");
            assertThat(userSaved.getEmail()).isEqualTo("test@gmail.com");
            assertThat(userSaved.getPassword()).isNotEqualTo("123456");
            assertThat(passwordEncoder.matches("123456", userSaved.getPassword())).isTrue();
        }

        @Test
        @DisplayName ("Create user fail with blank email")

        void createUserFail_withBlankEmail() throws Exception{
            String email = "";
            String json = userJson(email);
            
            //tổng số bản ghi trong Database
            long countBefore = userRepository.count();
            //formater:off

            mockMvc.perform(post("/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.statusCode").value(400))
            .andExpect(jsonPath("$.details",
            hasItem(startsWith("email:"))));
            
            //formater:on
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test 
        @DisplayName ("Create user fail with duplicate email")

        void createUser_withDuplicateEmail() throws Exception{

            String email = "duplicate@gmail.com";
            String json = userJson(email);

            mockMvc.perform(post("/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json)
            .with(jwt()))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.statusCode").value(201));

            long countBefore = userRepository.count();

            //formaterr:off
            mockMvc.perform(post(("/users"))
            .contentType(MediaType.APPLICATION_JSON)
            .content(json)
            .with(jwt()))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.statusCode").value(409))
            .andExpect(jsonPath("$.error").value("Conflict"));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test 
        @DisplayName ("Create user fail with uncorrect format email")

        void createUser_withUncorrectFormatEmail() throws Exception{
        String email = "testexample.com";
        String json = userJson(email);

        long countBefore = userRepository.count();

        mockMvc.perform(post("/users")
        .contentType(MediaType.APPLICATION_JSON)
        .content(json)
        .with(jwt()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.statusCode").value(400))
        .andExpect(jsonPath("$.details").isArray())
        .andExpect(jsonPath("$.details",hasItem(startsWith("email:"))));

        assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName ("Create User with short password")

        void createUser_withShortPassword() throws Exception{
            User user = new User();
            user.setName("test");
            user.setEmail("test@gmail.com");
            user.setPassword("12345");
            user.setAddress("Ha Noi");
            String json = objectMapper.writeValueAsString(user);

            long countBefore =userRepository.count();
            mockMvc.perform(post("/users")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json)
            .with(jwt()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.statusCode").value(400))
            .andExpect(jsonPath("$.details").isArray())
            .andExpect(jsonPath("$.details",hasItem(startsWith("password:"))));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }
    }

        @Nested 
        @DisplayName ("Get user")

        class getUsers{

            @Test 
            @DisplayName ("Get user with authenticated jwt")

            void getUsers_withAuthenticatedJwt() throws Exception{
                User createUser = new User();
                createUser.setName("test");
                createUser.setEmail("test@gmail.com");
                createUser.setPassword(passwordEncoder.encode("126"));
                createUser.setAddress("HANOI");
                userRepository.saveAndFlush(createUser);
                entityManager.clear();                

                mockMvc.perform(get("/users")
                .with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value(createUser.getName()))
                .andExpect(jsonPath("$.data[0].email").value(createUser.getEmail()))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].password").doesNotExist());
            }

            @Test
            @DisplayName ("Get user with unauthenticated jwt")

            void getUser_withUnAuthenticatedJwt() throws Exception{
                mockMvc.perform(get("/users"))
                .andExpect(status().isUnauthorized());
            }
    }
    @Nested
    @DisplayName("Update User")
    class UpdateUser {

        @Test
        @DisplayName("Cập nhật thành công khi dữ liệu hợp lệ")
        void updateUserSucced_ShouldReturnUser() throws Exception {
            // Arrange
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(currentUser);
            Long userId = savedUser.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            User request = userValid("update@gmail.com");
            request.setName("update");
            request.setAddress("updateAddress");
            request.setPassword("updatePassword");

            // Act & Assert
            mockMvc.perform(put("/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(jwt()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.statusCode").value(200))
                    .andExpect(jsonPath("$.data.id").value(userId))
                    .andExpect(jsonPath("$.data.name").value("update"))
                    .andExpect(jsonPath("$.data.email").value("update@gmail.com"))
                    .andExpect(jsonPath("$.data.address").value("updateAddress"))
                    .andExpect(jsonPath("$.data.password").doesNotExist());

            entityManager.flush();
            entityManager.clear();
            User updatedUser = userRepository.findById(userId).orElseThrow();
            assertThat(updatedUser.getName()).isEqualTo("update");
            assertThat(updatedUser.getEmail()).isEqualTo("update@gmail.com");
            assertThat(updatedUser.getAddress()).isEqualTo("updateAddress");
            assertThat(passwordEncoder.matches("updatePassword", updatedUser.getPassword())).isTrue();
            assertThat(userRepository.existsByEmail("test@gmail.com")).isFalse();
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Cập nhật thành công khi giữ nguyên email của người dùng")
        void updateUser_withUnchangedEmail_shouldSucceed() throws Exception {
            // Arrange
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(currentUser);
            Long userId = savedUser.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            User request = userValid("test@gmail.com");
            request.setName("Updated Name");
            request.setAddress("Da Nang");

            // Act & Assert
            mockMvc.perform(put("/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(jwt()))
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
            // Arrange
            User currentUser = userValid("test@gmail.com");
            currentUser.setPassword(passwordEncoder.encode(currentUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(currentUser);
            Long userId = savedUser.getId();
            String originalPasswordHash = savedUser.getPassword();
            long countBefore = userRepository.count();
            entityManager.clear();

            User request = userValid("changed@gmail.com");
            request.setName("Changed Name");
            request.setAddress("Da Nang");
            request.setPassword("newPassword123");

            // Act & Assert
            mockMvc.perform(put("/users/{id}", userId)
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
            // Arrange
            User request = userValid("test@gmail.com");
            long userId = -1L;
            assertThat(userRepository.existsById(userId)).isFalse();
            long countBefore = userRepository.count();

            // Act & Assert
            mockMvc.perform(put("/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(jwt()))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.statusCode").value(404));

            assertThat(userRepository.count()).isEqualTo(countBefore);
        }

        @Test
        @DisplayName("Trả về 409 khi email thuộc người dùng khác")
        void updateUser_withExistedEmail() throws Exception {
            // Arrange
            User firstUser = userValid("user1@gmail.com");
            firstUser.setPassword(passwordEncoder.encode(firstUser.getPassword()));
            User savedUser = userRepository.saveAndFlush(firstUser);
            Long userId = savedUser.getId();

            User secondUser = userValid("user2@gmail.com");
            secondUser.setPassword(passwordEncoder.encode(secondUser.getPassword()));
            userRepository.saveAndFlush(secondUser);

            User request = userValid("user2@gmail.com");

            // Act & Assert
            mockMvc.perform(put("/users/{id}", userId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request))
                            .with(jwt()))
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

            mockMvc.perform(delete("/users/{id}", userID)
                            .with(jwt()))
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

            mockMvc.perform(delete("/users/{id}", userID)
                            .with(jwt()))
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
            // Arrange
            User user = userValid("test@gmail.com");
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            User savedUser = userRepository.saveAndFlush(user);
            Long userId = savedUser.getId();
            long countBefore = userRepository.count();
            entityManager.clear();

            // Act & Assert
            mockMvc.perform(delete("/users/{id}", userId))
                    .andExpect(status().isUnauthorized());

            entityManager.flush();
            entityManager.clear();
            User remainingUser = userRepository.findById(userId).orElseThrow();
            assertThat(remainingUser.getEmail()).isEqualTo("test@gmail.com");
            assertThat(userRepository.count()).isEqualTo(countBefore);
        }
    }
}
