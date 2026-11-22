package com.example.hrmanagement.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.security.PermissionAuthorizationManager;

import jakarta.transaction.Transactional;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
@Transactional
class FileControllerIntegrationTest {

    private static final byte[] VALID_PNG = new byte[] {
            (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D
    };

    @TempDir
    static Path tempUploadDir;

    @DynamicPropertySource
    static void overrideUploadDir(DynamicPropertyRegistry registry) {
        registry.add("app.upload.base-dir", () -> tempUploadDir.toAbsolutePath().toString());
    }

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

    @BeforeEach
    void setUpRbac() {
        Permission uploadPerm = new Permission();
        uploadPerm.setName("UPLOAD_FILE");
        uploadPerm.setApiPath("/api/v1/files");
        uploadPerm.setMethod("POST");
        uploadPerm.setModule("FILE");
        uploadPerm = permissionRepository.saveAndFlush(uploadPerm);

        Role hr = new Role();
        hr.setName("HR");
        hr.setDescription("HR role");
        hr.setPermissions(Set.of(uploadPerm));
        roleRepository.saveAndFlush(hr);

        permissionAuthorizationManager.loadCache();
    }

    @Test
    @DisplayName("Upload PNG hợp lệ trả 201, lưu file thật trên đĩa và đọc lại được qua GET /uploads/...")
    void uploadAndReadValidImage() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "logo.png", "image/png", VALID_PNG);

        String body = mockMvc.perform(multipart("/api/v1/files")
                        .file(file)
                        .param("folder", "logos")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_HR"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.data.folder").value("logos"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        String fileName = objectMapper.readTree(body).path("data").path("fileName").asText();
        String fileUrl = objectMapper.readTree(body).path("data").path("fileUrl").asText();

        assertThat(fileUrl).isEqualTo("/uploads/logos/" + fileName);
        assertThat(Files.exists(tempUploadDir.resolve("logos").resolve(fileName))).isTrue();

        mockMvc.perform(get(fileUrl))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Upload trả 400 khi giả ảnh hoặc thiếu part, 401 khi thiếu JWT và 403 khi thiếu quyền")
    void uploadValidationAndSecurity() throws Exception {
        MockMultipartFile fakePng = new MockMultipartFile("file", "fake.png", "image/png", "plain-text".getBytes());

        mockMvc.perform(multipart("/api/v1/files").file(fakePng).param("folder", "logos"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(multipart("/api/v1/files")
                        .file(fakePng)
                        .param("folder", "logos")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_GUEST"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(multipart("/api/v1/files")
                        .file(fakePng)
                        .param("folder", "logos")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_HR"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/api/v1/files")
                        .param("folder", "logos")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_HR"))))
                .andExpect(status().isBadRequest());
    }
}
