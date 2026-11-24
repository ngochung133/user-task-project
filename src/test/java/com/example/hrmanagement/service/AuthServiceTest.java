package com.example.hrmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.util.ReflectionTestUtils;

import com.example.hrmanagement.exception.InvalidTokenException;
import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.auth.AuthServiceImpl;
import com.example.hrmanagement.feature.auth.RefreshToken;
import com.example.hrmanagement.feature.auth.RefreshTokenRepository;
import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.auth.dto.LoginResponseDTO;
import com.example.hrmanagement.feature.auth.dto.RegisterRequest;
import com.example.hrmanagement.feature.auth.dto.RegisterResponse;
import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtEncoder jwtEncoder;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @InjectMocks
    private AuthServiceImpl authService;

    private Role defaultRole;
    private User user;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "accessTokenExpiration", 900_000L);
        ReflectionTestUtils.setField(authService, "refreshTokenExpiration", 604_800_000L);

        defaultRole = new Role();
        defaultRole.setId(1L);
        defaultRole.setName("USER");

        user = new User();
        user.setId(5L);
        user.setName("Alice");
        user.setEmail("alice@example.com");
        user.setPassword("encoded");
        user.setAddress("Ha Noi");
        user.setRoles(Set.of(defaultRole));
    }

    private Jwt fakeJwt(String tokenValue) {
        return Jwt.withTokenValue(tokenValue)
                .header("alg", "HS256")
                .claim("sub", "alice@example.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build();
    }

    @Nested
    @DisplayName("Đăng ký tài khoản")
    class Register {

        @Test
        @DisplayName("Đăng ký thành công, mã hóa mật khẩu và tự gán role USER")
        void register_shouldAssignDefaultUserRole() {
            RegisterRequest req = new RegisterRequest(
                    "Alice", "alice@example.com", "Password123", 25, User.GenderEnum.FEMALE, "Ha Noi");
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
            when(roleRepository.findByName("USER")).thenReturn(Optional.of(defaultRole));
            when(passwordEncoder.encode("Password123")).thenReturn("hashed");
            when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
                User saved = inv.getArgument(0);
                saved.setId(5L);
                return saved;
            });

            RegisterResponse res = authService.register(req);

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(captor.capture());
            assertThat(captor.getValue().getPassword()).isEqualTo("hashed");
            assertThat(captor.getValue().getRoles()).extracting(Role::getName).containsExactly("USER");
            assertThat(res.email()).isEqualTo("alice@example.com");
        }

        @Test
        @DisplayName("Trùng email khi đăng ký ném 409")
        void register_whenDuplicateEmail_shouldThrowConflict() {
            RegisterRequest req = new RegisterRequest(
                    "Alice", "alice@example.com", "Password123", 25, User.GenderEnum.FEMALE, "Ha Noi");
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(true);

            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ResourceAlreadyExistException.class);
            verify(userRepository, never()).saveAndFlush(any(User.class));
        }

        @Test
        @DisplayName("Thiếu role USER trong DB ném 404")
        void register_whenDefaultRoleMissing_shouldThrowNotFound() {
            RegisterRequest req = new RegisterRequest(
                    "Alice", "alice@example.com", "Password123", 25, User.GenderEnum.FEMALE, "Ha Noi");
            when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
            when(roleRepository.findByName("USER")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ResourceNotFoundException.class);
            verify(userRepository, never()).saveAndFlush(any(User.class));
        }
    }

    @Test
    @DisplayName("Login gán Unknown cho deviceInfo/ipAddress bị null và lưu refresh token đã hash SHA-256")
    void login_whenDeviceInfoAndIpNull_shouldDefaultToUnknownAndHashToken() {
        LoginRequestDTO req = LoginRequestDTO.builder().email("alice@example.com").password("123456").build();
        var auth = new UsernamePasswordAuthenticationToken(
                "alice@example.com", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(jwtEncoder.encode(any(JwtEncoderParameters.class)))
                .thenReturn(fakeJwt("access-jwt"), fakeJwt("raw-refresh-jwt"));

        LoginResponseDTO res = authService.login(req, null, "   ");

        assertThat(res.accessToken()).isEqualTo("access-jwt");
        assertThat(res.refreshToken()).isEqualTo("raw-refresh-jwt");

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        assertThat(saved.getDeviceInfo()).isEqualTo("Unknown");
        assertThat(saved.getIpAddress()).isEqualTo("Unknown");
        assertThat(saved.getToken()).isNotEqualTo("raw-refresh-jwt").hasSize(64);
        assertThat(saved.isRevoked()).isFalse();
    }

    @Nested
    @DisplayName("Refresh & Logout token")
    class RefreshAndLogout {

        @Test
        @DisplayName("Refresh thành công revoke token cũ và cấp cặp token mới")
        void refresh_shouldRotateToken() {
            RefreshToken stored = new RefreshToken();
            stored.setUser(user);
            stored.setRevoked(false);
            stored.setExpiresAt(Instant.now().plusSeconds(3600));
            stored.setDeviceInfo("Chrome");
            stored.setIpAddress("127.0.0.1");

            when(refreshTokenRepository.findByToken(any())).thenReturn(Optional.of(stored));
            when(jwtEncoder.encode(any(JwtEncoderParameters.class)))
                    .thenReturn(fakeJwt("new-access"), fakeJwt("new-refresh"));

            LoginResponseDTO res = authService.refresh("old-raw-refresh");

            assertThat(stored.isRevoked()).isTrue();
            assertThat(res.accessToken()).isEqualTo("new-access");
            assertThat(res.refreshToken()).isEqualTo("new-refresh");
        }

        @Test
        @DisplayName("Refresh thất bại khi token đã bị revoke hoặc hết hạn")
        void refresh_whenRevokedOrExpired_shouldThrowInvalidToken() {
            RefreshToken revoked = new RefreshToken();
            revoked.setRevoked(true);
            revoked.setExpiresAt(Instant.now().plusSeconds(3600));
            when(refreshTokenRepository.findByToken(any())).thenReturn(Optional.of(revoked));

            assertThatThrownBy(() -> authService.refresh("revoked-token"))
                    .isInstanceOf(InvalidTokenException.class);

            RefreshToken expired = new RefreshToken();
            expired.setRevoked(false);
            expired.setExpiresAt(Instant.now().minusSeconds(10));
            when(refreshTokenRepository.findByToken(any())).thenReturn(Optional.of(expired));

            assertThatThrownBy(() -> authService.refresh("expired-token"))
                    .isInstanceOf(InvalidTokenException.class);
        }

        @Test
        @DisplayName("Logout đánh dấu revoked = true và từ chối token không tồn tại")
        void logout_shouldRevokeTokenOrThrow() {
            RefreshToken stored = new RefreshToken();
            stored.setRevoked(false);
            stored.setExpiresAt(Instant.now().plusSeconds(3600));
            when(refreshTokenRepository.findByToken(any())).thenReturn(Optional.of(stored));

            authService.logout("valid-raw-token");

            assertThat(stored.isRevoked()).isTrue();
            verify(refreshTokenRepository).save(stored);

            when(refreshTokenRepository.findByToken(any())).thenReturn(Optional.empty());
            assertThatThrownBy(() -> authService.logout("missing-token"))
                    .isInstanceOf(InvalidTokenException.class);
        }
    }

    @Nested
    @DisplayName("Lấy thông tin người dùng hiện tại")
    class GetCurrentUser {

        @Test
        @DisplayName("Trả về UserResponseDTO đầy đủ company và roles theo email")
        void getCurrentUser_shouldReturnMappedUserResponseDto() {
            Company company = new Company();
            company.setId(10L);
            company.setName("NNH_Entertainment");

            user.setAge(25);
            user.setGender(User.GenderEnum.FEMALE);
            user.setAvatar("avatar.png");
            user.setCompany(company);

            when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

            UserResponseDTO res = authService.getCurrentUser("alice@example.com");

            assertThat(res.id()).isEqualTo(5L);
            assertThat(res.name()).isEqualTo("Alice");
            assertThat(res.email()).isEqualTo("alice@example.com");
            assertThat(res.age()).isEqualTo(25);
            assertThat(res.address()).isEqualTo("Ha Noi");
            assertThat(res.gender()).isEqualTo(User.GenderEnum.FEMALE);
            assertThat(res.avatar()).isEqualTo("avatar.png");
            assertThat(res.companyInfo()).isEqualTo(new UserResponseDTO.CompanyInfo(10L, "NNH_Entertainment"));
            assertThat(res.roleInfo()).containsExactly(new UserResponseDTO.RoleInfo(1L, "USER"));
        }

        @Test
        @DisplayName("Ném ResourceNotFoundException khi email không tồn tại")
        void getCurrentUser_whenUserNotFound_shouldThrowNotFound() {
            when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.getCurrentUser("missing@example.com"))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("missing@example.com");
        }
    }
}
