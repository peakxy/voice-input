package cn.peakxy.input.service;

import cn.peakxy.input.controller.dto.TranscriptResponse;
import cn.peakxy.input.domain.Transcript;
import cn.peakxy.input.repository.TranscriptRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TranscriptService {

    private final TranscriptRepository transcriptRepository;

    public TranscriptService(TranscriptRepository transcriptRepository) {
        this.transcriptRepository = transcriptRepository;
    }

    @Transactional(readOnly = true)
    public List<TranscriptResponse> list(Long userId) {
        return transcriptRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TranscriptResponse save(Long userId, String sessionId, String rawText, String polishedText, Long durationMs) {
        Transcript transcript = transcriptRepository.save(new Transcript(userId, sessionId, rawText, polishedText, durationMs));
        return toResponse(transcript);
    }

    private TranscriptResponse toResponse(Transcript transcript) {
        return new TranscriptResponse(
                transcript.getId(),
                transcript.getSessionId(),
                transcript.getRawText(),
                transcript.getPolishedText(),
                transcript.getDurationMs(),
                transcript.getCreatedAt()
        );
    }
}
