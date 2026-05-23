package cn.peakxy.input.websocket;

import cn.peakxy.input.client.DashScopeAsrClient;
import cn.peakxy.input.config.AppProperties;
import cn.peakxy.input.controller.dto.WebSocketClientMessage;
import cn.peakxy.input.controller.dto.WebSocketServerMessage;
import cn.peakxy.input.domain.TranscriptSessionState;
import cn.peakxy.input.event.SentenceFinalizedEvent;
import cn.peakxy.input.service.AuthService;
import cn.peakxy.input.service.CommandWordService;
import cn.peakxy.input.service.HotwordService;
import com.alibaba.dashscope.audio.omni.OmniRealtimeConfig;
import com.alibaba.dashscope.audio.omni.OmniRealtimeModality;
import com.alibaba.dashscope.audio.omni.OmniRealtimeTranscriptionParam;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VoiceInputWebSocketHandler extends BinaryWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(VoiceInputWebSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final TranscriptSessionRegistry sessionRegistry;
    private final WebSocketMessageSender messageSender;
    private final DashScopeAsrClient dashScopeAsrClient;
    private final HotwordService hotwordService;
    private final AuthService authService;
    private final CommandWordService commandWordService;
    private final ApplicationEventPublisher eventPublisher;
    private final AppProperties appProperties;
    private final Map<String, DashScopeAsrClient.AsrSession> asrSessions = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>();
    private volatile WebSocketHeartbeatScheduler heartbeatScheduler;

    public VoiceInputWebSocketHandler(ObjectMapper objectMapper,
                                      TranscriptSessionRegistry sessionRegistry,
                                      WebSocketMessageSender messageSender,
                                      DashScopeAsrClient dashScopeAsrClient,
                                      HotwordService hotwordService,
                                      AuthService authService,
                                      CommandWordService commandWordService,
                                      ApplicationEventPublisher eventPublisher,
                                      AppProperties appProperties) {
        this.objectMapper = objectMapper;
        this.sessionRegistry = sessionRegistry;
        this.messageSender = messageSender;
        this.dashScopeAsrClient = dashScopeAsrClient;
        this.hotwordService = hotwordService;
        this.authService = authService;
        this.commandWordService = commandWordService;
        this.eventPublisher = eventPublisher;
        this.appProperties = appProperties;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        messageSender.register(session);
        activeSessions.put(session.getId(), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            WebSocketClientMessage clientMessage = objectMapper.readValue(message.getPayload(), WebSocketClientMessage.class);
            String type = clientMessage.type();
            if ("pong".equals(type)) {
                TranscriptSessionState state = sessionRegistry.get(session.getId());
                if (state != null) {
                    state.markInbound(Instant.now());
                    state.resetPongState();
                }
                if (heartbeatScheduler != null) {
                    heartbeatScheduler.recordPongReceived();
                }
                return;
            }
            if ("ping".equals(type)) {
                TranscriptSessionState state = sessionRegistry.get(session.getId());
                if (state != null) {
                    state.markInbound(Instant.now());
                }
                send(session, new WebSocketServerMessage("pong", session.getId(), null, null));
                return;
            }
            if ("start".equals(type)) {
                Long userId = extractUserId(session);
                authService.requireUserById(userId);
                String hotwordGroup = clientMessage.hotwordGroup() == null || clientMessage.hotwordGroup().isBlank()
                        ? appProperties.asr().hotwordDefaultGroup()
                        : clientMessage.hotwordGroup();
                TranscriptSessionState state = new TranscriptSessionState(session.getId(), userId, hotwordGroup);
                sessionRegistry.put(session.getId(), state);
                DashScopeAsrClient.AsrSession asrSession = dashScopeAsrClient.openSession(
                        appProperties.asr().model(),
                        appProperties.asr().apiKey(),
                        appProperties.asr().workspace(),
                        appProperties.asr().url(),
                        wsMessage -> forward(session, wsMessage)
                );
                asrSessions.put(session.getId(), asrSession);
                List<String> hotwords = hotwordService.words(userId, hotwordGroup);
                OmniRealtimeTranscriptionParam transcriptionParam = new OmniRealtimeTranscriptionParam();
                transcriptionParam.setInputSampleRate(16000);
                transcriptionParam.setInputAudioFormat("pcm");
                transcriptionParam.setLanguage("zh");
                if (hotwords != null && !hotwords.isEmpty()) {
                    transcriptionParam.setCorpusText(String.join("\n", hotwords));
                }
                OmniRealtimeConfig config = OmniRealtimeConfig.builder()
                        .modalities(List.of(OmniRealtimeModality.TEXT))
                        .transcriptionConfig(transcriptionParam)
                        .build();
                asrSession.connect(config);
                state.markInbound(Instant.now());
                send(session, new WebSocketServerMessage("ready", session.getId(), null, null));
            } else if ("stop".equals(type)) {
                TranscriptSessionState state = sessionRegistry.get(session.getId());
                if (state != null) {
                    state.markInbound(Instant.now());
                }
                releaseSession(session.getId());
                send(session, new WebSocketServerMessage("closed", session.getId(), null, null));
            }
        } catch (Exception ex) {
            forward(session, new WebSocketServerMessage("error", session.getId(), null, ex.getMessage()));
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) throws Exception {
        TranscriptSessionState state = sessionRegistry.get(session.getId());
        if (state == null) {
            send(session, new WebSocketServerMessage("error", session.getId(), null, "session not started"));
            return;
        }
        state.markInbound(Instant.now());
        DashScopeAsrClient.AsrSession asrSession = asrSessions.get(session.getId());
        if (asrSession == null) {
            send(session, new WebSocketServerMessage("error", session.getId(), null, "asr session missing"));
            return;
        }
        ByteBuffer buffer = message.getPayload().asReadOnlyBuffer();
        asrSession.appendAudio(buffer);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        cleanup(session.getId());
    }

    /** Iterated by the heartbeat scheduler to enumerate live sessions. */
    public Map<String, WebSocketSession> activeSessions() {
        return activeSessions;
    }

    void bindHeartbeatScheduler(WebSocketHeartbeatScheduler scheduler) {
        this.heartbeatScheduler = scheduler;
    }

    void sendHeartbeat(WebSocketSession session) {
        try {
            send(session, new WebSocketServerMessage("ping", session.getId(), null, null));
        } catch (IOException ex) {
            log.debug("Failed to send heartbeat to {}: {}", session.getId(), ex.getMessage());
        }
    }

    void forceClose(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException ex) {
            log.debug("Failed to close session {} cleanly: {}", session.getId(), ex.getMessage());
        }
        cleanup(session.getId());
    }

    private void cleanup(String sessionId) {
        sessionRegistry.remove(sessionId);
        messageSender.unregister(sessionId);
        activeSessions.remove(sessionId);
        releaseSession(sessionId);
    }

    private void releaseSession(String sessionId) {
        DashScopeAsrClient.AsrSession asrSession = asrSessions.remove(sessionId);
        if (asrSession != null) {
            try {
                asrSession.commit();
            } catch (RuntimeException ex) {
                log.debug("ASR commit on close failed for {}: {}", sessionId, ex.getMessage());
            }
            try {
                asrSession.close();
            } catch (RuntimeException ex) {
                log.debug("ASR close failed for {}: {}", sessionId, ex.getMessage());
            }
        }
    }

    private Long extractUserId(WebSocketSession session) {
        Object userId = session.getAttributes().get("userId");
        if (userId instanceof Long id) {
            return id;
        }
        if (userId instanceof Integer integer) {
            return integer.longValue();
        }
        throw new IllegalStateException("Missing userId in WebSocket session");
    }

    private void send(WebSocketSession session, WebSocketServerMessage message) throws IOException {
        synchronized (session) {
            session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        }
        TranscriptSessionState state = sessionRegistry.get(session.getId());
        if (state != null) {
            state.markOutbound(Instant.now());
        }
    }

    private void forward(WebSocketSession session, WebSocketServerMessage message) {
        try {
            String text = message.text();
            if ("final".equals(message.type())) {
                text = commandWordService.apply(text);
                TranscriptSessionState state = sessionRegistry.get(session.getId());
                if (state != null) {
                    state.setLatestRawText(text);
                    eventPublisher.publishEvent(new SentenceFinalizedEvent(
                            session.getId(),
                            state.getUserId(),
                            text,
                            state.getHotwordGroup()
                    ));
                }
            }
            send(session, new WebSocketServerMessage(message.type(), session.getId(), text, message.message()));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
