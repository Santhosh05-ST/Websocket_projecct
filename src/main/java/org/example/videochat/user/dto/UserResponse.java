package org.example.videochat.user.dto;

public record UserResponse(
        Long id,
        String username,
        String email
) {

    @Override
    public Long id() {
        return id;
    }

    @Override
    public String username() {
        return username;
    }

    @Override
    public String email() {
        return email;
    }



}