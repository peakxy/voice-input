package cn.peakxy.input.client;

import cn.peakxy.input.controller.dto.WebSocketServerMessage;
import cn.peakxy.input.event.ProviderHealthEvent;
import com.alibaba.dashscope.audio.omni.OmniRealtimeCallback;
import com.alibaba.dashscope.audio.omni.OmniRealtimeConfig;
import com.alibaba.dashscope.audio.omni.OmniRealtimeConversation;
import com.alibaba.dashscope.audio.omni.OmniRealtimeParam;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.util.function.Consumer;

@Component
public class DashScopeAsrClient {

    private static final Logger log = LoggerFactory.getLogger(DashScopeAsrClient.class);

    private final ApplicationEventPublisher eventPublisher;

    public DashScopeAsrClient(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public AsrSession openSession(String model,
                                  String apiKey,
                                  String workspace,
                                  String url,
                                  Consumer<WebSocketServerMessage> sink) {
        OmniRealtimeParam.OmniRealtimeParamBuilder<?, ?> builder = OmniRealtimeParam.builder()
                .model(model)
                .apikey(apiKey)
                .url(url);
        if (workspace != null && !workspace.isBlank() && !"default".equalsIgnoreCase(workspace)) {
            builder.workspace(workspace);
        }
        OmniRealtimeParam param = builder.build();

        OmniRealtimeCallback callback = new OmniRealtimeCallback() {
            @Override
            public void onOpen() {
                log.info("DashScope conversation opened");
            }

            @Override
            public void onEvent(JsonObject event) {
                String type = readString(event, "type");
                if ("error".equalsIgnoreCase(type) || type.endsWith(".error")) {
                    log.warn("DashScope event error: {}", event);
                    JsonElement errorElement = event.get("error");
                    String errorMessage = errorElement != null ? errorElement.toString() : event.toString();
                    sink.accept(new WebSocketServerMessage("error", null, null, errorMessage));
                    return;
                }
                if (log.isDebugEnabled()) {
                    log.debug("DashScope event: {}", type);
                }
                if ("conversation.item.input_audio_transcription.text".equals(type)
                        || "conversation.item.input_audio_transcription.delta".equals(type)
                        || "transcription".equals(type)) {
                    String text = readTranscriptText(event);
                    sink.accept(new WebSocketServerMessage("partial", null, text, null));
                } else if ("conversation.item.input_audio_transcription.completed".equals(type)
                        || "final".equals(type)) {
                    String text = readTranscriptText(event);
                    sink.accept(new WebSocketServerMessage("final", null, text, null));
                } else if (textAvailable(event)) {
                    sink.accept(new WebSocketServerMessage("partial", null, readTranscriptText(event), null));
                }
            }

            @Override
            public void onClose(int statusCode, String message) {
                log.warn("DashScope conversation closed: code={} message={}", statusCode, message);
                sink.accept(new WebSocketServerMessage("closed", null, null,
                        "DashScope closed (code=" + statusCode + "): " + message));
            }
        };

        OmniRealtimeConversation conversation = new OmniRealtimeConversation(param, callback);
        return new AsrSession(conversation, sink);
    }

    public final class AsrSession {
        private final OmniRealtimeConversation conversation;
        private final Consumer<WebSocketServerMessage> sink;
        private volatile boolean closed = false;

        private AsrSession(OmniRealtimeConversation conversation, Consumer<WebSocketServerMessage> sink) {
            this.conversation = conversation;
            this.sink = sink;
        }

        public void connect(OmniRealtimeConfig config) {
            try {
                log.info("Connecting DashScope conversation");
                conversation.connect();
                log.info("DashScope connected, sending session config");
                conversation.updateSession(config);
                log.info("DashScope session updated, ready");
                sink.accept(new WebSocketServerMessage("ready", null, null, null));
            } catch (NoApiKeyException | InterruptedException ex) {
                log.error("DashScope connect failed", ex);
                eventPublisher.publishEvent(new ProviderHealthEvent("dashscope", ex.getMessage(), ex));
                throw new IllegalStateException("Failed to connect DashScope session: " + ex.getMessage(), ex);
            } catch (RuntimeException ex) {
                log.error("DashScope connect failed", ex);
                eventPublisher.publishEvent(new ProviderHealthEvent("dashscope", ex.getMessage(), ex));
                throw new IllegalStateException("Failed to connect DashScope session: " + ex.getMessage(), ex);
            }
        }

        public void appendAudio(ByteBuffer frame) {
            if (closed) {
                return;
            }
            byte[] bytes = new byte[frame.remaining()];
            frame.get(bytes);
            try {
                conversation.appendAudio(java.util.Base64.getEncoder().encodeToString(bytes));
            } catch (RuntimeException ex) {
                closed = true;
                sink.accept(new WebSocketServerMessage("error", null, null, ex.getMessage()));
                sink.accept(new WebSocketServerMessage("closed", null, null, ex.getMessage()));
            }
        }

        public void commit() {
            if (closed) {
                return;
            }
            try {
                conversation.commit();
            } catch (RuntimeException ignored) {
                // already closed by server, nothing to commit
            }
        }

        public void close() {
            closed = true;
            try {
                conversation.close();
            } catch (RuntimeException ignored) {
                // already closed
            }
        }
    }

    private boolean textAvailable(JsonObject event) {
        return !readTranscriptText(event).isBlank();
    }

    private String readTranscriptText(JsonObject event) {
        if (event == null) {
            return "";
        }
        JsonElement transcript = event.get("transcript");
        if (transcript != null && transcript.isJsonPrimitive()) {
            return transcript.getAsString();
        }
        JsonElement text = event.get("text");
        JsonElement stash = event.get("stash");
        if (text != null && text.isJsonPrimitive()) {
            return text.getAsString() + (stash != null && stash.isJsonPrimitive() ? stash.getAsString() : "");
        }
        JsonElement output = event.get("output");
        if (output != null && output.isJsonObject()) {
            JsonObject outputObject = output.getAsJsonObject();
            JsonElement nestedTranscript = outputObject.get("transcript");
            if (nestedTranscript != null && nestedTranscript.isJsonObject()) {
                JsonObject transcriptObject = nestedTranscript.getAsJsonObject();
                JsonElement nestedText = transcriptObject.get("text");
                if (nestedText != null && nestedText.isJsonPrimitive()) {
                    return nestedText.getAsString();
                }
            }
            JsonElement outputText = outputObject.get("text");
            if (outputText != null && outputText.isJsonPrimitive()) {
                return outputText.getAsString();
            }
        }
        return "";
    }

    private String readString(JsonObject event, String key) {
        if (event == null || !event.has(key)) {
            return "";
        }
        JsonElement element = event.get(key);
        return element != null && element.isJsonPrimitive() ? element.getAsString() : "";
    }
}
