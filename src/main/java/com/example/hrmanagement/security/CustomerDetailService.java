package com.example.hrmanagement.security;

import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.hrmanagement.feature.user.User;
import com.example.hrmanagement.feature.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomerDetailService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy user: " + email));

        List<GrantedAuthority> authorities = user.getRoles() == null ? List.of()
                : user.getRoles().stream()
                        .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role.getName()))
                        .toList();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                //.roles tu dong them ROLE_ khong phu hop danh cho permision => doi sang .authorities
                .authorities(authorities)
                .build();
    }
}
