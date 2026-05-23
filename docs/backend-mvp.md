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
export SPRING_AI_OPENAI_API_KEY=your_llm_key
export SPRING_AI_OPENAI_BASE_URL=https://api.deepseek.com
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
