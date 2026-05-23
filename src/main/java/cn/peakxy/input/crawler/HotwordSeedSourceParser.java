package cn.peakxy.input.crawler;

import java.util.List;

public interface HotwordSeedSourceParser {

    /** Returns the parser key referenced from {@code app.hotword-seed.sources[].parser}. */
    String key();

    /**
     * Parses the JSON payload returned by the source endpoint into a list of words.
     * Implementations MUST return an empty list rather than throw on schema drift or missing fields.
     */
    List<String> parse(String payload);
}
