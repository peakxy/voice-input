package cn.peakxy.input.event;

import cn.peakxy.input.controller.dto.WebSocketServerMessage;
import cn.peakxy.input.domain.TranscriptSessionState;
import cn.peakxy.input.service.TranscriptPolishService;
import cn.peakxy.input.service.TranscriptService;
import cn.peakxy.input.websocket.TranscriptSessionRegistry;
import cn.peakxy.input.websocket.WebSocketMessageSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class TranscriptEventListener {

    private static final Logger log = LoggerFactory.getLogger(TranscriptEventListener.class);

    private final TranscriptPolishService polishService;
    private final TranscriptService transcriptService;
    private final TranscriptSessionRegistry sessionRegistry;
    private final WebSocketMessageSender messageSender;
    private final ApplicationEventPublisher eventPublisher;

    public TranscriptEventListener(TranscriptPolishService polishService,
                                   TranscriptService transcriptService,
                                   TranscriptSessionRegistry sessionRegistry,
                                   WebSocketMessageSender messageSender,
                                   ApplicationEventPublisher eventPublisher) {
        this.polishService = polishService;
        this.transcriptService = transcriptService;
        this.sessionRegistry = sessionRegistry;
        this.messageSender = messageSender;
        this.eventPublisher = eventPublisher;
    }

    @Async("voiceInputTaskExecutor")
    @EventListener
    public void onSentenceFinalized(SentenceFinalizedEvent event) {
        String polished = polishService.polish(event.rawText());
        TranscriptSessionState state = sessionRegistry.get(event.sessionId());
        if (state != null) {
            state.setLatestPolishedText(polished);
        }
        messageSender.send(event.sessionId(), new WebSocketServerMessage("polished", event.sessionId(), polished, null));
        eventPublisher.publishEvent(new TranscriptPersistEvent(event.sessionId(), event.userId(), event.rawText(), polished, null));
    }

    @Async("voiceInputTaskExecutor")
    @EventListener
    public void onTranscriptPersist(TranscriptPersistEvent event) {
        transcriptService.save(event.userId(), event.sessionId(), event.rawText(), event.polishedText(), event.durationMs());
    }

    @Async("voiceInputTaskExecutor")
    @EventListener
    public void onProviderHealth(ProviderHealthEvent event) {
        log.warn("Provider health event: provider={}, message={}", event.providerName(), event.message(), event.cause());
    }
}
