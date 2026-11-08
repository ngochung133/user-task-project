package com.example.hrmanagement.controller;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
@DisplayName("Swagger documentation and API security")
class OpenApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("OpenAPI is public and describes JWT and public operations")
    void documentsApiWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.securitySchemes['Bearer Authentication'].type").value("http"))
            .andExpect(jsonPath("$.components.securitySchemes['Bearer Authentication'].scheme").value("bearer"))
            .andExpect(jsonPath("$.security[0]['Bearer Authentication']").isArray())
            .andExpect(jsonPath("$.paths['/auth/login'].post.security").isEmpty())
            .andExpect(jsonPath("$.paths['/users'].post.security").isEmpty())
            .andExpect(jsonPath("$.paths['/api/v1/companies'].get").exists());
    }

    @Test
    @DisplayName("Swagger UI and its configuration are public")
    void opensSwaggerWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/v3/api-docs/swagger-config"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Business APIs still require authentication")
    void rejectsAnonymousApiRequest() throws Exception {
        mockMvc.perform(get("/api/v1/companies"))
            .andExpect(status().isUnauthorized());
    }
}
