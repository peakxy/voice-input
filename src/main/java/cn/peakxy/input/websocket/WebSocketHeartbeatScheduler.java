package cn.peakxy.input.websocket;

import cn.peakxy.input.config.AppProperties;
import cn.peakxy.input.domain.TranscriptSessionState;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class WebSocketHeartbeatScheduler {

    private static final Logger log = LoggerFactory.getLogger(WebSocketHeartbeatScheduler.class);
    private static final CloseStatus HEARTBEAT_TIMEOUT_CLOSE = new CloseStatus(4001, "heartbeat timeout");
    private static final CloseStatus IDLE_TIMEOUT_CLOSE = new CloseStatus(4002, "idle timeout");

    private final VoiceInputWebSocketHandler handler;
    private final TranscriptSessionRegistry sessionRegistry;
    private final AppProperties appProperties;

    private final Counter sentCounter;
    private final Counter pongReceivedCounter;
    private final Counter timeoutClosedCounter;
    private final Counter idleClosedCounter;

    private final ScheduledExecutorService scheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "ws-heartbeat");
                t.setDaemon(true);
                return t;
            });

    public WebSocketHeartbeatScheduler(VoiceInputWebSocketHandler handler,
                                       TranscriptSessionRegistry sessionRegistry,
                                       AppProperties appProperties,
                                       MeterRegistry meterRegistry) {
        this.handler = handler;
        this.sessionRegistry = sessionRegistry;
        this.appProperties = appProperties;
        this.sentCounter = meterRegistry.counter("vi.ws.heartbeat.sent");
        this.pongReceivedCounter = meterRegistry.counter("vi.ws.heartbeat.pong.received");
        this.timeoutClosedCounter = meterRegistry.counter("vi.ws.heartbeat.timeout.closed");
        this.idleClosedCounter = meterRegistry.counter("vi.ws.heartbeat.idle.closed");
    }

    @PostConstruct
    public void start() {
        handler.bindHeartbeatScheduler(this);
        scheduler.scheduleAtFixedRate(this::tick, 1, 1, TimeUnit.SECONDS);
        log.info("WebSocket heartbeat scheduler started: interval={}, timeout={}, idleMax={}",
                interval(), timeout(), idleMax());
    }

    @PreDestroy
    public void stop() {
        scheduler.shutdownNow();
    }

    /** Pong telemetry hook called by the handler when a client pong arrives. */
    public void recordPongReceived() {
        pongReceivedCounter.increment();
    }

    void tick() {
        try {
            Instant now = Instant.now();
            for (Map.Entry<String, WebSocketSession> entry : handler.activeSessions().entrySet()) {
                WebSocketSession session = entry.getValue();
                if (session == null || !session.isOpen()) {
                    continue;
                }
                TranscriptSessionState state = sessionRegistry.get(entry.getKey());
                if (state == null) {
                    continue;
                }
                if (closeIfIdle(session, state, now)) {
                    continue;
                }
                if (closeIfPongOverdue(session, state, now)) {
                    continue;
                }
                maybeSendPing(session, state, now);
            }
        } catch (Exception ex) {
            log.warn("Heartbeat tick failed: {}", ex.getMessage(), ex);
        }
    }

    private boolean closeIfIdle(WebSocketSession session, TranscriptSessionState state, Instant now) {
        if (Duration.between(state.getLastInboundAt(), now).compareTo(idleMax()) > 0) {
            log.info("Closing idle WebSocket session {} (no inbound for {})", session.getId(), idleMax());
            handler.forceClose(session, IDLE_TIMEOUT_CLOSE);
            idleClosedCounter.increment();
            return true;
        }
        return false;
    }

    private boolean closeIfPongOverdue(WebSocketSession session, TranscriptSessionState state, Instant now) {
        Instant deadline = state.getPendingPongDeadline();
        if (deadline != null && now.isAfter(deadline)) {
            int missed = state.incrementMissedPong();
            log.info("Closing WebSocket session {} after missed pong (count={})", session.getId(), missed);
            handler.forceClose(session, HEARTBEAT_TIMEOUT_CLOSE);
            timeoutClosedCounter.increment();
            return true;
        }
        return false;
    }

    private void maybeSendPing(WebSocketSession session, TranscriptSessionState state, Instant now) {
        if (state.getPendingPongDeadline() != null) {
            return;
        }
        if (Duration.between(state.getLastOutboundAt(), now).compareTo(interval()) >= 0) {
            handler.sendHeartbeat(session);
            state.setPendingPongDeadline(now.plus(timeout()));
            sentCounter.increment();
        }
    }

    private Duration interval() {
        return appProperties.websocket().heartbeat().interval();
    }

    private Duration timeout() {
        return appProperties.websocket().heartbeat().timeout();
    }

    private Duration idleMax() {
        return appProperties.websocket().heartbeat().idleMax();
    }
}
