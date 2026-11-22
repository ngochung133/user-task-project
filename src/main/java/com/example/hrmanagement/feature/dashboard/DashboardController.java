package com.example.hrmanagement.feature.dashboard;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.feature.dashboard.dto.DashboardResponse;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard() {
        DashboardResponse response = dashboardService.getDashboard();
        return ApiResponse.success("Lấy thông tin dashboard thành công", response);
    }
}
