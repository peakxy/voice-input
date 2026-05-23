import { getChrome, openSidePanelForCurrentTab, queryActiveTabId } from "@/lib/chrome";
import {
  isExtensionMessage,
  type ExtensionMessage,
  type ExtensionRecordingState,
  type ExtensionResponse,
} from "@/extension/messages";
import { createInitialRecordingState, textForInsertion } from "@/extension/recordingState";

const chrome = getChrome();
let cachedState: ExtensionRecordingState = createInitialRecordingState();
let creatingOffscreen: Promise<void> | null = null;

function ok(state?: ExtensionRecordingState): ExtensionResponse {
  return state ? { ok: true, state } : { ok: true };
}

function fail(error: unknown, fallback: string): ExtensionResponse {
  return { ok: false, error: error instanceof Error ? error.message : fallback };
}

async function ensureOffscreenDocument() {
  if (!chrome?.offscreen || !chrome.runtime) return;
  if (await chrome.offscreen.hasDocument?.()) return;
  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: chrome.runtime.getURL("extension/offscreen.html"),
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
  const response = (await chrome?.runtime?.sendMessage({
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
  if (!chrome?.tabs || tabId === null) {
    return fail("No active tab", "未找到当前标签页");
  }
  const response = (await chrome.tabs.sendMessage(tabId, {
    target: "background",
    type: "insert-transcript",
    text,
  })) as ExtensionResponse | undefined;
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

chrome?.commands?.onCommand.addListener((command) => {
  if (command === "open-recording-panel") {
    void openPanel();
  }
});

chrome?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (!isExtensionMessage(message)) return false;
  if (message.target && message.target !== "background") return false;
  void handleMessage(message)
    .then(sendResponse)
    .catch((error) => sendResponse(fail(error, "扩展消息处理失败")));
  return true;
});

void ensureOffscreenDocument();
