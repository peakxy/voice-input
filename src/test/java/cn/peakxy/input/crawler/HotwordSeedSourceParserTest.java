package cn.peakxy.input.crawler;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HotwordSeedSourceParserTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
    }

    @Test
    void weiboParsesRealtimeWords() {
        WeiboHotSearchParser parser = new WeiboHotSearchParser(objectMapper);
        String json = """
                { "data": { "realtime": [ {"word":"A"}, {"word":"B"}, {"word":""} ] } }
                """;
        assertEquals(List.of("A", "B"), parser.parse(json));
    }

    @Test
    void weiboReturnsEmptyOnSchemaDrift() {
        WeiboHotSearchParser parser = new WeiboHotSearchParser(objectMapper);
        assertTrue(parser.parse("{ \"foo\": 1 }").isEmpty());
        assertTrue(parser.parse("not json").isEmpty());
    }

    @Test
    void baiduParsesCardsContent() {
        BaiduHotSearchParser parser = new BaiduHotSearchParser(objectMapper);
        String json = """
                { "data": { "cards": [ { "content": [ {"word":"X"}, {"query":"Y"} ] } ] } }
                """;
        assertEquals(List.of("X", "Y"), parser.parse(json));
    }

    @Test
    void baiduReturnsEmptyOnEmptyCards() {
        BaiduHotSearchParser parser = new BaiduHotSearchParser(objectMapper);
        assertTrue(parser.parse("{ \"data\": { \"cards\": [] } }").isEmpty());
    }

    @Test
    void zhihuPrefersTitleAreaText() {
        ZhihuHotSearchParser parser = new ZhihuHotSearchParser(objectMapper);
        String json = """
                {
                  "data": [
                    { "target": { "title_area": { "text": "TopicA" }, "title": "Fallback" } },
                    { "target": { "title": "TopicB" } }
                  ]
                }
                """;
        assertEquals(List.of("TopicA", "TopicB"), parser.parse(json));
    }

    @Test
    void zhihuReturnsEmptyOnDrift() {
        ZhihuHotSearchParser parser = new ZhihuHotSearchParser(objectMapper);
        assertTrue(parser.parse("{}").isEmpty());
    }
}
