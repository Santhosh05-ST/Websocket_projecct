package org.example.videochat.room.service;

import lombok.RequiredArgsConstructor;
import org.example.videochat.room.dto.ParticipantResponse;
import org.example.videochat.room.dto.ParticipantsResponse;
import org.example.videochat.room.dto.RoomResponse;
import org.example.videochat.room.entity.Room;
import org.example.videochat.room.entity.RoomParticipant;
import org.example.videochat.room.repository.RoomParticipantRepository;
import org.example.videochat.room.repository.RoomRepository;
import org.example.videochat.user.entity.User;
import org.example.videochat.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomParticipantRepository participantRepository;
    private final RoomParticipantRepository roomParticipantRepository;

    public RoomResponse createRoom(String email) {

        String roomCode = generateRoomCode();

        Room room = Room.builder()
                .roomCode(roomCode)
                .createdBy(email)
                .createdAt(LocalDateTime.now())
                .build();

        Room savedRoom = roomRepository.save(room);

        return new RoomResponse(
                savedRoom.getId(),
                savedRoom.getRoomCode(),
                savedRoom.getCreatedBy(),
                savedRoom.getCreatedAt()
        );
    }

    public RoomResponse getRoomByCode(String roomCode) {

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() ->
                        new RuntimeException("Room not found")
                );

        return new RoomResponse(
                room.getId(),
                room.getRoomCode(),
                room.getCreatedBy(),
                room.getCreatedAt()
        );
    }

    public String joinRoom(String roomCode, String email) {

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() ->
                        new RuntimeException("Room not found")
                );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        if (roomParticipantRepository.existsByRoomAndUser(room, user)) {
            throw new RuntimeException("User already joined this room");
        }

        RoomParticipant participant = RoomParticipant.builder()
                .room(room)
                .user(user)
                .joinedAt(LocalDateTime.now())
                .build();

        roomParticipantRepository.save(participant);

        return "Joined room successfully";
    }

    private String generateRoomCode() {

        return UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase();
    }
    public void leaveRoom(String roomCode, String username) {

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() ->
                        new RuntimeException("Room not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        RoomParticipant participant =
                participantRepository.findByRoomAndUser(room, user)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "User is not a participant of this room"
                                ));

        participantRepository.delete(participant);
    }
    public ParticipantsResponse getParticipants(
            String roomCode,
            String username
    ) {

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() ->
                        new RuntimeException("Room not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Optional: only room members can see participants
        if (!participantRepository.existsByRoomAndUser(room, user)) {
            throw new RuntimeException(
                    "User is not a participant of this room"
            );
        }

        List<RoomParticipant> participants =
                participantRepository.findByRoom(room);

        List<ParticipantResponse> response =
                participants.stream()
                        .map(participant -> new ParticipantResponse(
                                participant.getUser().getId(),
                                participant.getUser().getUsername()
                        ))
                        .toList();

        return new ParticipantsResponse(
                room.getRoomCode(),
                response
        );
    }

}