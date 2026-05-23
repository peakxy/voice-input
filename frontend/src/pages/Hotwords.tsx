import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star } from "lucide-react";
import clsx from "clsx";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/api";
import {
  HOTWORDS_QUERY_KEY,
  createHotword,
  deleteHotword,
  listHotwords,
} from "@/lib/hotwords";
import type { HotwordResponse } from "@/lib/types";
import { useRecordingStore } from "@/stores/recording";

export function Hotwords() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const activeGroup = useRecordingStore((state) => state.activeGroup);
  const setActiveGroup = useRecordingStore((state) => state.setActiveGroup);

  const [groupInput, setGroupInput] = useState("通用");
  const [wordInput, setWordInput] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: HOTWORDS_QUERY_KEY,
    queryFn: listHotwords,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, HotwordResponse[]>();
    (data ?? []).forEach((row) => {
      const list = map.get(row.groupName) ?? [];
      list.push(row);
      map.set(row.groupName, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const createMutation = useMutation({
    mutationFn: createHotword,
    onSuccess: (created) => {
      queryClient.setQueryData<HotwordResponse[]>(HOTWORDS_QUERY_KEY, (prev) =>
        prev ? [...prev, created] : [created],
      );
      setWordInput("");
      toast.success(`已添加热词「${created.word}」`);
    },
    onError: (err) => toast.error(extractErrorMessage(err, "添加热词失败")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (row: HotwordResponse) => {
      await deleteHotword(row.id);
      return row;
    },
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey: HOTWORDS_QUERY_KEY });
      const previous = queryClient.getQueryData<HotwordResponse[]>(HOTWORDS_QUERY_KEY);
      queryClient.setQueryData<HotwordResponse[]>(HOTWORDS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((item) => item.id !== row.id),
      );
      return { previous };
    },
    onError: (err, _row, context) => {
      if (context?.previous) {
        queryClient.setQueryData(HOTWORDS_QUERY_KEY, context.previous);
      }
      toast.error(extractErrorMessage(err, "删除热词失败"));
    },
    onSuccess: (row) => toast.success(`已删除「${row.word}」`),
  });

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    const groupName = groupInput.trim();
    const word = wordInput.trim();
    if (!groupName || !word) {
      toast.error("分组和热词不能为空");
      return;
    }
    if (groupName.length > 32 || word.length > 255) {
      toast.error("分组最长 32 字，热词最长 255 字");
      return;
    }
    createMutation.mutate({ groupName, word });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">热词管理</h1>
          <p className="text-sm text-muted">
            按分组维护热词。开始录音时会注入当前激活分组到 ASR 上下文。
          </p>
        </div>
        <Badge variant="accent">激活分组：{activeGroup}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新增热词</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]" onSubmit={onCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="group">分组</Label>
              <Input
                id="group"
                placeholder="通用 / 编程 / 写作"
                value={groupInput}
                maxLength={32}
                onChange={(event) => setGroupInput(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="word">热词</Label>
              <Input
                id="word"
                placeholder="例如：DashScope"
                value={wordInput}
                maxLength={255}
                onChange={(event) => setWordInput(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus size={14} />
                {createMutation.isPending ? "添加中…" : "添加"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>已有热词</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-bg" />
              ))}
            </div>
          )}
          {isError && (
            <div className="space-y-3 text-sm text-red-300">
              <p>{extractErrorMessage(error, "加载失败")}</p>
              <Button size="sm" variant="secondary" onClick={() => refetch()}>
                重试
              </Button>
            </div>
          )}
          {!isLoading && !isError && grouped.length === 0 && (
            <p className="text-sm text-muted">还没有热词，添加第一个开始吧。</p>
          )}
          {!isLoading && !isError && grouped.length > 0 && (
            <div className="space-y-5">
              {grouped.map(([group, rows]) => {
                const isActive = group === activeGroup;
                return (
                  <div key={group} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">{group}</span>
                        <Badge variant="muted">{rows.length}</Badge>
                        {isActive && <Badge variant="accent">激活</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant={isActive ? "secondary" : "ghost"}
                        onClick={() => setActiveGroup(group)}
                        disabled={isActive}
                      >
                        <Star size={14} className={clsx(isActive && "text-accent")} />
                        {isActive ? "已激活" : "设为激活"}
                      </Button>
                    </div>
                    <ul className="divide-y divide-border rounded-md border border-border bg-bg">
                      {rows.map((row) => (
                        <li
                          key={row.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <span className="break-all text-slate-200">{row.word}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(row)}
                            disabled={deleteMutation.isPending}
                            aria-label={`删除 ${row.word}`}
                          >
                            <Trash2 size={14} />
                            删除
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
