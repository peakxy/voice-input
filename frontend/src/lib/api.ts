import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import { readAuthSnapshot } from "@/lib/authSession";
import { useAuthStore } from "@/stores/auth";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().token ?? (await readAuthSnapshot()).token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      const { token, logout } = useAuthStore.getState();
      if (token) {
        logout();
      }
    }
    return Promise.reject(error);
  },
);

export function extractErrorMessage(err: unknown, fallback = "请求失败"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function buildWsUrl(token: string): string {
  const base = baseURL.replace(/\/$/, "");
  const wsBase = base.replace(/^http/, "ws");
  return `${wsBase}/ws/transcript?token=${encodeURIComponent(token)}`;
}

export type RequestConfig = AxiosRequestConfig;
