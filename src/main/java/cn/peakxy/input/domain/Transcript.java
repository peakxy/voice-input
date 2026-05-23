package cn.peakxy.input.domain;

import java.time.LocalDateTime;

public class Transcript {

    private Long id;
    private Long userId;
    private String sessionId;
    private String rawText;
    private String polishedText;
    private Long durationMs;
    private LocalDateTime createdAt;

    public Transcript() {
    }

    public Transcript(Long userId, String sessionId, String rawText, String polishedText, Long durationMs) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.rawText = rawText;
        this.polishedText = polishedText;
        this.durationMs = durationMs;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public String getPolishedText() {
        return polishedText;
    }

    public void setPolishedText(String polishedText) {
        this.polishedText = polishedText;
    }

    public Long getDurationMs() {
        return durationMs;
    }

    public void setDurationMs(Long durationMs) {
        this.durationMs = durationMs;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
