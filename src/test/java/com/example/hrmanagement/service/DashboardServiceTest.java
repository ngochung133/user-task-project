package com.example.hrmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.dashboard.DashboardServiceImpl;
import com.example.hrmanagement.feature.dashboard.dto.DashboardResponse;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private CompanyRepository companyRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PermissionRepository permissionRepository;

    @InjectMocks
    private DashboardServiceImpl dashboardService;

    @Test
    @DisplayName("Trả về đầy đủ tổng số users, companies, roles và permissions")
    void getDashboard_shouldReturnAllCounts() {
        when(userRepository.count()).thenReturn(12L);
        when(companyRepository.count()).thenReturn(4L);
        when(roleRepository.count()).thenReturn(3L);
        when(permissionRepository.count()).thenReturn(21L);

        DashboardResponse response = dashboardService.getDashboard();

        assertThat(response.totalUsers()).isEqualTo(12L);
        assertThat(response.totalCompanies()).isEqualTo(4L);
        assertThat(response.totalRoles()).isEqualTo(3L);
        assertThat(response.totalPermissions()).isEqualTo(21L);
    }
}
