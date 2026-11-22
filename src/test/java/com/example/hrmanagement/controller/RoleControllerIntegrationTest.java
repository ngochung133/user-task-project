package com.example.hrmanagement.controller;

import static org.assertj.core.api.Assertions.assertThat;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.role.dto.RoleRequestDTO;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

import jakarta.transaction.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
@Transactional
class RoleControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private PermissionAuthorizationManager permissionAuthorizationManager;

    private Permission samplePerm;

    @BeforeEach
    void setUpRbac() {
        List<Permission> perms = permissionRepository.saveAllAndFlush(List.of(
                buildPerm("CREATE_ROLE", "/api/v1/roles", "POST"),
                buildPerm("VIEW_ROLES", "/api/v1/roles", "GET"),
                buildPerm("VIEW_ROLE", "/api/v1/roles/{id}", "GET"),
                buildPerm("UPDATE_ROLE", "/api/v1/roles/{id}", "PUT"),
                buildPerm("DELETE_ROLE", "/api/v1/roles/{id}", "DELETE")));
        samplePerm = perms.get(0);

        Role admin = new Role();
        admin.setName("ADMIN");
        admin.setDescription("Admin test");
        admin.setPermissions(Set.copyOf(perms));
        roleRepository.saveAndFlush(admin);

        permissionAuthorizationManager.loadCache();
    }

    private Permission buildPerm(String name, String path, String method) {
        Permission p = new Permission();
        p.setName(name);
        p.setApiPath(path);
        p.setMethod(method);
        p.setModule("ROLE");
        return p;
    }

    private JwtRequestPostProcessor adminJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("CRUD Role đầy đủ và xóa Role không xóa Permission liên kết")
    void fullCrudRoleFlow() throws Exception {
        RoleRequestDTO createReq = new RoleRequestDTO("HR_STAFF", "HR permissions", Set.of(samplePerm.getId()));

        String createdBody = mockMvc.perform(post("/api/v1/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq))
                        .with(adminJwt()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("HR_STAFF"))
                .andExpect(jsonPath("$.data.permissions.length()").value(1))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long roleId = objectMapper.readTree(createdBody).path("data").path("id").asLong();

        mockMvc.perform(get("/api/v1/roles")
                        .param("name", "HR_STAFF")
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));

        mockMvc.perform(get("/api/v1/roles/{id}", roleId).with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(roleId));

        RoleRequestDTO updateReq = new RoleRequestDTO("HR_STAFF", "Updated HR", Set.of());
        mockMvc.perform(put("/api/v1/roles/{id}", roleId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.description").value("Updated HR"))
                .andExpect(jsonPath("$.data.permissions.length()").value(0));

        mockMvc.perform(delete("/api/v1/roles/{id}", roleId).with(adminJwt()))
                .andExpect(status().isOk());

        assertThat(roleRepository.existsById(roleId)).isFalse();
        assertThat(permissionRepository.existsById(samplePerm.getId())).isTrue();
    }

    @Test
    @DisplayName("Tạo Role với một Permission ID không tồn tại trả 404 và không lưu Role")
    void createRoleWithMissingPermissionFailsAtomically() throws Exception {
        long countBefore = roleRepository.count();
        RoleRequestDTO req = new RoleRequestDTO("BROKEN_ROLE", "Missing perm", Set.of(samplePerm.getId(), 999999L));

        mockMvc.perform(post("/api/v1/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .with(adminJwt()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.statusCode").value(404));

        assertThat(roleRepository.count()).isEqualTo(countBefore);
    }

    @Test
    @DisplayName("Role kiểm tra validation 400, trùng tên 409, thiếu JWT 401 và thiếu quyền 403")
    void roleValidationConflictAndSecurity() throws Exception {
        mockMvc.perform(get("/api/v1/roles"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/roles")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_GUEST"))))
                .andExpect(status().isForbidden());

        RoleRequestDTO invalidReq = new RoleRequestDTO("", "", null);
        mockMvc.perform(post("/api/v1/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq))
                        .with(adminJwt()))
                .andExpect(status().isBadRequest());

        RoleRequestDTO dupReq = new RoleRequestDTO("ADMIN", "Duplicate", Set.of());
        mockMvc.perform(post("/api/v1/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq))
                        .with(adminJwt()))
                .andExpect(status().isConflict());
    }
}
