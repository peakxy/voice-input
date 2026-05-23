package cn.peakxy.input.config;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class LlmConfig {

    @Bean
    @Primary
    public ChatModel chatModel(AppProperties properties) {
        AppProperties.Llm llm = properties.llm();
        OpenAiApi openAiApi = OpenAiApi.builder()
                .baseUrl(llm.baseUrl())
                .apiKey(llm.apiKey())
                .completionsPath(llm.completionsPath())
                .embeddingsPath(llm.embeddingsPath())
                .build();
        return OpenAiChatModel.builder()
                .openAiApi(openAiApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(llm.model())
                        .build())
                .build();
    }
}
