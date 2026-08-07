package org.example.videochat.auth.service;

import lombok.RequiredArgsConstructor;
import org.example.videochat.auth.dto.LoginRequest;
import org.example.videochat.auth.dto.LoginResponse;
import org.example.videochat.auth.dto.RegisterRequest;
import org.example.videochat.user.entity.User;
import org.example.videochat.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // =========================
    // REGISTER
    // =========================

    public String register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.email())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByUsername(request.username())) {
            throw new RuntimeException("Username already exists");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .build();

        userRepository.save(user);

        return "User registered successfully";
    }

    // =========================
    // LOGIN
    // =========================

    public LoginResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() ->
                        new RuntimeException("Invalid email or password")
                );

        if (!passwordEncoder.matches(
                request.password(),
                user.getPassword()
        )) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getEmail());

        return new LoginResponse(
                token,
                "Login successful"
        );
    }
}