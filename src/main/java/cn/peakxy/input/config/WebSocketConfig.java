package cn.peakxy.input.config;

import cn.peakxy.input.websocket.VoiceInputWebSocketHandler;
import cn.peakxy.input.websocket.JwtHandshakeInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final VoiceInputWebSocketHandler voiceInputWebSocketHandler;
    private final JwtHandshakeInterceptor jwtHandshakeInterceptor;

    public WebSocketConfig(VoiceInputWebSocketHandler voiceInputWebSocketHandler,
                           JwtHandshakeInterceptor jwtHandshakeInterceptor) {
        this.voiceInputWebSocketHandler = voiceInputWebSocketHandler;
        this.jwtHandshakeInterceptor = jwtHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(voiceInputWebSocketHandler, "/ws/transcript")
                .addInterceptors(jwtHandshakeInterceptor)
                .setAllowedOrigins("*");
    }
}
