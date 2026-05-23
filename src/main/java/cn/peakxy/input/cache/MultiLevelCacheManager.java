package cn.peakxy.input.cache;

import cn.peakxy.input.config.AppProperties;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.Cache;
import org.springframework.cache.support.AbstractCacheManager;
import org.springframework.data.redis.cache.RedisCacheManager;

import java.time.Duration;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class MultiLevelCacheManager extends AbstractCacheManager {

    private final RedisCacheManager redisCacheManager;
    private final Map<String, AppProperties.CacheRegion> regions;

    public MultiLevelCacheManager(RedisCacheManager redisCacheManager,
                                  Map<String, AppProperties.CacheRegion> regions) {
        this.redisCacheManager = redisCacheManager;
        this.regions = regions;
    }

    @Override
    protected Collection<? extends Cache> loadCaches() {
        Set<Cache> caches = new HashSet<>();
        for (Map.Entry<String, AppProperties.CacheRegion> entry : regions.entrySet()) {
            caches.add(buildCache(entry.getKey(), entry.getValue()));
        }
        return caches;
    }

    @Override
    protected Cache getMissingCache(String name) {
        AppProperties.CacheRegion region = regions.get(name);
        if (region == null) {
            return null;
        }
        return buildCache(name, region);
    }

    private Cache buildCache(String name, AppProperties.CacheRegion region) {
        Duration caffeineTtl = region.caffeine() != null ? region.caffeine() : Duration.ofMinutes(1);
        com.github.benmanes.caffeine.cache.Cache<Object, Object> caffeine = Caffeine.newBuilder()
                .expireAfterWrite(caffeineTtl)
                .maximumSize(10_000)
                .build();
        Cache redisCache = redisCacheManager.getCache(name);
        return new MultiLevelCache(name, caffeine, redisCache);
    }
}
