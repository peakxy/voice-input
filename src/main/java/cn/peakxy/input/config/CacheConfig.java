package cn.peakxy.input.config;

import cn.peakxy.input.cache.MultiLevelCacheManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);
    private static final String KEY_PREFIX = "vi:v1:";

    private final AppProperties appProperties;

    public CacheConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
        GenericJackson2JsonRedisSerializer valueSerializer = new GenericJackson2JsonRedisSerializer(objectMapper.copy());
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .computePrefixWith(name -> KEY_PREFIX + name + ":")
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSerializer))
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues();

        Map<String, RedisCacheConfiguration> perRegion = new HashMap<>();
        for (Map.Entry<String, AppProperties.CacheRegion> entry : regions().entrySet()) {
            Duration redisTtl = entry.getValue().redis() != null ? entry.getValue().redis() : Duration.ofMinutes(10);
            perRegion.put(entry.getKey(), defaultConfig.entryTtl(redisTtl));
        }

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(perRegion)
                .build();
    }

    @Bean
    @Primary
    public CacheManager cacheManager(RedisCacheManager redisCacheManager) {
        return new MultiLevelCacheManager(redisCacheManager, regions());
    }

    private Map<String, AppProperties.CacheRegion> regions() {
        Map<String, AppProperties.CacheRegion> regions = new HashMap<>();
        Map<String, AppProperties.CacheRegion> configured = appProperties.cache();
        if (configured == null) {
            return regions;
        }
        for (Map.Entry<String, AppProperties.CacheRegion> entry : configured.entrySet()) {
            regions.put(toCamelCase(entry.getKey()), entry.getValue());
        }
        return regions;
    }

    private String toCamelCase(String kebab) {
        if (kebab == null || !kebab.contains("-")) {
            return kebab;
        }
        StringBuilder out = new StringBuilder(kebab.length());
        boolean upper = false;
        for (char c : kebab.toCharArray()) {
            if (c == '-') {
                upper = true;
            } else if (upper) {
                out.append(Character.toUpperCase(c));
                upper = false;
            } else {
                out.append(c);
            }
        }
        return out.toString();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void verifyRedisOnStartup(ApplicationReadyEvent event) {
        try {
            RedisConnectionFactory factory = event.getApplicationContext().getBean(RedisConnectionFactory.class);
            String pong = factory.getConnection().ping();
            log.info("Redis connectivity OK ({})", pong);
        } catch (Exception ex) {
            log.warn("Redis ping failed at startup; cache reads will fall through to MyBatis. {}", ex.getMessage());
        }
    }
}
