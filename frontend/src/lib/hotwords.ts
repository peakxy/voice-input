import { api } from "@/lib/api";
import type { HotwordRequest, HotwordResponse } from "@/lib/types";

export const HOTWORDS_QUERY_KEY = ["hotwords"] as const;

export async function listHotwords(): Promise<HotwordResponse[]> {
  const { data } = await api.get<HotwordResponse[]>("/api/hotwords");
  return data;
}

export async function createHotword(request: HotwordRequest): Promise<HotwordResponse> {
  const { data } = await api.post<HotwordResponse>("/api/hotwords", request);
  return data;
}

export async function deleteHotword(id: number): Promise<void> {
  await api.delete(`/api/hotwords/${id}`);
}
