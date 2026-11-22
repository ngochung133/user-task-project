package com.example.hrmanagement.feature.dashboard.dto;

public record DashboardResponse(
        long totalUsers,
        long totalCompanies,
        long totalRoles,
        long totalPermissions) {
}
