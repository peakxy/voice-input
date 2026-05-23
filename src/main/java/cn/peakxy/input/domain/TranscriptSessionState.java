package cn.peakxy.input.domain;

public class TranscriptSessionState {

    private final String sessionId;
    private final Long userId;
    private final String hotwordGroup;
    private volatile String latestRawText;
    private volatile String latestPolishedText;

    public TranscriptSessionState(String sessionId, Long userId, String hotwordGroup) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.hotwordGroup = hotwordGroup;
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
}
