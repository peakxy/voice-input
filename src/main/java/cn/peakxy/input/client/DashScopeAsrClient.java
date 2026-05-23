package cn.peakxy.input.client;

import cn.peakxy.input.controller.dto.WebSocketServerMessage;
import cn.peakxy.input.event.ProviderHealthEvent;
import com.alibaba.dashscope.audio.omni.OmniRealtimeCallback;
import com.alibaba.dashscope.audio.omni.OmniRealtimeConfig;
import com.alibaba.dashscope.audio.omni.OmniRealtimeConversation;
import com.alibaba.dashscope.audio.omni.OmniRealtimeModality;
import com.alibaba.dashscope.audio.omni.OmniRealtimeParam;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.util.List;
import java.util.function.Consumer;

@Component
public class DashScopeAsrClient {

    private final ApplicationEventPublisher eventPublisher;

    public DashScopeAsrClient(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public AsrSession openSession(String model,
                                  String apiKey,
                                  String workspace,
                                  Consumer<WebSocketServerMessage> sink) {
        OmniRealtimeParam param = OmniRealtimeParam.builder()
                .model(model)
                .apikey(apiKey)
                .workspace(workspace)
                .build();

        OmniRealtimeCallback callback = new OmniRealtimeCallback() {
            @Override
            public void onOpen() {
                sink.accept(new WebSocketServerMessage("ready", null, null, null));
            }

            @Override
            public void onEvent(JsonObject event) {
                String type = readString(event, "type");
                if ("transcription".equals(type) || "conversation.item.input_audio_transcription.delta".equals(type)) {
                    String text = readNestedText(event);
                    sink.accept(new WebSocketServerMessage("partial", null, text, null));
                } else if ("conversation.item.input_audio_transcription.completed".equals(type) || "final".equals(type)) {
                    String text = readNestedText(event);
                    sink.accept(new WebSocketServerMessage("final", null, text, null));
                } else if (textAvailable(event)) {
                    sink.accept(new WebSocketServerMessage("partial", null, readNestedText(event), null));
                }
            }

            @Override
            public void onClose(int statusCode, String message) {
                sink.accept(new WebSocketServerMessage("closed", null, null, message));
            }
        };

        OmniRealtimeConversation conversation = new OmniRealtimeConversation(param, callback);
        return new AsrSession(conversation, sink);
    }

    public final class AsrSession {
        private final OmniRealtimeConversation conversation;
        private final Consumer<WebSocketServerMessage> sink;

        private AsrSession(OmniRealtimeConversation conversation, Consumer<WebSocketServerMessage> sink) {
            this.conversation = conversation;
            this.sink = sink;
        }

        public void connect(OmniRealtimeConfig config) {
            try {
                conversation.connect();
                conversation.updateSession(config);
            } catch (NoApiKeyException | InterruptedException ex) {
                eventPublisher.publishEvent(new ProviderHealthEvent("dashscope", ex.getMessage(), ex));
                throw new IllegalStateException("Failed to connect DashScope session", ex);
            }
        }

        public void appendAudio(ByteBuffer frame) {
            byte[] bytes = new byte[frame.remaining()];
            frame.get(bytes);
            conversation.appendAudio(java.util.Base64.getEncoder().encodeToString(bytes));
        }

        public void commit() {
            conversation.commit();
        }

        public void close() {
            conversation.close();
        }
    }

    private boolean textAvailable(JsonObject event) {
        return !readNestedText(event).isBlank();
    }

    private String readNestedText(JsonObject event) {
        if (event == null) {
            return "";
        }
        JsonElement output = event.get("output");
        if (output != null && output.isJsonObject()) {
            JsonObject outputObject = output.getAsJsonObject();
            JsonElement transcript = outputObject.get("transcript");
            if (transcript != null && transcript.isJsonObject()) {
                JsonObject transcriptObject = transcript.getAsJsonObject();
                JsonElement text = transcriptObject.get("text");
                if (text != null && text.isJsonPrimitive()) {
                    return text.getAsString();
                }
            }
            JsonElement text = outputObject.get("text");
            if (text != null && text.isJsonPrimitive()) {
                return text.getAsString();
            }
        }
        JsonElement text = event.get("text");
        return text != null && text.isJsonPrimitive() ? text.getAsString() : "";
    }

    private String readString(JsonObject event, String key) {
        if (event == null || !event.has(key)) {
            return "";
        }
        JsonElement element = event.get(key);
        return element != null && element.isJsonPrimitive() ? element.getAsString() : "";
    }
}
