import type { ExtensionRecordingState } from "@/extension/messages";

let nextFinalId = 1;

export function createInitialRecordingState(activeGroup = "通用"): ExtensionRecordingState {
  return {
    status: "idle",
    sessionId: null,
    activeGroup,
    partial: "",
    finals: [],
    error: null,
  };
}

export function textForInsertion(state: ExtensionRecordingState, preferPolished: boolean): string {
  return state.finals
    .map((sentence) => {
      if (preferPolished && sentence.polishedText) return sentence.polishedText;
      return sentence.rawText || sentence.polishedText || "";
    })
    .filter(Boolean)
    .join("");
}

export function appendFinal(state: ExtensionRecordingState, rawText: string): ExtensionRecordingState {
  return {
    ...state,
    partial: "",
    finals: [
      ...state.finals,
      {
        id: nextFinalId++,
        rawText,
        polishedText: null,
      },
    ],
  };
}

export function applyPolished(state: ExtensionRecordingState, polishedText: string): ExtensionRecordingState {
  const targetIndex = state.finals.findIndex((sentence) => !sentence.polishedText);
  if (targetIndex >= 0) {
    const finals = state.finals.slice();
    finals[targetIndex] = { ...finals[targetIndex], polishedText };
    return { ...state, finals };
  }
  return {
    ...state,
    finals: [
      ...state.finals,
      {
        id: nextFinalId++,
        rawText: "",
        polishedText,
      },
    ],
  };
}

export function resetFinalCounter() {
  nextFinalId = 1;
}
