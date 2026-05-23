package cn.peakxy.input.cache;

import com.github.benmanes.caffeine.cache.Cache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.support.AbstractValueAdaptingCache;
import org.springframework.cache.support.NullValue;
import org.springframework.dao.DataAccessException;

import java.util.concurrent.Callable;

public class MultiLevelCache extends AbstractValueAdaptingCache {

    private static final Logger log = LoggerFactory.getLogger(MultiLevelCache.class);

    private final String name;
    private final Cache<Object, Object> caffeine;
    private final org.springframework.cache.Cache redis;

    public MultiLevelCache(String name,
                           Cache<Object, Object> caffeine,
                           org.springframework.cache.Cache redis) {
        super(true);
        this.name = name;
        this.caffeine = caffeine;
        this.redis = redis;
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public Object getNativeCache() {
        return this;
    }

    @Override
    protected Object lookup(Object key) {
        Object localValue = caffeine.getIfPresent(key);
        if (localValue != null) {
            return localValue;
        }
        try {
            ValueWrapper wrapper = redis == null ? null : redis.get(key);
            if (wrapper != null) {
                Object value = wrapper.get();
                Object stored = value == null ? NullValue.INSTANCE : value;
                caffeine.put(key, stored);
                return stored;
            }
        } catch (DataAccessException ex) {
            log.warn("Redis lookup failed for cache {}, falling through. {}", name, ex.getMessage());
        }
        return null;
    }

    @Override
    public <T> T get(Object key, Callable<T> valueLoader) {
        Object cached = lookup(key);
        if (cached != null) {
            @SuppressWarnings("unchecked")
            T fromCache = (T) fromStoreValue(cached);
            return fromCache;
        }
        try {
            T loaded = valueLoader.call();
            put(key, loaded);
            return loaded;
        } catch (Exception ex) {
            throw new ValueRetrievalException(key, valueLoader, ex);
        }
    }

    @Override
    public void put(Object key, Object value) {
        Object stored = value == null ? NullValue.INSTANCE : value;
        try {
            if (redis != null) {
                redis.put(key, value);
            }
        } catch (DataAccessException ex) {
            log.warn("Redis put failed for cache {}, key {}. {}", name, key, ex.getMessage());
        }
        caffeine.put(key, stored);
    }

    @Override
    public void evict(Object key) {
        try {
            if (redis != null) {
                redis.evict(key);
            }
        } catch (DataAccessException ex) {
            log.warn("Redis evict failed for cache {}, key {}. {}", name, key, ex.getMessage());
        }
        caffeine.invalidate(key);
    }

    @Override
    public void clear() {
        try {
            if (redis != null) {
                redis.clear();
            }
        } catch (DataAccessException ex) {
            log.warn("Redis clear failed for cache {}. {}", name, ex.getMessage());
        }
        caffeine.invalidateAll();
    }

    /** Test-only accessors. */
    public Cache<Object, Object> nativeCaffeine() {
        return caffeine;
    }

    public org.springframework.cache.Cache nativeRedis() {
        return redis;
    }
}
