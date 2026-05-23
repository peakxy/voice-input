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
public class ZhihuHotSearchParser implements HotwordSeedSourceParser {

    private static final Logger log = LoggerFactory.getLogger(ZhihuHotSearchParser.class);
    private final ObjectMapper objectMapper;

    public ZhihuHotSearchParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public String key() {
        return "zhihu";
    }

    @Override
    public List<String> parse(String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            JsonNode data = root.path("data");
            if (!data.isArray()) {
                return Collections.emptyList();
            }
            List<String> words = new ArrayList<>(data.size());
            for (JsonNode item : data) {
                String word = item.path("target").path("title_area").path("text").asText(null);
                if (word == null || word.isBlank()) {
                    word = item.path("target").path("title").asText(null);
                }
                if (word != null && !word.isBlank()) {
                    words.add(word);
                }
            }
            return words;
        } catch (Exception ex) {
            log.warn("Zhihu parser failed: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }
}
