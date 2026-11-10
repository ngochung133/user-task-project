package com.example.hrmanagement.feature.user.dto;
import java.util.Set;
import java.util.stream.Collectors;
import com.example.hrmanagement.feature.user.User;
import lombok.Builder;


@Builder
public record UserResponseDTO(
    String name,
    String email,
    Integer age,
    String address,
    User.GenderEnum gender,
    String avatar,
    CompanyInfo companyInfo,
    Set<RoleInfo> roleInfo
) {
    public record CompanyInfo(Long id, String name) {
    }
    public record RoleInfo(Long id, String name) {
    }
    public static UserResponseDTO fromEntity(User user){
        CompanyInfo companyInfo = user.getCompany() != null
        ? new CompanyInfo(user.getCompany().getId(),user.getCompany().getName())
        :null;
        Set<RoleInfo> roleInfos = user.getRoles() == null ? Set.of()
        : user.getRoles().stream()
        .map(role -> new RoleInfo(role.getId(), role.getName()))
        .collect(Collectors.toSet());
        return new UserResponseDTO(user.getName(),
        user.getEmail(),
        user.getAge(),
        user.getAddress(),
        user.getGender(),
        user.getAvatar(),
        companyInfo,
        roleInfos);
    }
} 


