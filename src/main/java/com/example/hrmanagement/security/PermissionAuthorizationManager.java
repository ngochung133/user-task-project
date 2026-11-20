package com.example.hrmanagement.security;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import com.example.hrmanagement.feature.permission.Permission;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;

@Component
public class PermissionAuthorizationManager
        implements AuthorizationManager<RequestAuthorizationContext> {

    private final RoleRepository roleRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    // Cache: roleName (ROLE_...) → List<Permission>
    // Load 1 lần, gọi lại loadCache() khi admin thay đổi role/permission
    private volatile Map<String, List<Permission>> rolePermissionsCache = Map.of();

    public PermissionAuthorizationManager(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
        loadCache();
    }

    public void loadCache() {
        // 1 query JOIN FETCH tất cả roles + permissions
        List<Role> roles = roleRepository.findAllWithPermissions();

        Map<String, List<Permission>> cache = new HashMap<>();
        for (Role role : roles) {
            cache.put("ROLE_" + role.getName(), List.copyOf(role.getPermissions()));
        }
        this.rolePermissionsCache = Collections.unmodifiableMap(cache);
    }

    @Override
    public AuthorizationDecision authorize(
            Supplier<? extends Authentication> authSupplier,
            RequestAuthorizationContext context) {

        Authentication authentication = authSupplier.get();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return new AuthorizationDecision(false);
        }
        //GET URL AND METHOD TO COMPARE
        String requestPath = context.getRequest().getRequestURI();
        String httpMethod = context.getRequest().getMethod();

        Map<String, List<Permission>> currentCache = this.rolePermissionsCache;
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            List<Permission> permissions = currentCache
                    .getOrDefault(authority.getAuthority(), Collections.emptyList());

            for (Permission perm : permissions) {
                if (httpMethod != null
                        && httpMethod.equalsIgnoreCase(perm.getMethod())
                        && perm.getApiPath() != null
                        && pathMatcher.match(perm.getApiPath(), requestPath)) {
                    return new AuthorizationDecision(true);
                }
            }
        }

        return new AuthorizationDecision(false);
    }
}
