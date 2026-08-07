package org.example.videochat.websocket.config;

import lombok.RequiredArgsConstructor;
import org.example.videochat.auth.service.JwtService;
import org.example.videochat.user.entity.User;
import org.example.videochat.user.repository.UserRepository;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

/**
 * Reads the "Authorization: Bearer <token>" header sent on the STOMP CONNECT
 * frame (the frontend already sends this via the STOMP client's connectHeaders),
 * validates the JWT, and attaches a Principal to the WebSocket session.
 *
 * Without this, messagingTemplate.convertAndSendToUser(username, ...) has no way
 * to know which session belongs to which user, so private/user-targeted messages
 * (like WebRTC signaling in ChatController.relaySignal) are silently dropped.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);

                try {
                    String email = jwtService.extractEmail(token);

                    User user = userRepository.findByEmail(email)
                            .orElseThrow(() -> new RuntimeException("User not found"));

                    Principal principal = new StompPrincipal(user.getUsername());
                    accessor.setUser(principal);

                } catch (Exception e) {
                    // Invalid/expired token: leave the session unauthenticated rather
                    // than failing the whole handshake. Chat/roster will still work;
                    // only user-targeted messages (signaling) require this Principal.
                }
            }
        }

        return message;
    }

    private record StompPrincipal(String name) implements Principal {
        @Override
        public String getName() {
            return name;
        }
    }
}