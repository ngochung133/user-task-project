package com.example.hrmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;
import com.example.hrmanagement.feature.user.UserServiceImpl;
import com.example.hrmanagement.feature.user.dto.UserFilterDTO;
import com.example.hrmanagement.feature.user.dto.UserRequestDTO;
import com.example.hrmanagement.feature.user.dto.UserResponseDTO;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private UserServiceImpl userService;

    private User mockUser;
    private UserRequestDTO validRequest;
    private Role userRole;

    @BeforeEach
    void setUp() {
        userRole = new Role();
        userRole.setId(10L);
        userRole.setName("USER");

        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("test@gmail.com");
        mockUser.setName("Test");
        mockUser.setPassword("encoded_password");
        mockUser.setAddress("Ha Noi");
        mockUser.setAvatar("avatar.png");
        mockUser.setRoles(Set.of(userRole));

        validRequest = new UserRequestDTO(
                "Test",
                "test@gmail.com",
                "123456",
                25,
                "avatar.png",
                User.GenderEnum.MALE,
                null,
                Set.of(10L),
                "Ha Noi");
    }

    @Test
    @DisplayName("Lấy danh sách user có phân trang và bộ lọc")
    @SuppressWarnings("unchecked")
    void testFetchAllUser() {
        Pageable pageable = PageRequest.of(0, 10);
        UserFilterDTO filter = new UserFilterDTO(null, "Test", null, null, null, null);
        when(userRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(mockUser), pageable, 1));

        Page<UserResponseDTO> result = userService.fetchAllUser(pageable, filter);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).id()).isEqualTo(1L);
        assertThat(result.getContent().get(0).name()).isEqualTo("Test");
        assertThat(result.getContent().get(0).avatar()).isEqualTo("avatar.png");
        verify(userRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    @DisplayName("Lấy user theo ID thành công và báo 404 khi không tồn tại")
    void testGetUserById() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        UserResponseDTO found = userService.getUserById(1L);
        assertThat(found.id()).isEqualTo(1L);
        assertThat(found.email()).isEqualTo("test@gmail.com");

        assertThatThrownBy(() -> userService.getUserById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Nested
    @DisplayName("Khi tạo User thành công")
    class WhenCreateUserSucceeds {

        @Test
        @DisplayName("Tạo User thành công, mã hóa mật khẩu và lưu avatar")
        void createUser_shouldEncodePasswordAndSaveAvatar() {
            String hashPassword = "encoded_password";
            when(userRepository.existsByEmail(validRequest.getEmail())).thenReturn(false);
            when(roleRepository.findAllById(validRequest.getRoleIDs())).thenReturn(List.of(userRole));
            when(passwordEncoder.encode("123456")).thenReturn(hashPassword);
            when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
                User u = inv.getArgument(0);
                u.setId(1L);
                return u;
            });

            UserResponseDTO result = userService.createUser(validRequest);

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(userCaptor.capture());
            User savedUser = userCaptor.getValue();

            assertThat(savedUser.getPassword()).isEqualTo(hashPassword);
            assertThat(savedUser.getAvatar()).isEqualTo("avatar.png");
            assertThat(result.id()).isEqualTo(1L);
            assertThat(result.email()).isEqualTo("test@gmail.com");
            assertThat(result.avatar()).isEqualTo("avatar.png");
        }
    }

    @Nested
    @DisplayName("Khi tạo User thất bại")
    class WhenCreateUserFail {

        @Test
        @DisplayName("Email đã tồn tại: ném ResourceAlreadyExistException và không lưu DB")
        void createUser_whenEmailExists_shouldNotSave() {
            when(userRepository.existsByEmail(validRequest.getEmail())).thenReturn(true);

            assertThatThrownBy(() -> userService.createUser(validRequest))
                    .isInstanceOf(ResourceAlreadyExistException.class)
                    .hasMessageContaining("test@gmail.com");

            verify(userRepository, never()).saveAndFlush(any(User.class));
        }

        @Test
        @DisplayName("Role ID không tồn tại: ném ResourceNotFoundException và không lưu DB")
        void createUser_whenRoleMissing_shouldThrowNotFound() {
            when(userRepository.existsByEmail(validRequest.getEmail())).thenReturn(false);
            when(roleRepository.findAllById(validRequest.getRoleIDs())).thenReturn(List.of());

            assertThatThrownBy(() -> userService.createUser(validRequest))
                    .isInstanceOf(ResourceNotFoundException.class);

            verify(userRepository, never()).saveAndFlush(any(User.class));
        }
    }

    @Nested
    @DisplayName("Xóa User")
    class DeleteUser {

        @Test
        @DisplayName("Xóa User thành công")
        void deleteUser_whenExistUser() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));

            userService.deleteUserByID(1L);

            verify(userRepository).findById(1L);
            verify(userRepository).deleteById(1L);
        }

        @Test
        @DisplayName("Xóa User không tồn tại ném ResourceNotFoundException")
        void deleteUser_whenNotExistUser() {
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.deleteUserByID(1L))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("1");

            verify(userRepository, never()).deleteById(anyLong());
        }
    }

    @Nested
    @DisplayName("Update User")
    class UpdateUser {

        @Test
        @DisplayName("Cập nhật User thành công")
        void updateUser_shouldReturnNewUpdate() {
            UserRequestDTO updateRequest = new UserRequestDTO(
                    "New",
                    "new@gmail.com",
                    "newPassword",
                    28,
                    "new-avatar.png",
                    User.GenderEnum.FEMALE,
                    null,
                    Set.of(10L),
                    "newAddress");
            String hashPassword = "encoded_new_password";

            when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
            when(userRepository.existsByEmailAndIdNot("new@gmail.com", 1L)).thenReturn(false);
            when(roleRepository.findAllById(Set.of(10L))).thenReturn(List.of(userRole));
            when(passwordEncoder.encode("newPassword")).thenReturn(hashPassword);
            when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

            UserResponseDTO result = userService.updateUser(1L, updateRequest);

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(userCaptor.capture());
            User savedUser = userCaptor.getValue();

            assertThat(savedUser.getPassword()).isEqualTo(hashPassword);
            assertThat(savedUser.getAvatar()).isEqualTo("new-avatar.png");
            assertThat(result.id()).isEqualTo(1L);
            assertThat(result.email()).isEqualTo("new@gmail.com");
            assertThat(result.name()).isEqualTo("New");
        }

        @Test
        @DisplayName("Không tìm thấy User khi cập nhật")
        void updateUser_UserNotExist() {
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.updateUser(1L, validRequest))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("1");

            verify(userRepository, never()).saveAndFlush(any(User.class));
        }

        @Test
        @DisplayName("Email cập nhật bị trùng với user khác")
        void updateUser_whenEmailDuplicate() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
            when(userRepository.existsByEmailAndIdNot(validRequest.getEmail(), 1L)).thenReturn(true);

            assertThatThrownBy(() -> userService.updateUser(1L, validRequest))
                    .isInstanceOf(ResourceAlreadyExistException.class)
                    .hasMessageContaining(validRequest.getEmail());

            verify(userRepository, never()).saveAndFlush(any(User.class));
        }
    }
}
