package org.example.videochat.room.controller;

import lombok.RequiredArgsConstructor;
import org.example.videochat.room.dto.ParticipantsResponse;
import org.example.videochat.room.dto.RoomResponse;
import org.example.videochat.room.service.RoomService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<RoomResponse> createRoom(
            Authentication authentication
    ) {

        String email = authentication.getName();

        RoomResponse room = roomService.createRoom(email);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(room);
    }

    @GetMapping("/{roomCode}")
    public ResponseEntity<RoomResponse> getRoom(
            @PathVariable String roomCode
    ) {

        RoomResponse room = roomService.getRoomByCode(roomCode);

        return ResponseEntity.ok(room);
    }

    @PostMapping("/{roomCode}/join")
    public ResponseEntity<String> joinRoom(
            @PathVariable String roomCode,
            Authentication authentication
    ) {

        String email = authentication.getName();

        String message = roomService.joinRoom(
                roomCode,
                email
        );

        return ResponseEntity.ok(message);
    }
    @PostMapping("/{roomCode}/leave")
    public ResponseEntity<String> leaveRoom(
            @PathVariable String roomCode,
            Authentication authentication
    ) {

        String username = authentication.getName();

        roomService.leaveRoom(roomCode, username);

        return ResponseEntity.ok("Left room successfully");
    }


    @GetMapping("/{roomCode}/participants")
    public ResponseEntity<ParticipantsResponse> getParticipants(
            @PathVariable String roomCode,
            Authentication authentication
    ) {

        String username = authentication.getName();

        ParticipantsResponse response =
                roomService.getParticipants(
                        roomCode,
                        username
                );

        return ResponseEntity.ok(response);
    }

}