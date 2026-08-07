package org.example.videochat.room.dto;

public record ParticipantResponse(
        Long userId,
        String username
) {
}