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
import com.example.hrmanagement.feature.permission.dto.PermissionRequestDTO;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
@Transactional
class PermissionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionAuthorizationManager permissionAuthorizationManager;
    @Autowired
    private EntityManager entityManager;

    private Permission assignedPerm;

    @BeforeEach
    void setUpRbac() {
        List<Permission> perms = permissionRepository.saveAllAndFlush(List.of(
                buildPerm("CREATE_PERMISSION", "/api/v1/permissions", "POST"),
                buildPerm("VIEW_PERMISSIONS", "/api/v1/permissions", "GET"),
                buildPerm("VIEW_PERMISSION", "/api/v1/permissions/{id}", "GET"),
                buildPerm("UPDATE_PERMISSION", "/api/v1/permissions/{id}", "PUT"),
                buildPerm("DELETE_PERMISSION", "/api/v1/permissions/{id}", "DELETE")));
        assignedPerm = perms.get(0);

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
        p.setModule("PERMISSION");
        return p;
    }

    private JwtRequestPostProcessor adminJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    @DisplayName("CRUD Permission: chuẩn hóa method/module viết hoa, lọc list, cập nhật giữ nguyên cặp path+method và xóa")
    void fullCrudPermissionFlow() throws Exception {
        PermissionRequestDTO createReq = new PermissionRequestDTO(
                "  Export Reports  ", " /api/v1/reports ", " get ", " user ");

        String createdBody = mockMvc.perform(post("/api/v1/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq))
                        .with(adminJwt()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Export Reports"))
                .andExpect(jsonPath("$.data.apiPath").value("/api/v1/reports"))
                .andExpect(jsonPath("$.data.method").value("GET"))
                .andExpect(jsonPath("$.data.module").value("USER"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long id = objectMapper.readTree(createdBody).path("data").path("id").asLong();

        mockMvc.perform(get("/api/v1/permissions")
                        .param("name", "export")
                        .param("method", "get")
                        .param("module", "user")
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));

        mockMvc.perform(get("/api/v1/permissions/{id}", id).with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id));

        PermissionRequestDTO updateReq = new PermissionRequestDTO(
                "Export All Reports", "/api/v1/reports", "GET", "USER");
        mockMvc.perform(put("/api/v1/permissions/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Export All Reports"));

        mockMvc.perform(delete("/api/v1/permissions/{id}", id).with(adminJwt()))
                .andExpect(status().isOk());

        assertThat(permissionRepository.existsById(id)).isFalse();
    }

    @Test
    @DisplayName("Trùng (apiPath, method) trả 409, xóa Permission đang gắn Role trả 409, lỗi validation trả 400 và bảo mật 401/403")
    void permissionConflictValidationAndSecurity() throws Exception {
        mockMvc.perform(get("/api/v1/permissions"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/permissions")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_GUEST"))))
                .andExpect(status().isForbidden());

        PermissionRequestDTO blankReq = new PermissionRequestDTO("", "", "", "");
        mockMvc.perform(post("/api/v1/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blankReq))
                        .with(adminJwt()))
                .andExpect(status().isBadRequest());

        PermissionRequestDTO dupReq = new PermissionRequestDTO(
                "Duplicate", "/api/v1/permissions", "post", "permission");
        mockMvc.perform(post("/api/v1/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq))
                        .with(adminJwt()))
                .andExpect(status().isConflict());

        // Tách entity fixture khỏi request để lỗi xóa được kiểm tra tại FK MySQL.
        entityManager.clear();
        mockMvc.perform(delete("/api/v1/permissions/{id}", assignedPerm.getId()).with(adminJwt()))
                .andExpect(status().isConflict());
    }
}
