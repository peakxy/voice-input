package cn.peakxy.input.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Asr asr,
        Llm llm
) {
    public record Jwt(String issuer, String secret, long ttlMinutes) {}

    public record Asr(String provider, String hotwordDefaultGroup, String model, String apiKey, String workspace, String url) {}

    public record Llm(String model, String baseUrl, String apiKey, String completionsPath, String embeddingsPath) {}
}
