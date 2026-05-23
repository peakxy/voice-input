package cn.peakxy.input.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        WebSocket websocket,
        Asr asr,
        Llm llm,
        Map<String, CacheRegion> cache,
        HotwordSeed hotwordSeed
) {
    public record Jwt(String issuer, String secret, long ttlMinutes) {}

    public record WebSocket(String endpoint, Heartbeat heartbeat) {}

    public record Heartbeat(Duration interval, Duration timeout, Duration idleMax) {}

    public record Asr(String provider, String hotwordDefaultGroup, String model, String apiKey, String workspace, String url) {}

    public record Llm(String model, String baseUrl, String apiKey, String completionsPath, String embeddingsPath) {}

    public record CacheRegion(Duration caffeine, Duration redis) {}

    public record HotwordSeed(
            String cron,
            Duration timeout,
            String defaultGroup,
            int defaultTopN,
            String userAgent,
            List<Source> sources
    ) {
        public record Source(String name, boolean enabled, String url, String parser, int rpm) {}
    }
}
