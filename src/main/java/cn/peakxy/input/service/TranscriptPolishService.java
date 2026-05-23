package cn.peakxy.input.service;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

@Service
public class TranscriptPolishService {

    private final ChatModel chatModel;

    public TranscriptPolishService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    public String polish(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }
        String prompt = """
                请将下面的中文语音识别文本润色为书面表达：
                1. 补全标点。
                2. 去除明显口语填充词。
                3. 保留原意，不扩写。
                4. 只输出润色后的文本。

                文本：
                %s
                """.formatted(rawText);
        return chatModel.call(new Prompt(prompt)).getResult().getOutput().getText();
    }
}
