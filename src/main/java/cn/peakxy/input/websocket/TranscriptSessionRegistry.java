package cn.peakxy.input.websocket;

import cn.peakxy.input.domain.TranscriptSessionState;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TranscriptSessionRegistry {

    private final Map<String, TranscriptSessionState> sessions = new ConcurrentHashMap<>();

    public TranscriptSessionState put(String sessionId, TranscriptSessionState state) {
        sessions.put(sessionId, state);
        return state;
    }

    public TranscriptSessionState get(String sessionId) {
        return sessions.get(sessionId);
    }

    public TranscriptSessionState remove(String sessionId) {
        return sessions.remove(sessionId);
    }
}
