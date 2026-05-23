package cn.peakxy.input.crawler;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class WeiboHotSearchParser implements HotwordSeedSourceParser {

    private static final Logger log = LoggerFactory.getLogger(WeiboHotSearchParser.class);
    private final ObjectMapper objectMapper;

    public WeiboHotSearchParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return "weibo";
    }

    @Override
    public List<String> parse(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode realtime = root.path("data").path("realtime");
            if (!realtime.isArray()) {
                return Collections.emptyList();
            }
            List<String> words = new ArrayList<>(realtime.size());
            for (JsonNode item : realtime) {
                String word = item.path("word").asText(null);
                if (word != null && !word.isBlank()) {
                    words.add(word);
                }
            }
            return words;
        } catch (Exception ex) {
            log.warn("Weibo parser failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
