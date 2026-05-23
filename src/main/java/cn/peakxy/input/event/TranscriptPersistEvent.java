package cn.peakxy.input.event;

public record TranscriptPersistEvent(String sessionId, Long userId, String rawText, String polishedText, Long durationMs) {
}
