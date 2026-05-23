import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import clsx from "clsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast-context";
import { extractErrorMessage } from "@/lib/api";
import { TRANSCRIPTS_QUERY_KEY, listTranscripts } from "@/lib/transcripts";

type PreviewMode = "polished" | "raw";

export function History() {
  const toast = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<Record<number, PreviewMode>>({});

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: TRANSCRIPTS_QUERY_KEY,
    queryFn: listTranscripts,
  });

  const sorted = useMemo(() => {
    return (data ?? []).slice().sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data]);

  const onCopy = async (text: string | null, label: string) => {
    if (!text) {
      toast.info(`没有可复制的${label}`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已复制${label}`);
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const setMode = (id: number, mode: PreviewMode) =>
    setPreviewMode((prev) => ({ ...prev, [id]: mode }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">历史转写</h1>
          <p className="text-sm text-muted">按倒序展示，每条可一键复制原文或润色稿。</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "刷新中…" : "刷新"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>记录</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-bg" />
              ))}
            </div>
          )}
          {isError && (
            <div className="space-y-3 text-sm text-red-300">
              <p>{extractErrorMessage(error, "加载历史失败")}</p>
              <Button size="sm" variant="secondary" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          )}
          {!isLoading && !isError && sorted.length === 0 && (
            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
              暂无历史记录，去录入页录一段试试。
            </div>
          )}
          {!isLoading && !isError && sorted.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {sorted.map((row) => {
                const expanded = expandedId === row.id;
                const mode: PreviewMode = previewMode[row.id] ?? (row.polishedText ? "polished" : "raw");
                const text = mode === "polished" ? row.polishedText : row.rawText;
                return (
                  <li key={row.id} className="px-4 py-3">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => toggleExpand(row.id)}
                      aria-expanded={expanded}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted">
                          <span>{formatDate(row.createdAt)}</span>
                          {row.durationMs != null && (
                            <Badge variant="muted">{formatDuration(row.durationMs)}</Badge>
                          )}
                          {row.polishedText ? (
                            <Badge variant="success">已润色</Badge>
                          ) : (
                            <Badge variant="default">仅原文</Badge>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-100">
                          {row.polishedText || row.rawText || "(空)"}
                        </p>
                      </div>
                      <span className="mt-1 text-muted">
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    </button>
                    {expanded && (
                      <div className="mt-3 space-y-3 rounded-md border border-border bg-bg p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Button
                            size="sm"
                            variant={mode === "polished" ? "primary" : "secondary"}
                            onClick={() => setMode(row.id, "polished")}
                            disabled={!row.polishedText}
                          >
                            润色
                          </Button>
                          <Button
                            size="sm"
                            variant={mode === "raw" ? "primary" : "secondary"}
                            onClick={() => setMode(row.id, "raw")}
                          >
                            原文
                          </Button>
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onCopy(row.rawText, "原文")}
                          >
                            <Copy size={14} />
                            复制原文
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onCopy(row.polishedText, "润色稿")}
                            disabled={!row.polishedText}
                          >
                            <Copy size={14} />
                            复制润色稿
                          </Button>
                        </div>
                        <pre className={clsx(
                          "whitespace-pre-wrap break-words text-sm leading-relaxed",
                          mode === "polished" ? "text-emerald-100" : "text-slate-200",
                        )}>
                          {text || "(空)"}
                        </pre>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
