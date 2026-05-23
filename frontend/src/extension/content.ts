import { getChrome } from "@/lib/chrome";
import { isExtensionMessage, type ExtensionMessage, type ExtensionResponse } from "@/extension/messages";

const chrome = getChrome();

type EditableTarget = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

let lastEditable: EditableTarget | null = null;

function isEditableElement(node: Element | null): node is EditableTarget {
  if (!node) return false;
  if (node instanceof HTMLInputElement) {
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
    if (blockedTypes.has(node.type)) return false;
    if (node.readOnly || node.disabled) return false;
    return true;
  }
  if (node instanceof HTMLTextAreaElement) {
    return !node.readOnly && !node.disabled;
  }
  if (node instanceof HTMLElement && node.isContentEditable) {
    return true;
  }
  return false;
}

function rememberFocus(node: Element | null) {
  if (isEditableElement(node)) {
    lastEditable = node;
    (window as unknown as { __voiceInputLastEditable?: Element }).__voiceInputLastEditable = node;
  }
}

document.addEventListener(
  "focusin",
  (event) => rememberFocus(event.target as Element | null),
  true,
);
document.addEventListener("selectionchange", () => {
  const active = document.activeElement;
  if (isEditableElement(active)) lastEditable = active;
});

function activeEditable(): EditableTarget | null {
  const active = document.activeElement;
  if (isEditableElement(active)) return active;
  if (lastEditable && document.contains(lastEditable)) return lastEditable;
  return null;
}

function insertIntoTextControl(target: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  target.focus({ preventScroll: true });
  target.setRangeText(text, start, end, "end");
  target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
}

function insertIntoContentEditable(target: HTMLElement, text: string) {
  target.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return;
  const targetContains =
    selection.rangeCount > 0 && target.contains(selection.getRangeAt(0).startContainer);
  if (!targetContains) {
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
}

function insertText(text: string): ExtensionResponse {
  const target = activeEditable();
  if (!target) return { ok: false, error: "请先点击页面上的输入框，再回到扩展点击插入" };
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    insertIntoTextControl(target, text);
  } else {
    insertIntoContentEditable(target, text);
  }
  return { ok: true, inserted: true };
}

chrome?.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
  if (!isExtensionMessage(message) || message.type !== "insert-transcript") return false;
  try {
    sendResponse(insertText(message.text));
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "插入时发生错误",
    });
  }
  return true;
});

void chrome?.runtime?.sendMessage({
  target: "background",
  type: "content-ready",
  url: window.location.href,
} satisfies ExtensionMessage);
