package com.example.hrmanagement.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.BearerTokenError;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.security.PermissionAuthorizationManager;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

import tools.jackson.databind.ObjectMapper;


@Configuration 
@EnableWebSecurity 
@EnableMethodSecurity 
public class SecurityConfig {

    @Bean 
    PasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Bean 
    JwtEncoder jwtEncoder(){
        SecretKey secretKey = new SecretKeySpec(jwtSecret.getBytes(),MacAlgorithm.HS256.getName());
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey)); 
    }

    @Bean 
    JwtDecoder jwtDecoder(){
        SecretKey secretKey = new SecretKeySpec(jwtSecret.getBytes(),MacAlgorithm.HS256.getName());
        //dùng secretKey xác minh chữ kí + kiểm tra các validator default như tgian hết hạn, khi nào đc dùng
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build(); 
        //tạo validator, type claim là accessToken thì mới hợp lệ
        JwtClaimValidator<String> accessTypeValidator = new JwtClaimValidator<>("type", "access"::equals);
        // gán các điều kiện ktra cho decoder
        //ew DelegatingOAuth2TokenValidator dùng để kết hợp các điều kiện
        //JwtValidators.createDefault(), validator kiểm tra default tgian hết hạn
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(),
            accessTypeValidator
        ));
        return decoder;
    }
    
    @Bean 
    CorsConfigurationSource corsConfigurationSource(CorsProperties corsProperties){
        CorsConfiguration corsConfiguration = new CorsConfiguration();

        corsConfiguration.setAllowedOrigins(corsProperties.getAllowedOrigins());

        corsConfiguration.setAllowedMethods(
                Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        corsConfiguration.setAllowedHeaders(
            Arrays.asList("Authorization", "Content-Type", "Cache-Control"));

        corsConfiguration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfiguration);
        return source;
    }

    @Bean
    SecurityFilterChain defaultSecurityFilterChain(
            HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource,
            AuthenticationEntryPoint authenticationEntryPoint,
            AccessDeniedHandler accessDeniedHandler,
            PermissionAuthorizationManager permissionAuthorizationManager
    ) throws Exception {
        String[] whitelist = {
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/api/v1/auth/logout",
            "/uploads/**"
        };

        http.cors(cors -> cors.configurationSource(corsConfigurationSource));
        http.csrf(csrf -> csrf.disable());
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers(whitelist).permitAll()
                .requestMatchers("/api/v1/auth/me").authenticated()
                .requestMatchers("/api/v1/dashboard").authenticated()
                .anyRequest().access(permissionAuthorizationManager));
            
        //exceptionHandling().authenticationEntryPoint() cấu hình xử lý 401 ở cơ chế xử lý ngoại lệ bảo mật chung.(không gửi token)

        //oauth2ResourceServer().authenticationEntryPoint() cấu hình xử lý 401 riêng cho xác thực Bearer Token.(gửi token không hợp lệ)

        http.exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(authenticationEntryPoint)
                .accessDeniedHandler(accessDeniedHandler));
        http.oauth2ResourceServer(oauth2 -> oauth2
                .authenticationEntryPoint(authenticationEntryPoint)
                .jwt(Customizer.withDefaults()));
        return http.build();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    // buoc nay thuc hien sau khi JwtDecoder
    // cấu hình lại để đọc claim roles thay vì scope hoặc scp và bỏ tiền tồ SCOPE_ hoặc ROLE vì Đã thêm ROLE ở phần CustomerUserDetail;
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        //Đọc claim quyền từ JWT, chuyển thành danh sách GrantedAuthority.
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        grantedAuthoritiesConverter.setAuthorityPrefix("");

        //Sử dụng grantedAuthoritiesConverter bên trên để tạo đối tượng Authentication:
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return converter;
    }

    @Bean
    AuthenticationEntryPoint authenticationEntryPoint(ObjectMapper mapper) {
        var bearerEntryPoint = new BearerTokenAuthenticationEntryPoint();
        return (request, response, exception) -> {
            // Giữ mã lỗi Bearer và bỏ mô tả nội bộ khỏi WWW-Authenticate.
            if (exception instanceof OAuth2AuthenticationException oauthException
                    && oauthException.getError() instanceof BearerTokenError error) {
                exception = new OAuth2AuthenticationException(new BearerTokenError(
                        error.getErrorCode(), error.getHttpStatus(), null, error.getUri(), error.getScope()));
            }

            bearerEntryPoint.commence(request, response, exception);
            String message = response.getStatus() == HttpStatus.BAD_REQUEST.value()
                    ? "Yêu cầu Bearer không hợp lệ"
                    : "Access token bị thiếu, không hợp lệ hoặc đã hết hạn";
            writeSecurityError(response, mapper, message);
        };
    }

    @Bean
    AccessDeniedHandler accessDeniedHandler(ObjectMapper mapper) {
        var bearerDeniedHandler = new BearerTokenAccessDeniedHandler();
        return (request, response, exception) -> {
            bearerDeniedHandler.handle(request, response, exception);
            writeSecurityError(response, mapper, "Bạn không có quyền truy cập tài nguyên này");
        };
    }

    private static void writeSecurityError(HttpServletResponse response, ObjectMapper mapper, String message)
            throws IOException {
        HttpStatus status = HttpStatus.valueOf(response.getStatus());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());

        ApiResponse<Void> body = ApiResponse.ofError(status.value(), message, status.getReasonPhrase());
        mapper.writeValue(response.getOutputStream(), body);
    }
}
