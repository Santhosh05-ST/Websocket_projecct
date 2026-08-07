package org.example.videochat.user.controller;

import lombok.RequiredArgsConstructor;
import org.example.videochat.user.dto.UserResponse;
import org.example.videochat.user.service.UserService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserResponse getCurrentUser(
            Authentication authentication
    ) {

        String email = authentication.getName();

        return userService.getUserByEmail(email);
    }
}