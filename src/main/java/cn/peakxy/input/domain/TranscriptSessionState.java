package cn.peakxy.input.domain;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public class TranscriptSessionState {

    private final String sessionId;
    private final Long userId;
    private final String hotwordGroup;
    private volatile String latestRawText;
    private volatile String latestPolishedText;

    private final AtomicReference<Instant> lastInboundAt;
    private final AtomicReference<Instant> lastOutboundAt;
    private final AtomicReference<Instant> pendingPongDeadline = new AtomicReference<>();
    private final AtomicInteger missedPongCount = new AtomicInteger(0);

    public TranscriptSessionState(String sessionId, Long userId, String hotwordGroup) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.hotwordGroup = hotwordGroup;
        Instant now = Instant.now();
        this.lastInboundAt = new AtomicReference<>(now);
        this.lastOutboundAt = new AtomicReference<>(now);
    }

    public String getSessionId() {
        return sessionId;
    }

    public Long getUserId() {
        return userId;
    }

    public String getHotwordGroup() {
        return hotwordGroup;
    }

    public String getLatestRawText() {
        return latestRawText;
    }

    public void setLatestRawText(String latestRawText) {
        this.latestRawText = latestRawText;
    }

    public String getLatestPolishedText() {
        return latestPolishedText;
    }

    public void setLatestPolishedText(String latestPolishedText) {
        this.latestPolishedText = latestPolishedText;
    }

    public Instant getLastInboundAt() {
        return lastInboundAt.get();
    }

    public void markInbound(Instant at) {
        lastInboundAt.set(at);
    }

    public Instant getLastOutboundAt() {
        return lastOutboundAt.get();
    }

    public void markOutbound(Instant at) {
        lastOutboundAt.set(at);
    }

    public Instant getPendingPongDeadline() {
        return pendingPongDeadline.get();
    }

    public void setPendingPongDeadline(Instant deadline) {
        pendingPongDeadline.set(deadline);
    }

    public int incrementMissedPong() {
        return missedPongCount.incrementAndGet();
    }

    public int getMissedPongCount() {
        return missedPongCount.get();
    }

    public void resetPongState() {
        pendingPongDeadline.set(null);
        missedPongCount.set(0);
    }
}
