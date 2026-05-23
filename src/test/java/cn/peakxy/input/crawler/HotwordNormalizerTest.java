package cn.peakxy.input.crawler;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HotwordNormalizerTest {

    @Test
    void trimsAndDedupes() {
        List<String> out = HotwordNormalizer.normalize(List.of(" 苹果 ", "苹果", " 香蕉"));
        assertEquals(List.of("苹果", "香蕉"), out);
    }

    @Test
    void dropsBlanksLongUrlsAndDigits() {
        List<String> out = HotwordNormalizer.normalize(List.of(
                "",
                "   ",
                "https://example.com/abc",
                "12345",
                "x".repeat(33),
                "正常词"
        ));
        assertEquals(List.of("正常词"), out);
    }

    @Test
    void allowsCjkOfBoundaryLength() {
        String thirtyTwo = "热词".repeat(16);
        assertTrue(HotwordNormalizer.normalize(List.of(thirtyTwo)).contains(thirtyTwo));

        String thirtyThree = thirtyTwo + "X";
        assertFalse(HotwordNormalizer.normalize(List.of(thirtyThree)).contains(thirtyThree));
    }
}
