package com.example.hrmanagement.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.exception.GlobalExceptionHandler;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.auth.AuthController;
import com.example.hrmanagement.feature.auth.AuthService;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/auth/me trả về 200 và thông tin user theo principal đã xác thực")
    void getCurrentUser_whenAuthenticated_shouldReturn200WithUserDto() throws Exception {
        UserResponseDTO dto = UserResponseDTO.builder()
                .id(1L)
                .name("Super Admin")
                .email("admin@example.com")
                .age(30)
                .address("Ho Chi Minh City")
                .gender(User.GenderEnum.MALE)
                .avatar("admin.png")
                .companyInfo(new UserResponseDTO.CompanyInfo(1L, "NNH_Entertainment"))
                .roleInfo(Set.of(new UserResponseDTO.RoleInfo(1L, "ADMIN")))
                .build();

        when(authService.getCurrentUser("admin@example.com")).thenReturn(dto);

        var auth = new UsernamePasswordAuthenticationToken(
                "admin@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        mockMvc.perform(get("/api/v1/auth/me").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.message").value("Get current user successfully"))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("Super Admin"))
                .andExpect(jsonPath("$.data.email").value("admin@example.com"))
                .andExpect(jsonPath("$.data.companyInfo.name").value("NNH_Entertainment"))
                .andExpect(jsonPath("$.data.roleInfo[0].name").value("ADMIN"));

        verify(authService).getCurrentUser("admin@example.com");
    }

    @Test
    @DisplayName("GET /api/v1/auth/me trả về 404 khi không tìm thấy user")
    void getCurrentUser_whenUserMissing_shouldReturn404() throws Exception {
        when(authService.getCurrentUser("missing@example.com"))
                .thenThrow(new ResourceNotFoundException("User", "email", "missing@example.com"));

        var auth = new UsernamePasswordAuthenticationToken(
                "missing@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        mockMvc.perform(get("/api/v1/auth/me").principal(auth))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.statusCode").value(404));
    }

    @Test
    @DisplayName("Gọi trực tiếp getCurrentUser với authentication null hoặc anonymous trả về 401 an toàn")
    void getCurrentUser_whenAuthenticationMissingOrAnonymous_shouldReturn401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.statusCode").value(401));

        var directNullResponse = authController.getCurrentUser(null);
        assertThat(directNullResponse.getStatusCode().value()).isEqualTo(401);
        assertThat(directNullResponse.getBody()).isInstanceOfSatisfying(ApiResponse.class, body ->
                assertThat(body.getStatusCode()).isEqualTo(401));

        var anonymous = new AnonymousAuthenticationToken(
                "key", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS")));
        var directAnonResponse = authController.getCurrentUser(anonymous);
        assertThat(directAnonResponse.getStatusCode().value()).isEqualTo(401);

        verifyNoInteractions(authService);
    }
}
