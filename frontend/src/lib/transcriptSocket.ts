import { buildWsUrl } from "@/lib/api";
import type { WsClientMessage, WsServerMessage } from "@/lib/types";

export type TranscriptSocketEvents = {
  ready: (message: WsServerMessage) => void;
  partial: (message: WsServerMessage) => void;
  final: (message: WsServerMessage) => void;
  polished: (message: WsServerMessage) => void;
  error: (message: WsServerMessage) => void;
  closed: (message: WsServerMessage) => void;
  socketError: (event: Event) => void;
  socketClose: (event: CloseEvent, hadReady: boolean) => void;
};

type Listener<K extends keyof TranscriptSocketEvents> = TranscriptSocketEvents[K];
type AnyListener = (...args: unknown[]) => void;

export class TranscriptSocket {
  private socket: WebSocket | null = null;
  private listeners: Map<keyof TranscriptSocketEvents, Set<AnyListener>> = new Map();
  private readyResolvers: Array<(value: WsServerMessage) => void> = [];
  private readyRejectors: Array<(error: Error) => void> = [];
  private opened = false;
  private receivedReady = false;
  private closedManually = false;

  constructor(private readonly token: string) {}

  on<K extends keyof TranscriptSocketEvents>(event: K, listener: Listener<K>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const wrapped = listener as unknown as AnyListener;
    set.add(wrapped);
    return () => {
      this.listeners.get(event)?.delete(wrapped);
    };
  }

  private emit<K extends keyof TranscriptSocketEvents>(event: K, ...args: Parameters<Listener<K>>) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(...(args as unknown[]));
      } catch (err) {
        console.error(`transcript socket listener for ${event} threw`, err);
      }
    }
  }

  async open(): Promise<void> {
    if (this.socket) return;
    const url = buildWsUrl(this.token);
    const socket = new WebSocket(url);
    socket.binaryType = "arraybuffer";
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.opened = true;
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      let parsed: WsServerMessage | null = null;
      try {
        parsed = JSON.parse(event.data) as WsServerMessage;
      } catch (err) {
        console.warn("invalid ws message", err, event.data);
        return;
      }
      if (!parsed) return;
      switch (parsed.type) {
        case "ready":
          this.receivedReady = true;
          this.emit("ready", parsed);
          this.flushReady(parsed);
          break;
        case "partial":
          this.emit("partial", parsed);
          break;
        case "final":
          this.emit("final", parsed);
          break;
        case "polished":
          this.emit("polished", parsed);
          break;
        case "error":
          this.emit("error", parsed);
          break;
        case "closed":
          this.emit("closed", parsed);
          break;
        default:
          console.warn("unknown ws server message", parsed);
      }
    });

    socket.addEventListener("error", (event) => {
      this.emit("socketError", event);
    });

    socket.addEventListener("close", (event) => {
      this.emit("socketClose", event, this.receivedReady);
      this.rejectReady(new Error("WebSocket closed before ready"));
      this.socket = null;
    });

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("error", onError);
        socket.removeEventListener("close", onClose);
      };
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("WebSocket 连接失败"));
      };
      const onClose = () => {
        cleanup();
        reject(new Error("WebSocket 已关闭"));
      };
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
      socket.addEventListener("close", onClose);
    });
  }

  start(hotwordGroup: string): Promise<WsServerMessage> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("WebSocket 尚未就绪"));
    }
    const message: WsClientMessage = { type: "start", hotwordGroup };
    this.socket.send(JSON.stringify(message));
    return new Promise<WsServerMessage>((resolve, reject) => {
      this.readyResolvers.push(resolve);
      this.readyRejectors.push(reject);
    });
  }

  sendAudio(buffer: ArrayBuffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(buffer);
  }

  stop() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const message: WsClientMessage = { type: "stop" };
    this.socket.send(JSON.stringify(message));
  }

  close(code = 1000, reason = "client closed") {
    this.closedManually = true;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.close(code, reason);
      } catch {
        // ignore
      }
    }
  }

  get isOpen(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  get hadReady(): boolean {
    return this.receivedReady;
  }

  get wasClosedByClient(): boolean {
    return this.closedManually;
  }

  get hasOpened(): boolean {
    return this.opened;
  }

  private flushReady(message: WsServerMessage) {
    const resolvers = this.readyResolvers;
    this.readyResolvers = [];
    this.readyRejectors = [];
    for (const resolve of resolvers) {
      try {
        resolve(message);
      } catch {
        // ignore
      }
    }
  }

  private rejectReady(error: Error) {
    const rejectors = this.readyRejectors;
    this.readyResolvers = [];
    this.readyRejectors = [];
    for (const reject of rejectors) {
      try {
        reject(error);
      } catch {
        // ignore
      }
    }
  }
}
