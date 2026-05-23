# Voice Input Backend MVP

## Local Runtime

- Java 17 is required.
- MySQL runs on `localhost:13306` with database `voice_input`.
- Redis runs on `localhost:16379` (used as the L2 cache; the app degrades gracefully when Redis is down).
- Start infrastructure with:

```bash
cd docs/dev-ops
docker-compose -f docker-compose-environment.yml up -d mysql redis
```

## Schema

The persistence layer uses MyBatis. Schema is the source of truth; the app does NOT auto-create tables. On a fresh DB, run the SQL files in order:

```bash
mysql -h 127.0.0.1 -P 13306 -uroot -p123456 < docs/dev-ops/mysql/sql/00-create-database.sql
mysql -h 127.0.0.1 -P 13306 -uroot -p123456 voice_input < docs/dev-ops/mysql/sql/01-schema-fix.sql
```

`01-schema-fix.sql` adds:
- `hotword(user_id, group_name)` lookup index
- `hotword(user_id, group_name, word)` UNIQUE (prevents duplicate imports from the seed library)
- `transcript(user_id, created_at)` index for the history endpoint
- the new `hotword_seed` table populated by the scheduled crawler

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

Optional overrides for the cache, heartbeat, and seed crawler live under `app.cache.*`, `app.websocket.heartbeat.*`, and `app.hotword-seed.*` in `application.yml`.

## REST API additions

Beyond auth / hotword / transcript CRUD:

- `GET /api/hotword-seeds?group=通用&limit=50` — top seed words shared across users (curated from public hot-search sources).
- `POST /api/hotwords/import-seeds` — import seeds into the caller's group.
  Body: `{ "groupName": "通用", "top": 50 }`. Response: `{ "inserted": <count> }`. Skips words the user already owns in that group.

On a user's first successful login (or registration), the system asynchronously imports the top default-group seeds into their hotword library. This is best-effort and never blocks login.

## Hotword seed crawler

Configurable under `app.hotword-seed.*`. Defaults pull from three Chinese hot-search JSON endpoints (微博, 百度, 知乎) on startup and once a day at the configured cron. Per-source failures are logged and skipped.

## WebSocket

The demo WebSocket endpoint is:

```text
ws://localhost:8080/ws/transcript?token=<jwt>
```

Client messages:

- `{"type":"start","hotwordGroup":"通用"}`
- binary PCM frames, 16kHz mono 16-bit
- `{"type":"stop"}`
- `{"type":"pong"}` — required heartbeat reply (see `docs/websocket-heartbeat.md`)

Server messages:

- `ready`
- `partial`
- `final`
- `polished`
- `ping` — server-driven heartbeat; reply with `pong` within 10 s or the session is closed
- `error`
- `closed`

Heartbeat / idle timeouts are tunable under `app.websocket.heartbeat.*`. Default: ping every 20 s, pong timeout 10 s, inbound idle max 120 s.

## Cache regions

The cache layer is Caffeine (in-process L1) → Redis (shared L2) → MyBatis (MySQL). Region TTLs live under `app.cache.*`:

| Region | Caffeine | Redis |
|---|---|---|
| `userById` | 5m | 30m |
| `hotwordListByUser` | 1m | 10m |
| `hotwordsByUserGroup` | 1m | 10m |
| `recentTranscriptsByUser` | 30s | 5m |
| `hotwordSeedAll` | 10m | 1h |

Redis keys are prefixed `vi:v1:<region>:` so a cache schema bump can be done by changing the prefix.

## Metrics

Actuator (`/actuator/metrics`) exposes:
- `vi.ws.heartbeat.sent`
- `vi.ws.heartbeat.pong.received`
- `vi.ws.heartbeat.timeout.closed`
- `vi.ws.heartbeat.idle.closed`
