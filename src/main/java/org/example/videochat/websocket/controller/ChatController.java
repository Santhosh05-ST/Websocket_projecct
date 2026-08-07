package org.example.videochat.websocket.controller;

import org.example.videochat.websocket.model.ChatMessage;
import org.example.videochat.websocket.model.RoomMessage;
import org.example.videochat.websocket.model.SignalMessage;
import org.example.videochat.websocket.service.WebSocketRoomService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketRoomService webSocketRoomService;

    public ChatController(SimpMessagingTemplate messagingTemplate, WebSocketRoomService webSocketRoomService) {
        this.messagingTemplate = messagingTemplate;
        this.webSocketRoomService = webSocketRoomService;
    }

    @MessageMapping("/chat.send/{roomId}")
    public void sendChatMessage(@DestinationVariable String roomId, @Payload ChatMessage message) {
        message.setRoomId(roomId);
        message.setType(ChatMessage.MessageType.CHAT);
        messagingTemplate.convertAndSend("/topic/room." + roomId + ".chat", message);
    }

    @MessageMapping("/room.join/{roomId}")
    public void joinRoom(@DestinationVariable String roomId,
                         @Payload ChatMessage joinMessage,
                         SimpMessageHeaderAccessor headerAccessor) {
        String username = joinMessage.getSender();

        headerAccessor.getSessionAttributes().put("username", username);
        headerAccessor.getSessionAttributes().put("roomId", roomId);

        List<String> participants = List.copyOf(webSocketRoomService.joinRoom(roomId, username));

        joinMessage.setRoomId(roomId);
        joinMessage.setType(ChatMessage.MessageType.JOIN);
        messagingTemplate.convertAndSend("/topic/room." + roomId + ".chat", joinMessage);

        RoomMessage roster = new RoomMessage(RoomMessage.RoomEventType.PARTICIPANTS, roomId, username, participants);
        messagingTemplate.convertAndSend("/topic/room." + roomId + ".roster", roster);
    }

    @MessageMapping("/room.leave/{roomId}")
    public void leaveRoom(@DestinationVariable String roomId, @Payload ChatMessage leaveMessage) {
        String username = leaveMessage.getSender();
        List<String> participants = List.copyOf(webSocketRoomService.leaveRoom(roomId, username));

        leaveMessage.setRoomId(roomId);
        leaveMessage.setType(ChatMessage.MessageType.LEAVE);
        messagingTemplate.convertAndSend("/topic/room." + roomId + ".chat", leaveMessage);

        RoomMessage roster = new RoomMessage(RoomMessage.RoomEventType.PARTICIPANTS, roomId, username, participants);
        messagingTemplate.convertAndSend("/topic/room." + roomId + ".roster", roster);
    }

    @MessageMapping("/signal.send")
    public void relaySignal(@Payload SignalMessage signal) {
        messagingTemplate.convertAndSendToUser(signal.getTarget(), "/queue/signal", signal);
    }
}