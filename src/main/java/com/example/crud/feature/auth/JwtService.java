package com.example.crud.feature.auth;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collector;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
public class JwtService {

    @Value ("${jwt.expiration}")
    private long jwtExpiration;

    private final JwtEncoder jwtEncoder;

    public String generateToken(Authentication authentication){
        Instant now = Instant.now();

        List<String> roles = authentication.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority).toList();
        
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(authentication.getName())
                .issuedAt(now)
                .expiresAt(now.plusMillis(jwtExpiration))
                .claim("roles", roles)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

}
