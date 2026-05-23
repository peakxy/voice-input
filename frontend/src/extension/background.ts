import { getChrome, openSidePanelForCurrentTab, queryActiveTabId } from "@/lib/chrome";
import {
  isExtensionMessage,
  type ExtensionMessage,
  type ExtensionRecordingState,
  type ExtensionResponse,
} from "@/extension/messages";
import { createInitialRecordingState, textForInsertion } from "@/extension/recordingState";

const chromeApi = getChrome();
let cachedState: ExtensionRecordingState = createInitialRecordingState();
let creatingOffscreen: Promise<void> | null = null;

function ok(state?: ExtensionRecordingState): ExtensionResponse {
  return state ? { ok: true, state } : { ok: true };
}

function fail(error: unknown, fallback: string): ExtensionResponse {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

async function ensureOffscreenDocument() {
  if (!chromeApi?.offscreen || !chromeApi.runtime) return;
  if (await chromeApi.offscreen.hasDocument?.()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chromeApi.offscreen
      .createDocument({
        url: chromeApi.runtime.getURL("extension/offscreen.html"),
        reasons: ["USER_MEDIA"],
        justification: "Capture microphone audio while the extension UI is not visible.",
      })
      .finally(() => {
        creatingOffscreen = null;
      });
  }
  await creatingOffscreen;
}

async function sendRuntimeMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  await ensureOffscreenDocument();
  const response = (await chromeApi?.runtime?.sendMessage({
    ...message,
    target: "offscreen",
  })) as ExtensionResponse | undefined;
  return response ?? fail("No response", "扩展后台没有响应");
}

async function insertTextIntoActiveTab(text: string): Promise<ExtensionResponse> {
  if (!text.trim()) {
    return fail("Empty transcript", "当前没有可插入的文本");
  }
  const tabId = await queryActiveTabId();
  if (!chromeApi?.tabs || tabId === null) {
    return fail("No active tab", "未找到当前标签页");
  }
  const response = (await chromeApi.tabs.sendMessage(tabId, {
    type: "insert-transcript",
    text,
  } satisfies ExtensionMessage)) as ExtensionResponse | undefined;
  return response ?? fail("No content response", "当前页面无法接收插入消息");
}

async function openPanel(): Promise<ExtensionResponse> {
  await openSidePanelForCurrentTab();
  await ensureOffscreenDocument();
  return ok(cachedState);
}

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case "open-recording-panel":
      return openPanel();
    case "recording-get-state":
      return sendRuntimeMessage(message);
    case "recording-start":
    case "recording-stop":
    case "recording-reset": {
      const response = await sendRuntimeMessage(message);
      if (response.ok && response.state) cachedState = response.state;
      return response;
    }
    case "recording-state":
      cachedState = message.state;
      return ok(cachedState);
    case "insert-current-transcript": {
      const text = textForInsertion(cachedState, message.mode === "polished");
      return insertTextIntoActiveTab(text);
    }
    case "extension-ready":
    case "content-ready":
      return ok(cachedState);
    default:
      return fail("Unsupported message", "不支持的扩展消息");
  }
}

chromeApi?.commands?.onCommand.addListener((command) => {
  if (command === "open-recording-panel") {
    void openPanel();
  }
});

chromeApi?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (!isExtensionMessage(message)) return false;
  if (message.target && message.target !== "background") return false;
  void handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse(fail(error, "扩展消息处理失败")));
  return true;
});

void ensureOffscreenDocument();
