package com.example.hrmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.permission.PermissionServiceImpl;
import com.example.hrmanagement.feature.permission.dto.PermissionFilterDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionRequestDTO;
import com.example.hrmanagement.feature.permission.dto.PermissionResponseDTO;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

@ExtendWith(MockitoExtension.class)
class PermissionServiceTest {

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private PermissionAuthorizationManager permissionAuthorizationManager;

    @InjectMocks
    private PermissionServiceImpl permissionService;

    private Permission permission;

    @BeforeEach
    void setUp() {
        permission = new Permission();
        permission.setId(1L);
        permission.setName("VIEW_USERS");
        permission.setApiPath("/api/v1/users");
        permission.setMethod("GET");
        permission.setModule("USER");
    }

    @Nested
    @DisplayName("Tạo Permission")
    class CreatePermission {

        @Test
        @DisplayName("Chuẩn hóa trim/uppercase cho method và module, lưu và reload cache RBAC")
        void create_shouldNormalizeSaveAndReloadCache() {
            PermissionRequestDTO req = new PermissionRequestDTO("  VIEW_USERS  ", "  /api/v1/users  ", "  get ", " user ");
            when(permissionRepository.existsByApiPathAndMethod("/api/v1/users", "GET")).thenReturn(false);
            when(permissionRepository.saveAndFlush(any(Permission.class))).thenAnswer(inv -> {
                Permission p = inv.getArgument(0);
                p.setId(1L);
                return p;
            });

            PermissionResponseDTO res = permissionService.create(req);

            assertThat(res.name()).isEqualTo("VIEW_USERS");
            assertThat(res.apiPath()).isEqualTo("/api/v1/users");
            assertThat(res.method()).isEqualTo("GET");
            assertThat(res.module()).isEqualTo("USER");
            verify(permissionAuthorizationManager).loadCache();
        }

        @Test
        @DisplayName("Trùng cặp (apiPath, method) sau chuẩn hóa ném 409")
        void create_whenDuplicateApiAndMethod_shouldThrowConflict() {
            PermissionRequestDTO req = new PermissionRequestDTO("VIEW_USERS", "/api/v1/users", "get", "user");
            when(permissionRepository.existsByApiPathAndMethod("/api/v1/users", "GET")).thenReturn(true);

            assertThatThrownBy(() -> permissionService.create(req))
                    .isInstanceOf(ResourceAlreadyExistException.class);

            verify(permissionRepository, never()).saveAndFlush(any(Permission.class));
            verify(permissionAuthorizationManager, never()).loadCache();
        }
    }

    @Nested
    @DisplayName("Cập nhật Permission")
    class UpdatePermission {

        @Test
        @DisplayName("Cập nhật Permission thành công và reload cache RBAC")
        void update_shouldSucceedAndReloadCache() {
            PermissionRequestDTO req = new PermissionRequestDTO("READ_USERS", "/api/v1/users", "get", "user");
            when(permissionRepository.findById(1L)).thenReturn(Optional.of(permission));
            when(permissionRepository.existsByApiPathAndMethodAndIdNot("/api/v1/users", "GET", 1L)).thenReturn(false);
            when(permissionRepository.saveAndFlush(any(Permission.class))).thenAnswer(inv -> inv.getArgument(0));

            PermissionResponseDTO res = permissionService.update(1L, req);

            assertThat(res.name()).isEqualTo("READ_USERS");
            assertThat(res.method()).isEqualTo("GET");
            verify(permissionAuthorizationManager).loadCache();
        }

        @Test
        @DisplayName("Cập nhật Permission không tồn tại ném 404")
        void update_whenNotFound_shouldThrowNotFound() {
            PermissionRequestDTO req = new PermissionRequestDTO("READ", "/api/v1/users", "GET", "USER");
            when(permissionRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> permissionService.update(99L, req))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Cập nhật trùng cặp (apiPath, method) với bản ghi khác ném 409")
        void update_whenConflict_shouldThrowConflict() {
            PermissionRequestDTO req = new PermissionRequestDTO("CREATE", "/api/v1/users", "post", "user");
            when(permissionRepository.findById(1L)).thenReturn(Optional.of(permission));
            when(permissionRepository.existsByApiPathAndMethodAndIdNot("/api/v1/users", "POST", 1L)).thenReturn(true);

            assertThatThrownBy(() -> permissionService.update(1L, req))
                    .isInstanceOf(ResourceAlreadyExistException.class);

            verify(permissionRepository, never()).saveAndFlush(any(Permission.class));
        }
    }

    @Test
    @DisplayName("Lấy Permission theo ID thành công và báo 404 khi thiếu")
    void getById_shouldReturnOrThrowNotFound() {
        when(permissionRepository.findById(1L)).thenReturn(Optional.of(permission));
        when(permissionRepository.findById(2L)).thenReturn(Optional.empty());

        assertThat(permissionService.getById(1L).name()).isEqualTo("VIEW_USERS");
        assertThatThrownBy(() -> permissionService.getById(2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Xóa Permission thành công, flush và reload cache RBAC")
    void deleteById_shouldDeleteFlushAndReloadCache() {
        when(permissionRepository.findById(1L)).thenReturn(Optional.of(permission));

        permissionService.deleteById(1L);

        verify(permissionRepository).deleteById(1L);
        verify(permissionRepository).flush();
        verify(permissionAuthorizationManager).loadCache();
    }

    @Test
    @DisplayName("Lấy danh sách Permission phân trang kèm bộ lọc")
    @SuppressWarnings("unchecked")
    void getAllPermission_shouldReturnPage() {
        Pageable pageable = PageRequest.of(0, 10);
        PermissionFilterDTO filter = new PermissionFilterDTO("VIEW", "GET", "USER");
        when(permissionRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(permission), pageable, 1));

        Page<PermissionResponseDTO> page = permissionService.getAllPermission(pageable, filter);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).method()).isEqualTo("GET");
    }
}
