package com.example.crud.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.crud.helper.ApiResponse;
import com.example.crud.model.dto.request.LoginRequestDTO;
import com.example.crud.model.dto.response.LoginResponseDTO;
import com.example.crud.service.JwtService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;



@RestController 
@RequestMapping ("/auth")
@RequiredArgsConstructor 
public class AuthController {

    private final  AuthenticationManager authenticationManager;
    private final JwtService jwtSerVice;

   @Value("${jwt.expiration}")
    private long jwtExpiration;

    @GetMapping("/")
    public String homepage() {
        return "Hello Web";
    }
    

    @PostMapping("/login")
    public ResponseEntity<?> postLogin (@Valid @RequestBody LoginRequestDTO login) {

    //authenticationManager.authenticate(request) 
    // kiểm tra mật khẩu và trả về một Authentication mới đã được xác thực
    //authencation chứa principal: người dùng là ai, thường là UserDetails hoặc email.

    Authentication authentication = authenticationManager.authenticate(
        //UsernamePasswordAuthenticationToken tại đây là object Java chứa thông tin cần xác thực,
        new UsernamePasswordAuthenticationToken(
            login.getEmail(),
             login.getPassword()));
        String accessToken = jwtSerVice.generateToken(authentication);
           LoginResponseDTO dto = new LoginResponseDTO(accessToken, "Bearer", jwtExpiration);
           return ApiResponse.created(dto);
    }
}
