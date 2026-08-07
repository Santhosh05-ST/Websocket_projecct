package org.example.videochat.websocket.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final String APP_DESTINATION_PREFIX = "/app";
    private static final String[] BROKER_DESTINATION_PREFIXES = {"/topic", "/queue"};
    private static final String USER_DESTINATION_PREFIX = "/user";

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker(BROKER_DESTINATION_PREFIXES);
        config.setApplicationDestinationPrefixes(APP_DESTINATION_PREFIX);
        config.setUserDestinationPrefix(USER_DESTINATION_PREFIX);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Authenticates the STOMP CONNECT frame's JWT and attaches a Principal,
        // so convertAndSendToUser(username, ...) can find the right session
        // (needed for WebRTC signaling in ChatController.relaySignal).
        registration.interceptors(stompAuthChannelInterceptor);
    }
}