package cn.peakxy.input.service;

import cn.peakxy.input.controller.dto.TranscriptResponse;
import cn.peakxy.input.domain.Transcript;
import cn.peakxy.input.mapper.TranscriptMapper;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Service
public class TranscriptService {

    private static final int RECENT_LIMIT = 50;
    private static final String RECENT_CACHE = "recentTranscriptsByUser";

    private final TranscriptMapper transcriptMapper;
    private final CacheManager cacheManager;

    public TranscriptService(TranscriptMapper transcriptMapper, CacheManager cacheManager) {
        this.transcriptMapper = transcriptMapper;
        this.cacheManager = cacheManager;
    }

    @Cacheable(cacheNames = RECENT_CACHE, key = "#userId")
    @Transactional(readOnly = true)
    public List<TranscriptResponse> list(Long userId) {
        return transcriptMapper.findRecentByUserId(userId, RECENT_LIMIT)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TranscriptResponse save(Long userId, String sessionId, String rawText, String polishedText, Long durationMs) {
        Transcript transcript = new Transcript(userId, sessionId, rawText, polishedText, durationMs);
        transcriptMapper.insert(transcript);
        evictRecentAfterCommit(userId);
        return toResponse(transcript);
    }

    private void evictRecentAfterCommit(Long userId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    evictRecent(userId);
                }
            });
        } else {
            evictRecent(userId);
        }
    }

    private void evictRecent(Long userId) {
        Cache cache = cacheManager.getCache(RECENT_CACHE);
        if (cache != null) {
            cache.evict(userId);
        }
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
