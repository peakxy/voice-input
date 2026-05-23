import { create } from "zustand";

const ACTIVE_GROUP_KEY = "vi.activeGroup";

export type RecordingStatus =
  | "idle"
  | "starting"
  | "recording"
  | "stopping"
  | "closed"
  | "error";

export type FinalSentence = {
  id: number;
  rawText: string;
  polishedText: string | null;
};

type RecordingState = {
  activeGroup: string;
  status: RecordingStatus;
  sessionId: string | null;
  partial: string;
  finals: FinalSentence[];
  polishedCursor: number;
  error: string | null;
  setActiveGroup: (group: string) => void;
  reset: () => void;
  beginStart: () => void;
  markRecording: (sessionId: string) => void;
  beginStop: () => void;
  markClosed: () => void;
  setPartial: (text: string) => void;
  appendFinal: (text: string) => void;
  applyPolished: (text: string) => void;
  fail: (message: string) => void;
};

function readActiveGroup(): string {
  if (typeof window === "undefined") return "通用";
  return window.localStorage.getItem(ACTIVE_GROUP_KEY) ?? "通用";
}

function persistActiveGroup(group: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_GROUP_KEY, group);
}

let nextFinalId = 1;

export const useRecordingStore = create<RecordingState>((set, get) => ({
  activeGroup: readActiveGroup(),
  status: "idle",
  sessionId: null,
  partial: "",
  finals: [],
  polishedCursor: 0,
  error: null,
  setActiveGroup: (group) => {
    persistActiveGroup(group);
    set({ activeGroup: group });
  },
  reset: () => {
    nextFinalId = 1;
    set({
      status: "idle",
      sessionId: null,
      partial: "",
      finals: [],
      polishedCursor: 0,
      error: null,
    });
  },
  beginStart: () => {
    nextFinalId = 1;
    set({
      status: "starting",
      sessionId: null,
      partial: "",
      finals: [],
      polishedCursor: 0,
      error: null,
    });
  },
  markRecording: (sessionId) => set({ status: "recording", sessionId, error: null }),
  beginStop: () => set({ status: "stopping" }),
  markClosed: () => set({ status: "closed", partial: "" }),
  setPartial: (text) => set({ partial: text }),
  appendFinal: (text) => {
    const finals = get().finals;
    const sentence: FinalSentence = {
      id: nextFinalId++,
      rawText: text,
      polishedText: null,
    };
    set({ finals: [...finals, sentence], partial: "" });
  },
  applyPolished: (text) => {
    const { finals, polishedCursor } = get();
    if (polishedCursor < finals.length) {
      const target = finals[polishedCursor];
      const next = finals.slice();
      next[polishedCursor] = { ...target, polishedText: text };
      set({ finals: next, polishedCursor: polishedCursor + 1 });
      return;
    }
    // No matching final; append a polished-only entry so the user still sees it.
    console.warn("polished arrived without matching final", text);
    const sentence: FinalSentence = {
      id: nextFinalId++,
      rawText: "",
      polishedText: text,
    };
    set({ finals: [...finals, sentence], polishedCursor: polishedCursor + 1 });
  },
  fail: (message) => set({ status: "error", error: message }),
}));
