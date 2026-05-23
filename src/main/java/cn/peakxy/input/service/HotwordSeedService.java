package cn.peakxy.input.service;

import cn.peakxy.input.config.AppProperties;
import cn.peakxy.input.crawler.HotwordCrawler;
import cn.peakxy.input.crawler.HotwordNormalizer;
import cn.peakxy.input.domain.Hotword;
import cn.peakxy.input.domain.HotwordSeed;
import cn.peakxy.input.mapper.HotwordMapper;
import cn.peakxy.input.mapper.HotwordSeedMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class HotwordSeedService {

    private static final Logger log = LoggerFactory.getLogger(HotwordSeedService.class);

    private final HotwordSeedMapper seedMapper;
    private final HotwordMapper hotwordMapper;
    private final HotwordCrawler crawler;
    private final AppProperties appProperties;
    private final CacheManager cacheManager;

    public HotwordSeedService(HotwordSeedMapper seedMapper,
                              HotwordMapper hotwordMapper,
                              HotwordCrawler crawler,
                              AppProperties appProperties,
                              CacheManager cacheManager) {
        this.seedMapper = seedMapper;
        this.hotwordMapper = hotwordMapper;
        this.crawler = crawler;
        this.appProperties = appProperties;
        this.cacheManager = cacheManager;
    }

    @Scheduled(cron = "${app.hotword-seed.cron:0 17 4 * * *}")
    public void scheduledCrawl() {
        crawlAll();
    }

    @EventListener(ApplicationReadyEvent.class)
    @Async("voiceInputTaskExecutor")
    public void onStartup(ApplicationReadyEvent event) {
        try {
            crawlAll();
        } catch (Exception ex) {
            log.warn("Startup hotword crawl failed: {}", ex.getMessage());
        }
    }

    public int crawlAll() {
        if (appProperties.hotwordSeed() == null || appProperties.hotwordSeed().sources() == null) {
            return 0;
        }
        AtomicInteger total = new AtomicInteger();
        String defaultGroup = appProperties.hotwordSeed().defaultGroup();
        appProperties.hotwordSeed().sources().parallelStream().forEach(source -> {
            try {
                List<String> raw = crawler.fetch(source);
                List<String> normalized = HotwordNormalizer.normalize(raw);
                int score = normalized.size();
                for (String word : normalized) {
                    HotwordSeed seed = new HotwordSeed(word, defaultGroup, source.name(), score);
                    seedMapper.upsert(seed);
                    score = Math.max(0, score - 1);
                    total.incrementAndGet();
                }
                log.info("Hotword crawl source={} ingested={}", source.name(), normalized.size());
            } catch (Exception ex) {
                log.warn("Hotword crawl source={} failed: {}", source.name(), ex.getMessage());
            }
        });
        Cache cache = cacheManager.getCache("hotwordSeedAll");
        if (cache != null) {
            cache.clear();
        }
        return total.get();
    }

    @Cacheable(cacheNames = "hotwordSeedAll", key = "#groupName + ':' + #limit")
    @Transactional(readOnly = true)
    public List<HotwordSeed> findTopByGroup(String groupName, int limit) {
        return seedMapper.findTopByGroup(groupName, limit);
    }

    @Transactional
    public int importTopForUser(Long userId, String groupName, int topN) {
        List<HotwordSeed> seeds = seedMapper.findTopByGroup(groupName, topN);
        if (seeds.isEmpty()) {
            return 0;
        }
        int inserted = 0;
        List<String> wordsToInsert = new ArrayList<>(seeds.size());
        for (HotwordSeed seed : seeds) {
            wordsToInsert.add(seed.getWord());
        }
        for (String word : wordsToInsert) {
            if (hotwordMapper.existsByUserIdAndGroupNameAndWord(userId, groupName, word)) {
                continue;
            }
            Hotword hotword = new Hotword(userId, groupName, word);
            hotwordMapper.insert(hotword);
            inserted++;
        }
        evictUserHotwordCaches(userId);
        return inserted;
    }

    private void evictUserHotwordCaches(Long userId) {
        Cache list = cacheManager.getCache("hotwordListByUser");
        if (list != null) {
            list.evict(userId);
        }
        Cache groups = cacheManager.getCache("hotwordsByUserGroup");
        if (groups != null) {
            groups.clear();
        }
    }
}
