import { getChrome, openSidePanelForCurrentTab, queryActiveTabId } from "@/lib/chrome";
import { readAuthSnapshot } from "@/lib/authSession";
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

type InsertResult = { ok: true } | { ok: false; error: string };

function insertInPageScript(text: string): InsertResult {
  const w = window as unknown as { __voiceInputLastEditable?: Element };
  function isEditable(node: Element | null): node is HTMLElement {
    if (!node) return false;
    if (node instanceof HTMLInputElement) {
      const blocked = ["button", "checkbox", "color", "file", "hidden", "radio", "range", "reset", "submit"];
      if (blocked.indexOf(node.type) >= 0) return false;
      if (node.readOnly || node.disabled) return false;
      return true;
    }
    if (node instanceof HTMLTextAreaElement) return !node.readOnly && !node.disabled;
    if (node instanceof HTMLElement && node.isContentEditable) return true;
    return false;
  }

  let target: HTMLElement | null = null;
  const active = document.activeElement;
  if (active && isEditable(active as Element)) target = active as HTMLElement;
  if (!target && w.__voiceInputLastEditable && document.contains(w.__voiceInputLastEditable)) {
    if (isEditable(w.__voiceInputLastEditable)) target = w.__voiceInputLastEditable as HTMLElement;
  }
  if (!target) return { ok: false, error: "请先点击页面上的输入框，再回到扩展点击插入" };

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.focus({ preventScroll: true });
    target.setRangeText(text, start, end, "end");
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }

  target.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return { ok: false, error: "无法获取页面选区" };
  const inTarget =
    selection.rangeCount > 0 && target.contains(selection.getRangeAt(0).startContainer);
  if (!inTarget) {
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  return { ok: true };
}

async function insertTextIntoActiveTab(text: string): Promise<ExtensionResponse> {
  if (!text.trim()) {
    return fail("Empty transcript", "当前没有可插入的文本");
  }
  const tabId = await queryActiveTabId();
  if (!chrome?.scripting || tabId === null) {
    return fail("No scripting", "未找到当前标签页或浏览器不支持注入");
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: insertInPageScript,
      args: [text],
    });
    const result = results?.[0]?.result as InsertResult | undefined;
    if (!result) return fail("No result", "页面未返回插入结果，请刷新该网页后重试");
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, inserted: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `当前页面不允许注入（${reason}），请切换到普通网页后再试。` };
  }
}

async function openPanel(): Promise<ExtensionResponse> {
  await openSidePanelForCurrentTab();
  await ensureOffscreenDocument();
  return ok(cachedState);
}

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case "auth-get-snapshot": {
      const snapshot = await readAuthSnapshot();
      return { ok: true, snapshot };
    }
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
      const text = message.text ?? textForInsertion(cachedState, message.mode === "polished");
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
