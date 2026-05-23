# Voice Input Backend MVP

## Local Runtime

- Java 17 is required.
- MySQL runs on `localhost:13306` with database `voice_input`.
- Redis runs on `localhost:16379`.
- Start infrastructure with:

```bash
cd docs/dev-ops
docker-compose -f docker-compose-environment.yml up -d mysql redis
```

## Important Configuration

Set real provider credentials before demo:

```bash
export APP_ASR_API_KEY=your_dashscope_key
export APP_ASR_MODEL=qwen3-asr-flash-realtime
export APP_ASR_URL=wss://dashscope.aliyuncs.com/api-ws/v1/realtime
export APP_LLM_MODEL=gpt-5.5
export APP_LLM_BASE_URL=https://api-s.zwenooo.link/
export APP_LLM_COMPLETIONS_PATH=v1/chat/completions
export APP_LLM_EMBEDDINGS_PATH=v1/embeddings
```

The demo WebSocket endpoint is:

```text
ws://localhost:8080/ws/transcript?token=<jwt>
```

Client messages:

- `{"type":"start","hotwordGroup":"通用"}`
- binary PCM frames, 16kHz mono 16-bit
- `{"type":"stop"}`

Server messages:

- `ready`
- `partial`
- `final`
- `polished`
- `error`
- `closed`
