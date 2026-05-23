package cn.peakxy.input.cache;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.concurrent.ConcurrentMapCache;

import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class MultiLevelCacheTest {

    private com.github.benmanes.caffeine.cache.Cache<Object, Object> caffeine;
    private Cache redisStub;
    private MultiLevelCache cache;

    @BeforeEach
    void setUp() {
        caffeine = Caffeine.newBuilder().maximumSize(100).build();
        redisStub = new ConcurrentMapCache("test", false);
        cache = new MultiLevelCache("test", caffeine, redisStub);
    }

    @Test
    void putWritesToBothTiers() {
        cache.put("k", "v");

        assertEquals("v", caffeine.getIfPresent("k"));
        assertNotNull(redisStub.get("k"));
        assertEquals("v", redisStub.get("k").get());
    }

    @Test
    void getReturnsFromCaffeineWhenPresent() {
        caffeine.put("k", "v");

        Cache.ValueWrapper wrapper = cache.get("k");

        assertNotNull(wrapper);
        assertEquals("v", wrapper.get());
    }

    @Test
    void getBackfillsCaffeineFromRedis() {
        redisStub.put("k", "v");

        Cache.ValueWrapper wrapper = cache.get("k");

        assertNotNull(wrapper);
        assertEquals("v", wrapper.get());
        assertEquals("v", caffeine.getIfPresent("k"));
    }

    @Test
    void getWithLoaderRunsOnFullMissAndStoresValue() {
        AtomicInteger calls = new AtomicInteger();
        String value = cache.get("k", () -> {
            calls.incrementAndGet();
            return "loaded";
        });

        assertEquals("loaded", value);
        assertEquals(1, calls.get());
        assertEquals("loaded", caffeine.getIfPresent("k"));
        assertEquals("loaded", redisStub.get("k").get());

        cache.get("k", () -> {
            calls.incrementAndGet();
            return "again";
        });
        assertEquals(1, calls.get(), "loader must not run on cache hit");
    }

    @Test
    void evictClearsBothTiers() {
        cache.put("k", "v");

        cache.evict("k");

        assertNull(caffeine.getIfPresent("k"));
        assertNull(redisStub.get("k"));
    }
}
