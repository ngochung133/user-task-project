package com.example.hrmanagement.feature.auth;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.hrmanagement.dto.ApiResponse;
import com.example.hrmanagement.exception.InvalidTokenException;
import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.auth.dto.LoginResponseDTO;
import com.example.hrmanagement.feature.auth.dto.RefreshTokenRequestDTO;
import com.example.hrmanagement.feature.auth.dto.RegisterRequest;
import com.example.hrmanagement.feature.auth.dto.RegisterResponse;

import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;


import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.apache.catalina.connector.Response;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import org.slf4j.Logger;


@RestController 
@RequestMapping ("/api/v1/auth")
@RequiredArgsConstructor 
public class AuthController {
    private static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";
    private static final int COOKIE_MAX_AGE = 259200;

    private static final Logger log =
        LoggerFactory.getLogger(AuthController.class);
    private final AuthService authService;


    @GetMapping("/")
    public String homepage() {
        return "Hello Web";
    }
    

    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<?> postLogin (@Valid @RequestBody LoginRequestDTO login,
    HttpServletRequest httpRequest,
    HttpServletResponse httpResponse ) {
        //get device name login
        String deviceInfo = httpRequest.getHeader("User-Agent");
        String ipClient = extractClientIp(httpRequest);
        LoginResponseDTO reponse = this.authService.login(login, deviceInfo, ipClient);
        setRefreshTokenCookie(reponse.refreshToken(), httpResponse);
        return ApiResponse.success("Login successfully", reponse);
    }

    @PostMapping("/register")
        public ResponseEntity<?> postRegister(@Valid @RequestBody RegisterRequest request){
            RegisterResponse response = this.authService.register(request);
            return ApiResponse.created("Register successfully", response);
        }
    
    //2 cach de lay refreshToken 
    // 1.Lay tu cookie(dung extractRefreshToken) 
    // 2.lay tu JsonBody dung RefreshTokenRequestDTO refreshToken
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh (@RequestBody(required = false) RefreshTokenRequestDTO dto,
                                    HttpServletRequest httpRequest,
                                    HttpServletResponse httpServletResponse) {
        String rawRefreshToken = extractRefreshToken(httpRequest,dto);
        if(rawRefreshToken == null){
            throw new InvalidTokenException("Thiếu refresh token");
        }
        LoginResponseDTO response = this.authService.refresh(rawRefreshToken);
        setRefreshTokenCookie(response.refreshToken(), httpServletResponse);
        
        log.info("new RefreshToken {}", response.refreshToken());
        return ApiResponse.success("Refresh token refreshed successfully", response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody RefreshTokenRequestDTO dto,
                                    HttpServletRequest httpRequest,
                                    HttpServletResponse httpResponse
    ) {
        
        String rawRefreshToken = extractRefreshToken(httpRequest, dto);
        if(rawRefreshToken == null){
            throw new InvalidTokenException("Token is not valid");
        }
        clearRefreshTokenCookie(httpResponse);
        
        log.info("Log out successfully");
        return ApiResponse.success("Log out succesfully");
    }
    
    
    public String extractRefreshToken(HttpServletRequest httpRequest, RefreshTokenRequestDTO dto){
        String refreshTokenFromCookie = extractRefreshTokenFromCookie(httpRequest);
        if(refreshTokenFromCookie != null){
            return refreshTokenFromCookie;
        }
        if(dto != null && dto.refreshToken() != null && !dto.refreshToken().isBlank()){
            return dto.refreshToken();
        }
        return null;
    }

    public String extractRefreshTokenFromCookie(HttpServletRequest httpRequest){
        //httpRequest.getCookies() tra ve Array 

        //VD:Cookie: refreshToken=abc123; theme=dark; language=vi
        //Cookie[] cookies = request.getCookies(); =
        //Cookie[] cookies = {
        // new Cookie("refreshToken", "abc123"),
        // new Cookie("theme", "dark"),
        // new Cookie("language", "vi")
        if(httpRequest.getCookies() == null){
            return null;
        }
        return Arrays.stream(httpRequest.getCookies()).filter(cookie -> REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName()))
                            .map(cookie -> cookie.getValue())
                            .findFirst()
                            .orElse(null);
}
        

    //Set RefreshToken vao cookie
    private void setRefreshTokenCookie(String refreshToken , HttpServletResponse httpResponse){
        httpResponse.setHeader("SET-COOKIE", REFRESH_TOKEN_COOKIE_NAME + "=" + refreshToken + 
        "; HttpOnly; Secure; SameSite=Lax; Path=" + COOKIE_PATH + "; Max-Age=" + COOKIE_MAX_AGE);
    }

    //clear refreshToken trong cookie => max age = 0 + các Path để xoá cookie
    private void clearRefreshTokenCookie(HttpServletResponse httpResponse){
        httpResponse.setHeader("SET_COOKIE", REFRESH_TOKEN_COOKIE_NAME + "=; Max-Age=0; Path=" + COOKIE_PATH);
    }

    private String extractClientIp(HttpServletRequest httpRequest){
    //X-Forwarded-For là một HTTP header thường được proxy hoặc load balancer thêm vào để ghi lại địa chỉ IP của client.

        //Khi triển khai Spring Boot lên production,
        //  Client thường không kết nối trực tiếp đến Spring Boot mà thông qua Reverse Proxy (ví dụ Nginx).

        //client -> reverse proxy -> spring boot : IP Client: 203.0.113.10 , IP Nginx: 10.0.0.5
    String ipClient = httpRequest.getHeader("X-Forwarded-For");
    if(ipClient != null && !ipClient.isBlank()){
        return ipClient.split(",")[0].trim();
    }

     //neu header xForwardedFor cua proxy = null => tra ve ipClient truc tiep
    return httpRequest.getRemoteAddr();
    }
}
