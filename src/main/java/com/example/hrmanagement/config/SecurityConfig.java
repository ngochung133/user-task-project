package com.example.hrmanagement.config;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;

import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Configuration 
@EnableWebSecurity 
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
        return NimbusJwtDecoder.withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build(); 
    }

    @Bean
		SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {

            //formater:off
                
                String [] WHILELIST = {
                 "/auth/login",
                 "/swagger-ui.html",
                 "/swagger-ui/**",
                 "/v3/api-docs",
                 "/v3/api-docs/**"
                };

			
            http.csrf(csrf -> csrf.disable());
            http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
            http.authorizeHttpRequests(auth -> auth.requestMatchers(WHILELIST).permitAll()
                                                .requestMatchers(HttpMethod.POST,"/users").permitAll()
                                                .anyRequest().authenticated());    
            http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> {}));
			return http.build();
		}

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

}
