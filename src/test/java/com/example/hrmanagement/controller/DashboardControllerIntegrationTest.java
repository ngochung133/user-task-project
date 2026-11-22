package com.example.hrmanagement.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.example.hrmanagement.config.MySqlTestConfiguration;
import com.example.hrmanagement.feature.company.Company;
import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;

import jakarta.transaction.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(MySqlTestConfiguration.class)
@Transactional
class DashboardControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;

    @Test
    @DisplayName("GET /api/v1/dashboard yêu cầu xác thực (401 khi thiếu JWT)")
    void dashboardRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/v1/dashboard"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/dashboard trả về số liệu thống kê thực tế khi đã đăng nhập")
    void dashboardReturnsRealCountsWhenAuthenticated() throws Exception {
        Company company = new Company();
        company.setName("Dashboard Corp");
        company.setDescription("Desc");
        company.setAddress("Ha Noi");
        company.setLogo("logo.png");
        companyRepository.saveAndFlush(company);

        User user = new User();
        user.setName("Dash User");
        user.setEmail("dash@example.com");
        user.setPassword("hashed");
        user.setAddress("Ha Noi");
        userRepository.saveAndFlush(user);

        mockMvc.perform(get("/api/v1/dashboard").with(jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.totalUsers").value(userRepository.count()))
                .andExpect(jsonPath("$.data.totalCompanies").value(companyRepository.count()));
    }
}
