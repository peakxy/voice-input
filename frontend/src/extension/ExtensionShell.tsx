import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CopyCheck,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  PanelRightOpen,
  RotateCcw,
  Sparkles,
  User,
} from "lucide-react";
import clsx from "clsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { writeAuthSnapshot } from "@/lib/authSession";
import { api, extractErrorMessage } from "@/lib/api";
import { getChrome } from "@/lib/chrome";
import { readExtensionAuthSnapshot } from "@/extension/auth";
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

type ViewState = "loading" | "welcome" | "login" | "record";

const chrome = getChrome();

async function sendExtensionMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  const response = (await chrome?.runtime?.sendMessage({
    ...message,
    target: "background",
  })) as ExtensionResponse | undefined;
  return response ?? { ok: false, error: "扩展后台没有响应" };
}

export function ExtensionShell({ surface }: ExtensionShellProps) {
  const [state, setState] = useState<ExtensionRecordingState>(() => createInitialRecordingState());
  const [user, setUser] = useState<UserState>({ username: null, authenticated: false });
  const [view, setView] = useState<ViewState>("loading");
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

    async function hydrate() {
      const snapshot = await readExtensionAuthSnapshot();
      if (cancelled) return;
      const authenticated = Boolean(snapshot.token);
      setUser({
        username: snapshot.user?.username ?? null,
        authenticated,
      });
      setView(authenticated ? "record" : "welcome");
      if (!snapshot.token) return;
      await loadHotwordGroups(cancelled);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void sendExtensionMessage({ type: "extension-ready", surface });
    void sendExtensionMessage({ type: "recording-get-state" }).then((response) => {
      if (response.ok && response.state) setState(response.state);
    });
  }, [surface]);

  useEffect(() => {
    chrome?.runtime?.onMessage?.addListener((incoming) => {
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

  const loadHotwordGroups = async (cancelled = false) => {
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
  };

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
      setView("record");
      setMessage(null);
      await loadHotwordGroups();
    } catch (error) {
      setMessage(extractErrorMessage(error, "登录失败"));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendExtensionMessage({ type: "recording-reset" });
      await writeAuthSnapshot({ token: null, user: null });
      setUser({ username: null, authenticated: false });
      setGroups(["通用"]);
      setState(createInitialRecordingState());
      setView("welcome");
      setUsername("");
      setPassword("");
      setMessage("已退出登录");
    } finally {
      setBusy(false);
    }
  };

  const statusVariant = state.status === "error" ? "warning" : isRecording ? "success" : "muted";

  return (
    <div className="min-h-full bg-bg text-slate-100">
      <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col px-3 py-3">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accentSoft text-accent">
              <Mic size={17} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">Voice Input</h1>
              <p className="truncate text-xs text-muted">
                {user.authenticated ? user.username : "未登录"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {view === "record" ? <Badge variant={statusVariant}>{labelForStatus(state.status)}</Badge> : null}
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-slate-300 transition hover:border-accent hover:text-accent"
              aria-label={user.authenticated ? "退出登录" : "登录"}
              title={user.authenticated ? "退出登录" : "登录"}
              disabled={busy}
              onClick={() => {
                if (user.authenticated) void logout();
                else {
                  setView("login");
                  setMessage(null);
                }
              }}
            >
              {user.authenticated ? <LogOut size={15} /> : <User size={15} />}
            </button>
          </div>
        </header>

        {surface === "popup" && (
          <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={requestPanel}>
            <PanelRightOpen size={14} />
            打开侧边栏
          </Button>
        )}

        <main className="mt-4 flex-1">
          {view === "loading" ? (
            <LoadingView />
          ) : view === "login" ? (
            <LoginView
              busy={busy}
              message={message}
              password={password}
              username={username}
              onBack={() => {
                setView("welcome");
                setMessage(null);
              }}
              onLogin={login}
              onPasswordChange={setPassword}
              onUsernameChange={setUsername}
            />
          ) : view === "welcome" ? (
            <WelcomeView
              message={message}
              onLogin={() => {
                setView("login");
                setMessage(null);
              }}
            />
          ) : (
            <RecordView
              busy={busy}
              canStart={canStart}
              finalText={finalText}
              groups={groups}
              isRecording={isRecording}
              isStarting={isStarting}
              message={message}
              polishedText={polishedText}
              state={state}
              onGroupChange={(group) => setState((current) => ({ ...current, activeGroup: group }))}
              onInsert={insert}
              onReset={reset}
              onStart={start}
              onStop={stop}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex min-h-[220px] items-center justify-center text-xs text-muted">
      <Loader2 size={16} className="mr-2 animate-spin" />
      正在同步登录态…
    </div>
  );
}

function WelcomeView({
  message,
  onLogin,
}: {
  message: string | null;
  onLogin: () => void;
}) {
  return (
    <section className="flex min-h-[250px] flex-col items-center justify-center gap-4 text-center">
      <button
        type="button"
        className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/40 bg-accentSoft text-accent transition hover:scale-[1.03] hover:border-accent"
        aria-label="打开登录"
        title="登录"
        onClick={onLogin}
      >
        <User size={27} />
      </button>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-100">登录后开始语音输入</h2>
        <p className="mx-auto max-w-[240px] text-xs leading-relaxed text-muted">
          使用 Web 应用账号同步扩展登录态。
        </p>
      </div>
      <Button size="sm" className="w-full max-w-[220px]" onClick={onLogin}>
        <User size={14} />
        去登录
      </Button>
      {message ? <Message text={message} tone="muted" /> : null}
    </section>
  );
}

function LoginView({
  busy,
  message,
  password,
  username,
  onBack,
  onLogin,
  onPasswordChange,
  onUsernameChange,
}: {
  busy: boolean;
  message: string | null;
  password: string;
  username: string;
  onBack: () => void;
  onLogin: () => void;
  onPasswordChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <button
        type="button"
        className="inline-flex h-8 items-center gap-2 rounded-md px-1 text-xs text-muted transition hover:text-slate-100"
        onClick={onBack}
      >
        <ArrowLeft size={14} />
        返回
      </button>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-100">登录 Voice Input</h2>
        <p className="text-xs text-muted">登录后自动回到实时语音输入。</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onLogin();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="extension-username" className="text-xs">
            用户名
          </Label>
          <Input
            id="extension-username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            autoComplete="username"
            disabled={busy}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="extension-password" className="text-xs">
            密码
          </Label>
          <Input
            id="extension-password"
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="current-password"
            disabled={busy}
          />
        </div>
        <Button className="w-full" size="sm" type="submit" disabled={busy || !username || !password}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
          登录
        </Button>
      </form>
      {message ? <Message text={message} tone="danger" /> : null}
    </section>
  );
}

function RecordView({
  busy,
  canStart,
  finalText,
  groups,
  isRecording,
  isStarting,
  message,
  polishedText,
  state,
  onGroupChange,
  onInsert,
  onReset,
  onStart,
  onStop,
}: {
  busy: boolean;
  canStart: boolean;
  finalText: string;
  groups: string[];
  isRecording: boolean;
  isStarting: boolean;
  message: string | null;
  polishedText: string;
  state: ExtensionRecordingState;
  onGroupChange: (group: string) => void;
  onInsert: (mode: InsertMode) => void;
  onReset: () => void;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="space-y-3">
      <section className="space-y-3 border-y border-border/80 py-3">
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Button
              key={group}
              size="sm"
              variant={group === state.activeGroup ? "primary" : "secondary"}
              disabled={isRecording || isStarting}
              onClick={() => onGroupChange(group)}
            >
              {group}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {!isRecording && !isStarting ? (
            <Button size="sm" disabled={!canStart} onClick={onStart}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
              开始
            </Button>
          ) : (
            <Button size="sm" variant="danger" disabled={busy} onClick={onStop}>
              <MicOff size={14} />
              停止
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="w-10 px-0"
            disabled={isRecording || isStarting}
            aria-label="清空"
            title="清空"
            onClick={onReset}
          >
            <RotateCcw size={14} />
          </Button>
        </div>
      </section>

      <TranscriptPanel state={state} />

      <section className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" disabled={!finalText} onClick={() => onInsert("final")}>
          <CopyCheck size={14} />
          插入原文
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!polishedText}
          onClick={() => onInsert("polished")}
        >
          <Sparkles size={14} />
          插入润色
        </Button>
      </section>

      {message || state.error ? (
        <Message text={message ?? state.error ?? ""} tone={state.status === "error" ? "danger" : "muted"} />
      ) : null}
    </div>
  );
}

function Message({ text, tone }: { text: string; tone: "danger" | "muted" }) {
  return (
    <p
      className={clsx(
        "rounded-md border px-3 py-2 text-xs leading-relaxed",
        tone === "danger"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : "border-border bg-surface text-muted",
      )}
    >
      {text}
    </p>
  );
}

function TranscriptPanel({ state }: { state: ExtensionRecordingState }) {
  if (!state.partial && state.finals.length === 0) {
    return (
      <section className="min-h-[96px] rounded-md border border-dashed border-border bg-surface/45 px-3 py-8 text-center text-xs text-muted">
        转写内容会显示在这里
      </section>
    );
  }

  return (
    <section className="max-h-[310px] space-y-2 overflow-y-auto rounded-md border border-border bg-surface/65 p-3">
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
