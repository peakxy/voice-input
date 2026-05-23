import type { AuthSnapshot } from "@/lib/authSession";

export type ExtensionSurface = "popup" | "sidepanel" | "offscreen";
export type ExtensionTarget = "background" | "offscreen" | "ui";

export type ExtensionRecordingState = {
  status: "idle" | "starting" | "recording" | "stopping" | "closed" | "error";
  sessionId: string | null;
  activeGroup: string;
  partial: string;
  finals: Array<{
    id: number;
    rawText: string;
    polishedText: string | null;
  }>;
  error: string | null;
};

export type InsertMode = "final" | "polished";

export type ExtensionMessage =
  | { target?: ExtensionTarget; type: "auth-get-snapshot" }
  | { target?: ExtensionTarget; type: "extension-ready"; surface: ExtensionSurface }
  | { target?: ExtensionTarget; type: "open-recording-panel" }
  | { target?: ExtensionTarget; type: "content-ready"; url: string }
  | { target?: ExtensionTarget; type: "recording-get-state" }
  | { target?: ExtensionTarget; type: "recording-start"; hotwordGroup: string }
  | { target?: ExtensionTarget; type: "recording-stop" }
  | { target?: ExtensionTarget; type: "recording-reset" }
  | { target?: ExtensionTarget; type: "recording-state"; state: ExtensionRecordingState }
  | { target?: ExtensionTarget; type: "recording-error"; message: string }
  | { target?: ExtensionTarget; type: "insert-transcript"; text: string }
  | { target?: ExtensionTarget; type: "insert-current-transcript"; mode: InsertMode; text?: string };

export type ExtensionResponse =
  | { ok: true; state?: ExtensionRecordingState; inserted?: boolean; snapshot?: AuthSnapshot }
  | { ok: false; error: string };

export function isExtensionMessage(message: unknown): message is ExtensionMessage {
  if (!message || typeof message !== "object") return false;
  return typeof (message as { type?: unknown }).type === "string";
}
