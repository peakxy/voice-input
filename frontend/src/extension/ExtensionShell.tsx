import { useEffect, useMemo, useState } from "react";
import { CopyCheck, Loader2, Mic, MicOff, PanelRightOpen, RotateCcw, Sparkles } from "lucide-react";
import clsx from "clsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readAuthSnapshot, writeAuthSnapshot } from "@/lib/authSession";
import { api, extractErrorMessage } from "@/lib/api";
import { getChrome } from "@/lib/chrome";
import type {
  ExtensionMessage,
  ExtensionRecordingState,
  ExtensionResponse,
  ExtensionSurface,
  InsertMode,
} from "@/extension/messages";
import { isExtensionMessage } from "@/extension/messages";
import { createInitialRecordingState, textForInsertion } from "@/extension/recordingState";
import type { HotwordResponse } from "@/lib/types";

type ExtensionShellProps = {
  surface: ExtensionSurface;
};

type UserState = {
  username: string | null;
  authenticated: boolean;
};

const chromeApi = getChrome();

async function sendExtensionMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  const response = (await chromeApi?.runtime?.sendMessage({
    ...message,
    target: "background",
  })) as ExtensionResponse | undefined;
  return response ?? { ok: false, error: "扩展后台没有响应" };
}

export function ExtensionShell({ surface }: ExtensionShellProps) {
  const [state, setState] = useState<ExtensionRecordingState>(() => createInitialRecordingState());
  const [user, setUser] = useState<UserState>({ username: null, authenticated: false });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [groups, setGroups] = useState<string[]>(["通用"]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isRecording = state.status === "recording";
  const isStarting = state.status === "starting";
  const canStart = user.authenticated && !busy && !isRecording && !isStarting;
  const finalText = useMemo(() => textForInsertion(state, false), [state]);
  const polishedText = useMemo(() => textForInsertion(state, true), [state]);

  useEffect(() => {
    let cancelled = false;
    void readAuthSnapshot().then(async (snapshot) => {
      if (cancelled) return;
      setUser({ username: snapshot.user?.username ?? null, authenticated: Boolean(snapshot.token) });
      if (!snapshot.token) return;
      try {
        const { data } = await api.get<HotwordResponse[]>("/api/hotwords");
        if (cancelled) return;
        const nextGroups = Array.from(new Set(["通用", ...data.map((item) => item.groupName)]));
        setGroups(nextGroups);
        if (!nextGroups.includes(state.activeGroup)) {
          setState((current) => ({ ...current, activeGroup: nextGroups[0] ?? "通用" }));
        }
      } catch (error) {
        if (!cancelled) setMessage(extractErrorMessage(error, "热词加载失败"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.activeGroup]);

  useEffect(() => {
    void sendExtensionMessage({ type: "extension-ready", surface });
    void sendExtensionMessage({ type: "recording-get-state" }).then((response) => {
      if (response.ok && response.state) setState(response.state);
    });
  }, [surface]);

  useEffect(() => {
    chromeApi?.runtime?.onMessage?.addListener((incoming) => {
      if (
        isExtensionMessage(incoming) &&
        (!incoming.target || incoming.target === "ui") &&
        incoming.type === "recording-state"
      ) {
        setState(incoming.state);
      }
      return false;
    });
  }, []);

  const requestPanel = async () => {
    const response = await sendExtensionMessage({ type: "open-recording-panel" });
    if (!response.ok) setMessage(response.error);
  };

  const start = async () => {
    setBusy(true);
    setMessage(null);
    const response = await sendExtensionMessage({
      type: "recording-start",
      hotwordGroup: state.activeGroup,
    });
    if (response.ok) {
      if (response.state) setState(response.state);
    } else {
      setMessage(response.error);
    }
    setBusy(false);
  };

  const stop = async () => {
    setBusy(true);
    const response = await sendExtensionMessage({ type: "recording-stop" });
    if (response.ok) {
      if (response.state) setState(response.state);
    } else {
      setMessage(response.error);
    }
    setBusy(false);
  };

  const reset = async () => {
    const response = await sendExtensionMessage({ type: "recording-reset" });
    if (response.ok && response.state) {
      setState(response.state);
      setMessage(null);
    } else if (!response.ok) {
      setMessage(response.error);
    }
  };

  const insert = async (mode: InsertMode) => {
    const response = await sendExtensionMessage({ type: "insert-current-transcript", mode });
    setMessage(response.ok ? "已插入当前页面" : response.error);
  };

  const login = async () => {
    if (!username || !password) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data } = await api.post<{ token: string; userId: number; username: string }>(
        "/api/auth/login",
        { username, password },
      );
      const snapshot = {
        token: data.token,
        user: { userId: data.userId, username: data.username },
      };
      await writeAuthSnapshot(snapshot);
      setUser({ username: data.username, authenticated: true });
      setUsername("");
      setPassword("");
      setMessage("已登录");
    } catch (error) {
      setMessage(extractErrorMessage(error, "登录失败"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-bg px-3 py-3 text-slate-100">
      <div className="space-y-3">
        <header className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-accent" />
              <h1 className="truncate text-sm font-semibold">Voice Input</h1>
            </div>
            <p className="truncate text-xs text-muted">
              {user.authenticated ? user.username : "请先在 Web 应用登录"}
            </p>
          </div>
          <Badge variant={state.status === "error" ? "warning" : isRecording ? "success" : "muted"}>
            {labelForStatus(state.status)}
          </Badge>
        </header>

        {surface === "popup" && (
          <Button size="sm" variant="secondary" className="w-full" onClick={requestPanel}>
            <PanelRightOpen size={14} />
            打开侧边栏
          </Button>
        )}

        {!user.authenticated && (
          <section className="space-y-2 rounded-md border border-border bg-surface/75 p-3">
            <div className="space-y-1">
              <Label htmlFor={`${surface}-username`} className="text-xs">
                用户名
              </Label>
              <Input
                id={`${surface}-username`}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${surface}-password`} className="text-xs">
                密码
              </Label>
              <Input
                id={`${surface}-password`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button className="w-full" size="sm" disabled={busy || !username || !password} onClick={login}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              登录
            </Button>
          </section>
        )}

        <section className="space-y-2 rounded-md border border-border bg-surface/75 p-3">
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <Button
                key={group}
                size="sm"
                variant={group === state.activeGroup ? "primary" : "secondary"}
                disabled={isRecording || isStarting}
                onClick={() => setState((current) => ({ ...current, activeGroup: group }))}
              >
                {group}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {!isRecording && !isStarting ? (
              <Button size="sm" disabled={!canStart} onClick={start}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                开始
              </Button>
            ) : (
              <Button size="sm" variant="danger" disabled={busy} onClick={stop}>
                <MicOff size={14} />
                停止
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={isRecording || isStarting} onClick={reset}>
              <RotateCcw size={14} />
              清空
            </Button>
          </div>
        </section>

        <TranscriptPanel state={state} />

        <section className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" disabled={!finalText} onClick={() => insert("final")}>
            <CopyCheck size={14} />
            插入原文
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!polishedText}
            onClick={() => insert("polished")}
          >
            <Sparkles size={14} />
            插入润色
          </Button>
        </section>

        {(message || state.error) && (
          <p
            className={clsx(
              "rounded-md border px-3 py-2 text-xs leading-relaxed",
              state.status === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-border bg-surface text-muted",
            )}
          >
            {message ?? state.error}
          </p>
        )}
      </div>
    </div>
  );
}

function TranscriptPanel({ state }: { state: ExtensionRecordingState }) {
  if (!state.partial && state.finals.length === 0) {
    return (
      <section className="rounded-md border border-dashed border-border bg-surface/55 px-3 py-6 text-center text-xs text-muted">
        转写内容会显示在这里。
      </section>
    );
  }

  return (
    <section className="max-h-[340px] space-y-2 overflow-y-auto rounded-md border border-border bg-surface/75 p-3">
      {state.finals.map((sentence) => (
        <p
          key={sentence.id}
          className={clsx(
            "whitespace-pre-wrap rounded-md border px-3 py-2 text-sm leading-relaxed",
            sentence.polishedText
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100"
              : "border-border bg-bg text-slate-200",
          )}
        >
          {sentence.polishedText ?? sentence.rawText}
        </p>
      ))}
      {state.partial && (
        <p className="whitespace-pre-wrap rounded-md border border-dashed border-accent/40 bg-accentSoft/40 px-3 py-2 text-sm italic text-accent">
          {state.partial}
        </p>
      )}
    </section>
  );
}

function labelForStatus(status: ExtensionRecordingState["status"]): string {
  switch (status) {
    case "starting":
      return "连接中";
    case "recording":
      return "录音中";
    case "stopping":
      return "结束中";
    case "closed":
      return "已结束";
    case "error":
      return "错误";
    default:
      return "待开始";
  }
}
