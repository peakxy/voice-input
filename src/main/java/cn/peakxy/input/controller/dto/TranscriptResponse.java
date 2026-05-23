package cn.peakxy.input.controller.dto;

import java.time.LocalDateTime;

public record TranscriptResponse(
        Long id,
        String sessionId,
        String rawText,
        String polishedText,
        Long durationMs,
        LocalDateTime createdAt
) {
}
