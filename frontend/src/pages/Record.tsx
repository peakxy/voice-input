import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Copy, Mic, MicOff, RotateCcw, Loader2 } from "lucide-react";
import clsx from "clsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-context";
import { startMicrophone, type AudioStreamHandle } from "@/lib/audio";
import { extractErrorMessage } from "@/lib/api";
import { HOTWORDS_QUERY_KEY, listHotwords } from "@/lib/hotwords";
import { TranscriptSocket } from "@/lib/transcriptSocket";
import { useAuthStore } from "@/stores/auth";
import { useRecordingStore, type FinalSentence } from "@/stores/recording";

export function Record() {
  const toast = useToast();
  const navigate = useNavigate();

  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);

  const status = useRecordingStore((state) => state.status);
  const partial = useRecordingStore((state) => state.partial);
  const finals = useRecordingStore((state) => state.finals);
  const sessionId = useRecordingStore((state) => state.sessionId);
  const error = useRecordingStore((state) => state.error);
  const activeGroup = useRecordingStore((state) => state.activeGroup);
  const setActiveGroup = useRecordingStore((state) => state.setActiveGroup);
  const beginStart = useRecordingStore((state) => state.beginStart);
  const markRecording = useRecordingStore((state) => state.markRecording);
  const beginStop = useRecordingStore((state) => state.beginStop);
  const markClosed = useRecordingStore((state) => state.markClosed);
  const setPartial = useRecordingStore((state) => state.setPartial);
  const appendFinal = useRecordingStore((state) => state.appendFinal);
  const applyPolished = useRecordingStore((state) => state.applyPolished);
  const fail = useRecordingStore((state) => state.fail);
  const reset = useRecordingStore((state) => state.reset);

  const audioRef = useRef<AudioStreamHandle | null>(null);
  const socketRef = useRef<TranscriptSocket | null>(null);

  const [busy, setBusy] = useState(false);

  const { data: hotwords } = useQuery({
    queryKey: HOTWORDS_QUERY_KEY,
    queryFn: listHotwords,
    staleTime: 60_000,
  });

  const groups = useMemo(() => {
    const set = new Set<string>();
    set.add(activeGroup);
    set.add("通用");
    (hotwords ?? []).forEach((row) => set.add(row.groupName));
    return Array.from(set);
  }, [hotwords, activeGroup]);

  const isRecording = status === "recording";
  const isStarting = status === "starting";
  const canStart = !busy && !isRecording && !isStarting;

  useEffect(() => {
    return () => {
      void audioRef.current?.stop();
      socketRef.current?.close();
      socketRef.current = null;
      audioRef.current = null;
    };
  }, []);

  const teardown = async () => {
    await audioRef.current?.stop().catch(() => undefined);
    audioRef.current = null;
    socketRef.current?.close();
    socketRef.current = null;
  };

  const onStart = async () => {
    if (!token) {
      toast.error("请先登录");
      navigate("/login", { replace: true });
      return;
    }
    if (busy || isRecording || isStarting) return;

    setBusy(true);
    beginStart();

    const socket = new TranscriptSocket(token);
    socketRef.current = socket;

    socket.on("partial", (message) => {
      if (message.text) setPartial(message.text);
    });
    socket.on("final", (message) => {
      if (message.text) appendFinal(message.text);
    });
    socket.on("polished", (message) => {
      if (message.text) applyPolished(message.text);
    });
    socket.on("error", (message) => {
      const text = message.message ?? "ASR 服务返回错误";
      console.error("[ws] error", message);
      toast.error(text);
      fail(text);
      void teardown();
    });
    socket.on("closed", (message) => {
      console.warn("[ws] closed", message);
      if (message.message) {
        toast.info(message.message);
      }
      markClosed();
      void teardown();
    });
    socket.on("socketClose", (event, hadReady) => {
      if (!hadReady) {
        if (!socket.wasClosedByClient) {
          // Likely a handshake/auth failure.
          toast.error("WebSocket 连接被拒绝，请重新登录");
          logout();
          navigate("/login", { replace: true });
        }
      } else {
        const currentStatus = useRecordingStore.getState().status;
        if (currentStatus === "recording" || currentStatus === "starting") {
          const reason = event.reason || "连接已关闭";
          toast.info(reason);
          markClosed();
        }
      }
    });

    try {
      console.info("[ws] opening");
      await socket.open();
      console.info("[ws] opened, sending start", { activeGroup });
      const ready = await socket.start(activeGroup);
      console.info("[ws] ready", ready);
      const newSessionId = ready.sessionId ?? `session-${Date.now()}`;
      markRecording(newSessionId);

      console.info("[audio] starting microphone");
      const handle = await startMicrophone({
        onChunk: (chunk) => socket.sendAudio(chunk),
      });
      audioRef.current = handle;
      console.info("[audio] microphone started, sample rate", handle.audioContext.sampleRate);
      toast.success("开始录音");
    } catch (err) {
      console.error("[record] start failed", err);
      const message = extractErrorMessage(err, "无法开启录音");
      toast.error(message);
      fail(message);
      await teardown();
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    if (!isRecording && status !== "starting") return;
    setBusy(true);
    beginStop();
    try {
      await audioRef.current?.stop().catch(() => undefined);
      audioRef.current = null;
      socketRef.current?.stop();
      // Wait briefly for closed message; if not received, close manually.
      window.setTimeout(() => {
        if (socketRef.current && socketRef.current.isOpen) {
          socketRef.current.close();
          socketRef.current = null;
          markClosed();
        }
      }, 800);
    } finally {
      setBusy(false);
    }
  };

  const onReset = async () => {
    await teardown();
    reset();
    toast.info("已清空当前会话");
  };

  const concatText = (sentences: FinalSentence[]): string =>
    sentences
      .map((s) => s.polishedText ?? s.rawText ?? "")
      .filter((t) => t.length > 0)
      .join("");

  const onCopy = async () => {
    const text = concatText(finals);
    if (!text) {
      toast.info("当前没有可复制的内容");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制到剪贴板");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">实时录入</h1>
          <p className="text-sm text-muted">点击开始后实时识别，停顿会自动产生最终句子。</p>
        </div>
        <Badge variant={isRecording ? "success" : status === "error" ? "warning" : "muted"}>
          {labelForStatus(status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>会话设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted">激活热词分组：</span>
            {groups.map((group) => (
              <Button
                key={group}
                size="sm"
                variant={group === activeGroup ? "primary" : "secondary"}
                onClick={() => setActiveGroup(group)}
                disabled={isRecording || isStarting}
              >
                {group}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isRecording && status !== "starting" ? (
              <Button onClick={onStart} disabled={!canStart} size="lg">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                {busy ? "连接中…" : "开始录音"}
              </Button>
            ) : (
              <Button onClick={onStop} disabled={busy} variant="danger" size="lg">
                <MicOff size={16} />
                {busy ? "结束中…" : "停止录音"}
              </Button>
            )}
            <Button variant="secondary" onClick={onCopy}>
              <Copy size={14} />
              复制全文
            </Button>
            <Button variant="ghost" onClick={onReset} disabled={isRecording || isStarting}>
              <RotateCcw size={14} />
              清空
            </Button>
            {sessionId && (
              <span className="text-xs text-muted">会话：{sessionId.slice(0, 8)}</span>
            )}
          </div>
          {error && (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>实时转写</CardTitle>
        </CardHeader>
        <CardContent>
          {finals.length === 0 && !partial && (
            <p className="text-sm text-muted">说点什么试试。最终句子会逐条出现，稍后会被润色替换。</p>
          )}
          <div className="space-y-2">
            {finals.map((sentence) => (
              <p
                key={sentence.id}
                className={clsx(
                  "whitespace-pre-wrap rounded-md border px-3 py-2 text-sm leading-relaxed transition",
                  sentence.polishedText
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-100"
                    : "border-border bg-bg text-slate-200",
                )}
              >
                {sentence.polishedText ?? sentence.rawText}
                {sentence.polishedText && (
                  <span className="ml-2 align-middle text-[10px] text-emerald-300">已润色</span>
                )}
              </p>
            ))}
            {partial && (
              <p className="whitespace-pre-wrap rounded-md border border-dashed border-accent/40 bg-accentSoft/40 px-3 py-2 text-sm italic text-accent">
                {partial}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function labelForStatus(status: ReturnType<typeof useRecordingStore.getState>["status"]): string {
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
    case "idle":
    default:
      return "待开始";
  }
}
