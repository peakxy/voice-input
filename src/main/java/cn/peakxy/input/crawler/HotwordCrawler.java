package cn.peakxy.input.crawler;

import cn.peakxy.input.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Component
public class HotwordCrawler {

    private static final Logger log = LoggerFactory.getLogger(HotwordCrawler.class);

    private final AppProperties appProperties;
    private final Map<String, HotwordSeedSourceParser> parsers;
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    private final HttpClient httpClient;

    public HotwordCrawler(AppProperties appProperties, List<HotwordSeedSourceParser> parserBeans) {
        this.appProperties = appProperties;
        Map<String, HotwordSeedSourceParser> map = new HashMap<>();
        for (HotwordSeedSourceParser p : parserBeans) {
            map.put(p.key(), p);
        }
        this.parsers = map;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    /**
     * Fetches and parses one source. Returns empty list on any failure (network, HTTP error,
     * rate-limit, or parser drift) so callers can still process the remaining sources.
     */
    public List<String> fetch(AppProperties.HotwordSeed.Source source) {
        if (!source.enabled()) {
            return List.of();
        }
        HotwordSeedSourceParser parser = parsers.get(source.parser());
        if (parser == null) {
            log.warn("No parser registered for key {}; skipping source {}", source.parser(), source.name());
            return List.of();
        }
        RateLimiter limiter = limiters.computeIfAbsent(source.name(), n -> new RateLimiter(source.rpm()));
        if (!limiter.tryAcquire()) {
            log.info("Rate limit hit for source {} (rpm={}); skipping this run", source.name(), source.rpm());
            return List.of();
        }
        Duration timeout = appProperties.hotwordSeed() != null && appProperties.hotwordSeed().timeout() != null
                ? appProperties.hotwordSeed().timeout()
                : Duration.ofSeconds(10);
        String userAgent = appProperties.hotwordSeed() != null ? appProperties.hotwordSeed().userAgent() : null;
        if (userAgent == null || userAgent.isBlank()) {
            userAgent = "voice-input-backend/1.0";
        }
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(source.url()))
                    .timeout(timeout)
                    .header("User-Agent", userAgent)
                    .header("Accept", "application/json,text/plain,*/*")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("Source {} returned HTTP {}", source.name(), response.statusCode());
                return List.of();
            }
            return parser.parse(response.body());
        } catch (Exception ex) {
            log.warn("Source {} fetch failed: {}", source.name(), ex.getMessage());
            return List.of();
        }
    }

    /** Simple per-minute fixed-window limiter — sufficient for low-volume polling. */
    static final class RateLimiter {
        private final int rpm;
        private final ReentrantLock lock = new ReentrantLock();
        private long windowStart = System.currentTimeMillis();
        private int count = 0;

        RateLimiter(int rpm) {
            this.rpm = Math.max(1, rpm);
        }

        boolean tryAcquire() {
            lock.lock();
            try {
                long now = System.currentTimeMillis();
                if (now - windowStart >= 60_000L) {
                    windowStart = now;
                    count = 0;
                }
                if (count >= rpm) {
                    return false;
                }
                count++;
                return true;
            } finally {
                lock.unlock();
            }
        }
    }
}
