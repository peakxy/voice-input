package cn.peakxy.input.websocket;

import cn.peakxy.input.config.AppProperties;
import cn.peakxy.input.domain.TranscriptSessionState;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebSocketHeartbeatSchedulerTest {

    private VoiceInputWebSocketHandler handler;
    private TranscriptSessionRegistry registry;
    private WebSocketHeartbeatScheduler scheduler;
    private AppProperties props;
    private Map<String, WebSocketSession> active;

    @BeforeEach
    void setUp() {
        handler = mock(VoiceInputWebSocketHandler.class);
        registry = new TranscriptSessionRegistry();
        active = new HashMap<>();
        when(handler.activeSessions()).thenReturn(active);

        AppProperties.Heartbeat hb = new AppProperties.Heartbeat(
                Duration.ofSeconds(20), Duration.ofSeconds(10), Duration.ofSeconds(120));
        AppProperties.WebSocket ws = new AppProperties.WebSocket("/ws/transcript", hb);
        props = new AppProperties(null, ws, null, null, Map.of(), null);

        scheduler = new WebSocketHeartbeatScheduler(handler, registry, props, new SimpleMeterRegistry());
    }

    @Test
    void sendsPingWhenIdleBeyondInterval() {
        WebSocketSession session = openSession("s1");
        TranscriptSessionState state = new TranscriptSessionState("s1", 1L, "通用");
        Instant past = Instant.now().minusSeconds(30);
        state.markInbound(past);
        state.markOutbound(past);
        registry.put("s1", state);
        active.put("s1", session);

        scheduler.tick();

        verify(handler).sendHeartbeat(session);
        assertNotNull(state.getPendingPongDeadline());
    }

    @Test
    void doesNotSendPingWhenRecentlyOutbound() {
        WebSocketSession session = openSession("s1");
        TranscriptSessionState state = new TranscriptSessionState("s1", 1L, "通用");
        registry.put("s1", state);
        active.put("s1", session);

        scheduler.tick();

        verify(handler, never()).sendHeartbeat(any());
    }

    @Test
    void closesSessionOnMissedPong() {
        WebSocketSession session = openSession("s1");
        TranscriptSessionState state = new TranscriptSessionState("s1", 1L, "通用");
        state.markInbound(Instant.now().minusSeconds(5));
        state.setPendingPongDeadline(Instant.now().minusSeconds(1));
        registry.put("s1", state);
        active.put("s1", session);

        scheduler.tick();

        verify(handler).forceClose(eq(session), any(CloseStatus.class));
    }

    @Test
    void resetPongStateClearsDeadlineAndCounter() {
        TranscriptSessionState state = new TranscriptSessionState("s1", 1L, "通用");
        state.setPendingPongDeadline(Instant.now().plusSeconds(10));
        state.incrementMissedPong();

        state.resetPongState();

        assertNull(state.getPendingPongDeadline());
        assertEquals(0, state.getMissedPongCount());
    }

    @Test
    void closesIdleSessionEvenWhenPongsAreFresh() {
        WebSocketSession session = openSession("s1");
        TranscriptSessionState state = new TranscriptSessionState("s1", 1L, "通用");
        state.markInbound(Instant.now().minusSeconds(200));
        state.markOutbound(Instant.now().minusSeconds(1));
        registry.put("s1", state);
        active.put("s1", session);

        scheduler.tick();

        verify(handler, times(1)).forceClose(eq(session), any(CloseStatus.class));
    }

    private WebSocketSession openSession(String id) {
        WebSocketSession session = mock(WebSocketSession.class);
        when(session.isOpen()).thenReturn(true);
        when(session.getId()).thenReturn(id);
        return session;
    }
}
