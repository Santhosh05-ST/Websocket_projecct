package org.example.videochat.auth.security;


import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.videochat.auth.service.JwtService;
import org.example.videochat.user.entity.User;
import org.example.videochat.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class OAuth2AuthenticationSuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public OAuth2AuthenticationSuccessHandler(
            JwtService jwtService,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oAuth2User =
                (OAuth2User) authentication.getPrincipal();

        String email =
                oAuth2User.getAttribute("email");

        String name =
                oAuth2User.getAttribute("name");

        User user =
                userRepository.findByEmail(email)
                        .orElseGet(() -> {

                            User newUser = new User();

                            newUser.setEmail(email);
                            newUser.setUsername(name);
                            newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                            return userRepository.save(newUser);
                        });

        String token =
                jwtService.generateToken(user.getEmail());

        // IMPORTANT: only one "="
        String redirectUrl =
                "https://websocket-projecct-2.onrender.com?token="
                        + token;

        getRedirectStrategy()
                .sendRedirect(
                        request,
                        response,
                        redirectUrl
                );
    }
}