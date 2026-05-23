# WebSocket /ws/transcript Heartbeat Protocol

The server runs an application-level heartbeat to detect half-open connections and reap idle clients. The protocol is JSON over text frames so it travels through the same channel as the existing control messages.

## Server → client

After `interval` (default 20s) of no outbound traffic on a session, the server sends:
```
{"type":"ping","sessionId":"<id>"}
```

If `partial`, `final`, `polished`, or `ready` was sent within the interval, no ping is sent that tick.

## Client → server

Clients MUST reply with:
```
{"type":"pong","sessionId":"<id>"}
```

Clients MAY also send `{"type":"ping"}` to probe the server; the server responds with `{"type":"pong"}` and refreshes the inbound idle timer.

## Timeouts

| Setting | Default | Property |
|---|---|---|
| Ping interval | 20 s | `app.websocket.heartbeat.interval` |
| Pong timeout | 10 s | `app.websocket.heartbeat.timeout` |
| Inbound idle max | 120 s | `app.websocket.heartbeat.idle-max` |

The server closes the session when:
- No pong arrives within `timeout` of the most recent ping (close code `4001`).
- No inbound frame (audio, text, pong) arrives for `idle-max` (close code `4002`).

## Cleanup on close

Heartbeat-driven closes run the same cleanup as a normal `stop`:
- The session is removed from `TranscriptSessionRegistry`.
- The DashScope upstream session is `commit()`-ed and `close()`-d.
- The frontend will see a `WebSocket.onclose` with the codes above.

## Metrics

Exposed via Spring Boot Actuator (`/actuator/metrics`):
- `vi.ws.heartbeat.sent`
- `vi.ws.heartbeat.pong.received`
- `vi.ws.heartbeat.timeout.closed`
- `vi.ws.heartbeat.idle.closed`
