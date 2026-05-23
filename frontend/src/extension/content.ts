import { getChrome } from "@/lib/chrome";
import { isExtensionMessage, type ExtensionMessage, type ExtensionResponse } from "@/extension/messages";

const chrome = getChrome();

function activeEditable(): HTMLInputElement | HTMLTextAreaElement | HTMLElement | null {
  const active = document.activeElement;
  if (!active) return null;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const blockedTypes = new Set([
      "button",
      "checkbox",
      "color",
      "file",
      "hidden",
      "radio",
      "range",
      "reset",
      "submit",
    ]);
    if (active instanceof HTMLInputElement && blockedTypes.has(active.type)) return null;
    if (active.readOnly || active.disabled) return null;
    return active;
  }
  if (active instanceof HTMLElement && active.isContentEditable) {
    return active;
  }
  return null;
}

function insertIntoTextControl(target: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  target.setRangeText(text, start, end, "end");
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function insertIntoContentEditable(target: HTMLElement, text: string) {
  target.focus();
  const selection = window.getSelection();
  if (!selection) return;
  if (selection.rangeCount === 0) {
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
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
}

function insertText(text: string): ExtensionResponse {
  const target = activeEditable();
  if (!target) return { ok: false, error: "当前页面没有聚焦的可编辑输入框" };
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    insertIntoTextControl(target, text);
  } else {
    insertIntoContentEditable(target, text);
  }
  return { ok: true, inserted: true };
}

chrome?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (!isExtensionMessage(message) || message.type !== "insert-transcript") return false;
  sendResponse(insertText(message.text));
  return false;
});

void chrome?.runtime?.sendMessage({
  target: "background",
  type: "content-ready",
  url: window.location.href,
} satisfies ExtensionMessage);
