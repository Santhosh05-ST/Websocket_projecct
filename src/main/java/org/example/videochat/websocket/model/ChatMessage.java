package org.example.videochat.websocket.model;

import java.time.Instant;

public class ChatMessage {

    public enum MessageType { CHAT, JOIN, LEAVE }

    private MessageType type;
    private String roomId;
    private String sender;
    private String content;
    private Instant timestamp = Instant.now();

    public ChatMessage() {}

    public ChatMessage(MessageType type, String roomId, String sender, String content) {
        this.type = type;
        this.roomId = roomId;
        this.sender = sender;
        this.content = content;
    }

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }

    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}