export type ApiError = {
  message: string;
  status?: number;
};

export type AuthResponse = {
  userId: number;
  username: string;
  token: string;
};

export type MeResponse = {
  userId: number;
  username: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = LoginRequest;

export type HotwordRequest = {
  groupName: string;
  word: string;
};

export type HotwordResponse = {
  id: number;
  groupName: string;
  word: string;
};

export type TranscriptResponse = {
  id: number;
  sessionId: string;
  rawText: string | null;
  polishedText: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type WsClientMessage =
  | { type: "start"; sessionId?: string; hotwordGroup?: string }
  | { type: "stop"; sessionId?: string };

export type WsServerMessageType = "ready" | "partial" | "final" | "polished" | "error" | "closed";

export type WsServerMessage = {
  type: WsServerMessageType;
  sessionId: string | null;
  text: string | null;
  message: string | null;
};
