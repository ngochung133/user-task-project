package com.example.hrmanagement.feature.dashboard;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.hrmanagement.feature.company.CompanyRepository;
import com.example.hrmanagement.feature.dashboard.dto.DashboardResponse;
import com.example.hrmanagement.feature.permission.PermissionRepository;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.UserRepository;

@Service
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public DashboardServiceImpl(UserRepository userRepository,
            CompanyRepository companyRepository,
            RoleRepository roleRepository,
            PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long totalCompanies = companyRepository.count();
        long totalRoles = roleRepository.count();
        long totalPermissions = permissionRepository.count();

        return new DashboardResponse(totalUsers, totalCompanies, totalRoles, totalPermissions);
    }
}
