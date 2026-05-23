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
public class BaiduHotSearchParser implements HotwordSeedSourceParser {

    private static final Logger log = LoggerFactory.getLogger(BaiduHotSearchParser.class);
    private final ObjectMapper objectMapper;

    public BaiduHotSearchParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return "baidu";
    }

    @Override
    public List<String> parse(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode cards = root.path("data").path("cards");
            if (!cards.isArray() || cards.isEmpty()) {
                return Collections.emptyList();
            }
            JsonNode content = cards.get(0).path("content");
            if (!content.isArray()) {
                return Collections.emptyList();
            }
            List<String> words = new ArrayList<>(content.size());
            for (JsonNode item : content) {
                String word = item.path("word").asText(null);
                if (word == null || word.isBlank()) {
                    word = item.path("query").asText(null);
                }
                if (word != null && !word.isBlank()) {
                    words.add(word);
                }
            }
            return words;
        } catch (Exception ex) {
            log.warn("Baidu parser failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
