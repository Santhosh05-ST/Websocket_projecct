package org.example.videochat.room.dto;

import java.util.List;

public record ParticipantsResponse(
        String roomCode,
        List<ParticipantResponse> participants
) {
}