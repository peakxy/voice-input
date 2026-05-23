import { api } from "@/lib/api";
import type { TranscriptResponse } from "@/lib/types";

export const TRANSCRIPTS_QUERY_KEY = ["transcripts"] as const;

export async function listTranscripts(): Promise<TranscriptResponse[]> {
  const { data } = await api.get<TranscriptResponse[]>("/api/transcripts");
  return data;
}
