package org.example.videochat.websocket.model;

import java.util.List;

public class RoomMessage {

    public enum RoomEventType { JOIN, LEAVE, PARTICIPANTS }

    private RoomEventType type;
    private String roomId;
    private String sender;
    private List<String> participants;

    public RoomMessage() {}

    public RoomMessage(RoomEventType type, String roomId, String sender, List<String> participants) {
        this.type = type;
        this.roomId = roomId;
        this.sender = sender;
        this.participants = participants;
    }

    public RoomEventType getType() { return type; }
    public void setType(RoomEventType type) { this.type = type; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public List<String> getParticipants() { return participants; }
    public void setParticipants(List<String> participants) { this.participants = participants; }
}