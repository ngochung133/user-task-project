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
import java.util.Set;

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
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.role.RoleServiceImpl;
import com.example.hrmanagement.feature.role.dto.RoleFilterDTO;
import com.example.hrmanagement.feature.role.dto.RoleRequestDTO;
import com.example.hrmanagement.feature.role.dto.RoleResponseDTO;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

@ExtendWith(MockitoExtension.class)
class RoleServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PermissionRepository permissionRepository;

    @Mock
    private PermissionAuthorizationManager permissionAuthorizationManager;

    @InjectMocks
    private RoleServiceImpl roleService;

    private Permission perm1;
    private Role role;

    @BeforeEach
    void setUp() {
        perm1 = new Permission();
        perm1.setId(1L);
        perm1.setName("VIEW_USERS");
        perm1.setApiPath("/api/v1/users");
        perm1.setMethod("GET");
        perm1.setModule("USER");

        role = new Role();
        role.setId(10L);
        role.setName("HR");
        role.setDescription("HR role");
        role.setPermissions(Set.of(perm1));
    }

    @Nested
    @DisplayName("Tạo Role")
    class CreateRole {

        @Test
        @DisplayName("Tạo Role thành công, lưu quyền và reload cache RBAC")
        void create_shouldSaveAndReloadCache() {
            RoleRequestDTO req = new RoleRequestDTO("HR", "HR role", Set.of(1L));
            when(roleRepository.existsByName("HR")).thenReturn(false);
            when(permissionRepository.findAllById(Set.of(1L))).thenReturn(List.of(perm1));
            when(roleRepository.saveAndFlush(any(Role.class))).thenAnswer(inv -> {
                Role r = inv.getArgument(0);
                r.setId(10L);
                return r;
            });

            RoleResponseDTO result = roleService.create(req);

            assertThat(result.id()).isEqualTo(10L);
            assertThat(result.name()).isEqualTo("HR");
            assertThat(result.permissions()).hasSize(1);
            verify(permissionAuthorizationManager).loadCache();
        }

        @Test
        @DisplayName("Trùng tên Role ném 409 và không lưu")
        void create_whenDuplicateName_shouldThrowConflict() {
            RoleRequestDTO req = new RoleRequestDTO("HR", "HR role", Set.of(1L));
            when(roleRepository.existsByName("HR")).thenReturn(true);

            assertThatThrownBy(() -> roleService.create(req))
                    .isInstanceOf(ResourceAlreadyExistException.class);

            verify(roleRepository, never()).saveAndFlush(any(Role.class));
            verify(permissionAuthorizationManager, never()).loadCache();
        }

        @Test
        @DisplayName("Thiếu một Permission ID làm toàn bộ thao tác tạo thất bại")
        void create_whenAnyPermissionMissing_shouldThrowNotFound() {
            RoleRequestDTO req = new RoleRequestDTO("HR", "HR role", Set.of(1L, 999L));
            when(roleRepository.existsByName("HR")).thenReturn(false);
            when(permissionRepository.findAllById(Set.of(1L, 999L))).thenReturn(List.of(perm1));

            assertThatThrownBy(() -> roleService.create(req))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("999");

            verify(roleRepository, never()).saveAndFlush(any(Role.class));
            verify(permissionAuthorizationManager, never()).loadCache();
        }
    }

    @Nested
    @DisplayName("Cập nhật Role")
    class UpdateRole {

        @Test
        @DisplayName("Cập nhật Role thành công và reload cache RBAC")
        void update_shouldSucceedAndReloadCache() {
            RoleRequestDTO req = new RoleRequestDTO("HR", "Updated desc", Set.of(1L));
            when(roleRepository.findById(10L)).thenReturn(Optional.of(role));
            when(roleRepository.existsByNameAndIdNot("HR", 10L)).thenReturn(false);
            when(permissionRepository.findAllById(Set.of(1L))).thenReturn(List.of(perm1));
            when(roleRepository.saveAndFlush(any(Role.class))).thenAnswer(inv -> inv.getArgument(0));

            RoleResponseDTO result = roleService.update(10L, req);

            assertThat(result.description()).isEqualTo("Updated desc");
            verify(permissionAuthorizationManager).loadCache();
        }

        @Test
        @DisplayName("Cập nhật Role không tồn tại ném 404")
        void update_whenNotFound_shouldThrowNotFound() {
            RoleRequestDTO req = new RoleRequestDTO("HR", "Desc", Set.of());
            when(roleRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> roleService.update(99L, req))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Cập nhật trùng tên Role khác ném 409")
        void update_whenDuplicateName_shouldThrowConflict() {
            RoleRequestDTO req = new RoleRequestDTO("ADMIN", "Desc", Set.of());
            when(roleRepository.findById(10L)).thenReturn(Optional.of(role));
            when(roleRepository.existsByNameAndIdNot("ADMIN", 10L)).thenReturn(true);

            assertThatThrownBy(() -> roleService.update(10L, req))
                    .isInstanceOf(ResourceAlreadyExistException.class);
            verify(roleRepository, never()).saveAndFlush(any(Role.class));
        }
    }

    @Test
    @DisplayName("Lấy Role theo ID thành công và báo 404 khi không tồn tại")
    void getById_shouldReturnOrThrowNotFound() {
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role));
        when(roleRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(roleService.getById(10L).name()).isEqualTo("HR");
        assertThatThrownBy(() -> roleService.getById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Xóa Role thành công, flush DB và reload cache RBAC")
    void delete_shouldDeleteFlushAndReloadCache() {
        when(roleRepository.findById(10L)).thenReturn(Optional.of(role));

        roleService.delete(10L);

        verify(roleRepository).deleteById(10L);
        verify(roleRepository).flush();
        verify(permissionAuthorizationManager).loadCache();
    }

    @Test
    @DisplayName("Lấy danh sách Role phân trang kèm bộ lọc")
    @SuppressWarnings("unchecked")
    void getAll_shouldReturnPagedRoles() {
        Pageable pageable = PageRequest.of(0, 10);
        RoleFilterDTO filter = new RoleFilterDTO("HR", null, Set.of(1L));
        when(roleRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(role), pageable, 1));

        Page<RoleResponseDTO> page = roleService.getAll(pageable, filter);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).name()).isEqualTo("HR");
    }
}
