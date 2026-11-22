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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.company.dto.CompanyRequestDTO;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
@Transactional
class CompanyControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private PermissionAuthorizationManager permissionAuthorizationManager;

    @BeforeEach
    void setUpRbac() {
        List<Permission> perms = permissionRepository.saveAllAndFlush(List.of(
                buildPerm("CREATE_COMPANY", "/api/v1/companies", "POST"),
                buildPerm("VIEW_COMPANIES", "/api/v1/companies", "GET"),
                buildPerm("VIEW_COMPANY", "/api/v1/companies/{id}", "GET"),
                buildPerm("UPDATE_COMPANY", "/api/v1/companies/{id}", "PUT"),
                buildPerm("DELETE_COMPANY", "/api/v1/companies/{id}", "DELETE")));

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
        p.setModule("COMPANY");
        return p;
    }

    private JwtRequestPostProcessor adminJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    private JwtRequestPostProcessor guestJwt() {
        return jwt().authorities(new SimpleGrantedAuthority("ROLE_GUEST"));
    }

    private Company savedCompany(String name) {
        Company c = new Company();
        c.setName(name);
        c.setDescription("Desc " + name);
        c.setAddress("Ha Noi");
        c.setLogo("logo.png");
        return companyRepository.saveAndFlush(c);
    }

    @Test
    @DisplayName("CRUD Company đầy đủ: POST 201, GET list/id 200, PUT giữ nguyên tên 200, DELETE 200")
    void fullCrudCompanyFlow() throws Exception {
        CompanyRequestDTO createReq = new CompanyRequestDTO("Tech Viet", "Software", "Ha Noi", "tech.png");

        String createdBody = mockMvc.perform(post("/api/v1/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq))
                        .with(adminJwt()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").isNumber())
                .andExpect(jsonPath("$.data.name").value("Tech Viet"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        long id = objectMapper.readTree(createdBody).path("data").path("id").asLong();

        mockMvc.perform(get("/api/v1/companies")
                        .param("name", "tech")
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].name").value("Tech Viet"));

        mockMvc.perform(get("/api/v1/companies/{id}", id).with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id));

        CompanyRequestDTO updateReq = new CompanyRequestDTO("Tech Viet", "Updated desc", "Da Nang", "tech2.png");
        mockMvc.perform(put("/api/v1/companies/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .with(adminJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.description").value("Updated desc"))
                .andExpect(jsonPath("$.data.address").value("Da Nang"));

        mockMvc.perform(delete("/api/v1/companies/{id}", id).with(adminJwt()))
                .andExpect(status().isOk());

        assertThat(companyRepository.existsById(id)).isFalse();
    }

    @Test
    @DisplayName("Tạo Company lỗi validation trả 400 và trùng tên trả 409")
    void createCompanyValidationAndConflict() throws Exception {
        CompanyRequestDTO blankReq = new CompanyRequestDTO("", "", "", "");
        mockMvc.perform(post("/api/v1/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blankReq))
                        .with(adminJwt()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.statusCode").value(400));

        savedCompany("Duplicate Co");
        CompanyRequestDTO dupReq = new CompanyRequestDTO("Duplicate Co", "Desc", "HCM", "logo.png");
        mockMvc.perform(post("/api/v1/companies")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dupReq))
                        .with(adminJwt()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.statusCode").value(409));
    }

    @Test
    @DisplayName("Company trả 404 khi ID không tồn tại, 401 khi thiếu JWT và 403 khi thiếu quyền")
    void companySecurityAndNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/companies"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/companies").with(guestJwt()))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/companies/{id}", -1L).with(adminJwt()))
                .andExpect(status().isNotFound());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("Xóa Company đang có User tham chiếu trả 409 Conflict và giữ nguyên dữ liệu")
    void deleteCompanyReferencedByUserReturns409() throws Exception {
        Permission deletePerm = permissionRepository.saveAndFlush(buildPerm("DELETE_COMPANY_FK", "/api/v1/companies/{id}", "DELETE"));
        Role role = new Role();
        role.setName("ADMIN_FK_TEST");
        role.setDescription("Temp admin");
        role.setPermissions(Set.of(deletePerm));
        role = roleRepository.saveAndFlush(role);
        permissionAuthorizationManager.loadCache();

        Company company = savedCompany("Referenced Corp");
        User user = new User();
        user.setName("Staff");
        user.setEmail("staff-fk@example.com");
        user.setPassword("hashed-password");
        user.setAddress("Ha Noi");
        user.setCompany(company);
        user = userRepository.saveAndFlush(user);

        try {
            mockMvc.perform(delete("/api/v1/companies/{id}", company.getId())
                            .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN_FK_TEST"))))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.statusCode").value(409));

            assertThat(companyRepository.existsById(company.getId())).isTrue();
        } finally {
            userRepository.deleteById(user.getId());
            companyRepository.deleteById(company.getId());
            roleRepository.deleteById(role.getId());
            permissionRepository.deleteById(deletePerm.getId());
            permissionAuthorizationManager.loadCache();
        }
    }
}
