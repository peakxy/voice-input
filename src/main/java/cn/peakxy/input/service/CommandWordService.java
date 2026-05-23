package cn.peakxy.input.service;

import org.springframework.stereotype.Service;

@Service
public class CommandWordService {

    public String apply(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        return text
                .replace("新段落", "\n\n")
                .replace("换行", "\n")
                .replace("句号", "。")
                .replace("问号", "？")
                .replace("删除上一句", "[[DELETE_LAST_SENTENCE]]");
    }
}
