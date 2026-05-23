package cn.peakxy.input.crawler;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public final class HotwordNormalizer {

    private static final int MAX_LENGTH = 32;
    private static final Pattern URL = Pattern.compile("^https?://.*", Pattern.CASE_INSENSITIVE);
    private static final Pattern DIGITS = Pattern.compile("^\\d+$");

    private HotwordNormalizer() {
    }

    public static List<String> normalize(List<String> raw) {
        Set<String> dedup = new LinkedHashSet<>(raw.size());
        for (String item : raw) {
            if (item == null) {
                continue;
            }
            String trimmed = item.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if (trimmed.length() > MAX_LENGTH) {
                continue;
            }
            if (URL.matcher(trimmed).matches()) {
                continue;
            }
            if (DIGITS.matcher(trimmed).matches()) {
                continue;
            }
            dedup.add(trimmed);
        }
        return List.copyOf(dedup);
    }
}
