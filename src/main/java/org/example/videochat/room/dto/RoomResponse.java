package org.example.videochat.room.dto;

import java.time.LocalDateTime;

public record RoomResponse(
        Long id,
        String roomCode,
        String createdBy,
        LocalDateTime createdAt
) {
}