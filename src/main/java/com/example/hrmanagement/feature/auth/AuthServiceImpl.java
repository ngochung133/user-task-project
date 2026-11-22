package com.example.hrmanagement.feature.auth;


import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.hrmanagement.exception.InvalidTokenException;
import com.example.hrmanagement.exception.ResourceAlreadyExistException;
import com.example.hrmanagement.exception.ResourceNotFoundException;
import com.example.hrmanagement.feature.auth.dto.LoginRequestDTO;
import com.example.hrmanagement.feature.auth.dto.LoginResponseDTO;
import com.example.hrmanagement.feature.auth.dto.RegisterRequest;
import com.example.hrmanagement.feature.auth.dto.RegisterResponse;
import com.example.hrmanagement.feature.role.Role;
import com.example.hrmanagement.feature.role.RoleRepository;
import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor 
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);
    private static final String DEFAULT_REGISTER_ROLE = "USER";
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtEncoder jwtEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    @Value("${jwt.refresh-expiration}")
    private Long refreshTokenExpiration;

    @Override 
    @Transactional 
    public RegisterResponse register(RegisterRequest request){
        if(userRepository.existsByEmail(request.email())){
            throw new ResourceAlreadyExistException("User", "email", request.email());
        }
        Role defaultRole = this.roleRepository.findByName(DEFAULT_REGISTER_ROLE)
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", DEFAULT_REGISTER_ROLE));
        User user = new User();
        user.setName(request.name());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setGender(request.gender());
        user.setAddress(request.address());
        user.setAge(request.age());
        user.setRoles(new HashSet<>(Set.of(defaultRole)));
        this.userRepository.saveAndFlush(user);
        log.info("Register user {}",user.getEmail());
        return RegisterResponse.fromEntity(user);
    }
    @Override 
    @Transactional 
    public LoginResponseDTO login(LoginRequestDTO request, String deviceInfo, String ipAddress){
    //authenticationManager.authenticate(request) 
    // kiểm tra mật khẩu và trả về một Authentication mới đã được xác thực
    //authencation chứa principal: người dùng là ai, thường là UserDetails hoặc email.

        Authentication authencation = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = this.userRepository.findByEmail(request.getEmail())
        .orElseThrow(() -> new ResourceNotFoundException("User", "email", request.getEmail()));

        List<String> roles = authencation.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
        
        String accessToken = generateAccessToken(request.getEmail(),roles,user.getId());

        String refreshToken = generateRefreshToken(user.getId(),request.getEmail());

        saveRefreshToken(user, deviceInfo,ipAddress,refreshToken);

        log.info("User {} logged in successfully", user.getEmail());

        return LoginResponseDTO.builder().accessToken(accessToken).refreshToken(refreshToken).build();
    }

    @Override 
    @Transactional 
    public LoginResponseDTO refresh(String rawRefreshToken){

        String tokenHash = hashToken(rawRefreshToken);

        RefreshToken refreshTokenINDB = this.refreshTokenRepository.findByToken(tokenHash)
        .orElseThrow(() -> new InvalidTokenException("Refresh Token not valid"));

        if(refreshTokenINDB.isRevoked()){
            throw new InvalidTokenException("Refresh Token is revoked");
        }
        if(refreshTokenINDB.getExpiresAt().isBefore(Instant.now())){
            throw new InvalidTokenException("Refresh Token is expirated");
        }
        
        refreshTokenINDB.setRevoked(true);
        this.refreshTokenRepository.save(refreshTokenINDB);

        User user = refreshTokenINDB.getUser();
        List<String> roles = user.getRoles().stream().map(role -> "ROLE_" + role.getName()).toList();

        String newAccessToken = generateAccessToken(user.getEmail(), roles, user.getId());
        String newRefreshToken = generateRefreshToken(user.getId(), user.getEmail());

        saveRefreshToken(user, refreshTokenINDB.getDeviceInfo(),refreshTokenINDB.getIpAddress(), newRefreshToken);
        return LoginResponseDTO.builder().accessToken(newAccessToken).refreshToken(newRefreshToken).build();
    }

    @Override 
    @Transactional 
    public void logout(String rawRefreshToken){
        String hashToken = hashToken(rawRefreshToken);

        RefreshToken refreshTokenInDB = this.refreshTokenRepository.findByToken(hashToken)
        .orElseThrow(() -> new InvalidTokenException("Refresh token không tồn tại"));

        if(refreshTokenInDB.isRevoked()){
            throw new InvalidTokenException("Refresh Token is revoked");
        }
        if(refreshTokenInDB.getExpiresAt().isBefore(Instant.now())){
            throw new InvalidTokenException("Refresh token is expired");
        }
        refreshTokenInDB.setRevoked(true);
        this.refreshTokenRepository.save(refreshTokenInDB);
    }

    private String generateAccessToken(String email, List<String> roles, Long id){
        Instant now = Instant.now();

        JwtClaimsSet claims  = JwtClaimsSet.builder()
                            .subject(email)
                            .issuedAt(now)
                            .expiresAt(now.plusMillis(accessTokenExpiration))
                            .claim("userId", id)
                            .claim("roles",roles)
                            .claim("type","access")
                            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
    private String generateRefreshToken(Long userId, String email){
        Instant now = Instant.now();

        JwtClaimsSet claims = JwtClaimsSet.builder()
                            .id(java.util.UUID.randomUUID().toString())
                            .subject(email)
                            .issuedAt(now)
                            .expiresAt(now.plusMillis(refreshTokenExpiration))
                            .claim("userId", userId)
                            .claim("type", "refresh")
                            .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    //Save Refresh Token in DB , howerer, hash Refresh Token before save 
    private void saveRefreshToken(User user, String deviceInfo, String ipAddress, String refreshToken){
        String safeDeviceInfo = (deviceInfo == null || deviceInfo.isBlank()) ? "Unknown" : deviceInfo.trim();
        if (safeDeviceInfo.length() > 255) {
            safeDeviceInfo = safeDeviceInfo.substring(0, 255);
        }
        String safeIpAddress = (ipAddress == null || ipAddress.isBlank()) ? "Unknown" : ipAddress.trim();
        if (safeIpAddress.length() > 255) {
            safeIpAddress = safeIpAddress.substring(0, 255);
        }

        RefreshToken refresh = new RefreshToken();
        refresh.setUser(user);
        refresh.setExpiresAt(Instant.now().plusMillis(refreshTokenExpiration));
        refresh.setDeviceInfo(safeDeviceInfo);
        refresh.setIpAddress(safeIpAddress);
        refresh.setRevoked(false);
        refresh.setToken(hashToken(refreshToken));
        this.refreshTokenRepository.save(refresh);
    }


    //Hash RefreshToken de luu vao DB =>> bảo mật
    private String hashToken(String refreshToken){
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(refreshToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 không khả dụng", e);
        }
    }
}
