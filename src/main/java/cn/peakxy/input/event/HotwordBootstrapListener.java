package cn.peakxy.input.event;

import cn.peakxy.input.config.AppProperties;
import cn.peakxy.input.service.HotwordService;
import cn.peakxy.input.service.HotwordSeedService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class HotwordBootstrapListener {

    private static final Logger log = LoggerFactory.getLogger(HotwordBootstrapListener.class);

    private final HotwordService hotwordService;
    private final HotwordSeedService seedService;
    private final AppProperties appProperties;

    public HotwordBootstrapListener(HotwordService hotwordService,
                                    HotwordSeedService seedService,
                                    AppProperties appProperties) {
        this.hotwordService = hotwordService;
        this.seedService = seedService;
        this.appProperties = appProperties;
    }

    @EventListener
    @Async("voiceInputTaskExecutor")
    public void onAuthenticated(UserAuthenticatedEvent event) {
        try {
            if (hotwordService.countByUserId(event.userId()) > 0) {
                return;
            }
            String group = appProperties.hotwordSeed() != null ? appProperties.hotwordSeed().defaultGroup() : "通用";
            int topN = appProperties.hotwordSeed() != null ? appProperties.hotwordSeed().defaultTopN() : 50;
            int inserted = seedService.importTopForUser(event.userId(), group, topN);
            if (inserted > 0) {
                log.info("Bootstrapped {} seed hotwords for user {} into group {}", inserted, event.userId(), group);
            }
        } catch (Exception ex) {
            log.warn("Bootstrap hotword import failed for user {}: {}", event.userId(), ex.getMessage());
        }
    }
}
