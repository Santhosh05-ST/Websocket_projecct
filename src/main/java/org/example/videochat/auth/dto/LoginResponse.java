package org.example.videochat.auth.dto;

public record LoginResponse(
        String token,
        String message
) {
}