package cn.peakxy.input.event;

public record SentenceFinalizedEvent(String sessionId, Long userId, String rawText, String hotwordGroup) {
}
