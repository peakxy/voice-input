import { readAuthSnapshot } from "@/lib/authSession";
import { startMicrophone, type AudioStreamHandle } from "@/lib/audio";
import { getChrome } from "@/lib/chrome";
import { TranscriptSocket } from "@/lib/transcriptSocket";
import type {
  ExtensionMessage,
  ExtensionRecordingState,
  ExtensionResponse,
} from "@/extension/messages";
import { isExtensionMessage } from "@/extension/messages";
import {
  appendFinal,
  applyPolished,
  createInitialRecordingState,
  resetFinalCounter,
} from "@/extension/recordingState";

const chromeApi = getChrome();

let state: ExtensionRecordingState = createInitialRecordingState();
let socket: TranscriptSocket | null = null;
let audio: AudioStreamHandle | null = null;

function respondError(error: unknown, fallback: string): ExtensionResponse {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

function publishState() {
  void chromeApi?.runtime?.sendMessage({
    target: "ui",
    type: "recording-state",
    state,
  } satisfies ExtensionMessage);
}

function setState(next: ExtensionRecordingState) {
  state = next;
  publishState();
}

async function teardown(closeSocket = true) {
  await audio?.stop().catch(() => undefined);
  audio = null;
  if (closeSocket) {
    socket?.close();
    socket = null;
  }
}

async function startRecording(hotwordGroup: string): Promise<ExtensionResponse> {
  if (state.status === "recording" || state.status === "starting") {
    return { ok: true, state };
  }

  resetFinalCounter();
  setState({
    ...createInitialRecordingState(hotwordGroup),
    status: "starting",
  });

  const snapshot = await readAuthSnapshot();
  if (!snapshot.token) {
    const message = "扩展未登录，请先在 Web 应用登录后再试。";
    setState({ ...state, status: "error", error: message });
    return { ok: false, error: message };
  }

  const nextSocket = new TranscriptSocket(snapshot.token);
  socket = nextSocket;

  nextSocket.on("partial", (message) => {
    if (message.text) setState({ ...state, partial: message.text });
  });
  nextSocket.on("final", (message) => {
    if (message.text) setState(appendFinal(state, message.text));
  });
  nextSocket.on("polished", (message) => {
    if (message.text) setState(applyPolished(state, message.text));
  });
  nextSocket.on("error", (message) => {
    const text = message.message ?? "ASR 服务返回错误";
    setState({ ...state, status: "error", error: text });
    void teardown();
  });
  nextSocket.on("closed", () => {
    setState({ ...state, status: "closed", partial: "" });
    void teardown(false);
    socket = null;
  });
  nextSocket.on("socketClose", (_event, hadReady) => {
    if (!hadReady && !nextSocket.wasClosedByClient) {
      setState({ ...state, status: "error", error: "WebSocket 连接被拒绝，请重新登录。" });
    } else if (state.status === "recording" || state.status === "starting") {
      setState({ ...state, status: "closed", partial: "" });
    }
    void teardown(false);
    socket = null;
  });

  try {
    await nextSocket.open();
    const ready = await nextSocket.start(hotwordGroup);
    setState({
      ...state,
      status: "recording",
      sessionId: ready.sessionId ?? `extension-${Date.now()}`,
      error: null,
    });
    audio = await startMicrophone({
      onChunk: (chunk) => nextSocket.sendAudio(chunk),
      workletUrl: chromeApi?.runtime?.getURL("worklets/pcm-downsampler.js"),
    });
    return { ok: true, state };
  } catch (error) {
    await teardown();
    setState({
      ...state,
      status: "error",
      error: error instanceof Error ? error.message : "无法开启录音",
    });
    return respondError(error, "无法开启录音");
  }
}

async function stopRecording(): Promise<ExtensionResponse> {
  if (state.status !== "recording" && state.status !== "starting") {
    return { ok: true, state };
  }
  setState({ ...state, status: "stopping" });
  await audio?.stop().catch(() => undefined);
  audio = null;
  socket?.stop();
  globalThis.setTimeout(() => {
    if (socket?.isOpen) {
      socket.close();
      socket = null;
      setState({ ...state, status: "closed", partial: "" });
    }
  }, 800);
  return { ok: true, state };
}

async function resetRecording(): Promise<ExtensionResponse> {
  await teardown();
  resetFinalCounter();
  setState(createInitialRecordingState(state.activeGroup));
  return { ok: true, state };
}

chromeApi?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (!isExtensionMessage(message)) return false;
  if (message.target !== "offscreen") return false;

  if (message.type === "recording-get-state") {
    sendResponse({ ok: true, state } satisfies ExtensionResponse);
    return false;
  }

  if (message.type === "recording-start") {
    void startRecording(message.hotwordGroup).then(sendResponse);
    return true;
  }

  if (message.type === "recording-stop") {
    void stopRecording().then(sendResponse);
    return true;
  }

  if (message.type === "recording-reset") {
    void resetRecording().then(sendResponse);
    return true;
  }

  return false;
});

publishState();
