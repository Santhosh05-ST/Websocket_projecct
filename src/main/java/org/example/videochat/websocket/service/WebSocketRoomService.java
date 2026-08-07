package org.example.videochat.websocket.service;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
public class WebSocketRoomService {

    private final Map<String, Set<String>> roomParticipants = new ConcurrentHashMap<>();

    public Set<String> joinRoom(String roomId, String username) {
        Set<String> participants = roomParticipants.computeIfAbsent(
                roomId, id -> new CopyOnWriteArraySet<>());
        participants.add(username);
        return participants;
    }

    public Set<String> leaveRoom(String roomId, String username) {
        Set<String> participants = roomParticipants.get(roomId);
        if (participants == null) {
            return Set.of();
        }
        participants.remove(username);
        if (participants.isEmpty()) {
            roomParticipants.remove(roomId);
        }
        return participants;
    }

    public void removeFromAllRooms(String username) {
        roomParticipants.forEach((roomId, participants) -> participants.remove(username));
        roomParticipants.entrySet().removeIf(entry -> entry.getValue().isEmpty());
    }

    public List<String> getParticipants(String roomId) {
        return List.copyOf(roomParticipants.getOrDefault(roomId, Set.of()));
    }

    public boolean roomExists(String roomId) {
        return roomParticipants.containsKey(roomId);
    }
}