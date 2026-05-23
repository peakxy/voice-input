import { create } from "zustand";

import { api } from "@/lib/api";
import { readAuthSnapshot, type AuthUser, writeAuthSnapshot } from "@/lib/authSession";
import type { AuthResponse, LoginRequest, MeResponse, RegisterRequest } from "@/lib/types";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: AuthUser) => void;
  login: (input: LoginRequest) => Promise<AuthUser>;
  register: (input: RegisterRequest) => Promise<AuthUser>;
  refreshMe: () => Promise<AuthUser | null>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  status: "idle",
  hydrate: async () => {
    const { token, user } = await readAuthSnapshot();
    set({
      token,
      user,
      status: token ? "authenticated" : "unauthenticated",
    });
  },
  setSession: (token, user) => {
    void writeAuthSnapshot({ token, user });
    set({ token, user, status: "authenticated" });
  },
  login: async (input) => {
    set({ status: "loading" });
    const { data } = await api.post<AuthResponse>("/api/auth/login", input);
    const user: AuthUser = { userId: data.userId, username: data.username };
    await writeAuthSnapshot({ token: data.token, user });
    set({ token: data.token, user, status: "authenticated" });
    return user;
  },
  register: async (input) => {
    set({ status: "loading" });
    const { data } = await api.post<AuthResponse>("/api/auth/register", input);
    const user: AuthUser = { userId: data.userId, username: data.username };
    await writeAuthSnapshot({ token: data.token, user });
    set({ token: data.token, user, status: "authenticated" });
    return user;
  },
  refreshMe: async () => {
    const token = get().token;
    if (!token) {
      set({ status: "unauthenticated" });
      return null;
    }
    try {
      const { data } = await api.get<MeResponse>("/api/me");
      const user: AuthUser = { userId: data.userId, username: data.username };
      await writeAuthSnapshot({ token, user });
      set({ user, status: "authenticated" });
      return user;
    } catch {
      await writeAuthSnapshot({ token: null, user: null });
      set({ token: null, user: null, status: "unauthenticated" });
      return null;
    }
  },
  logout: () => {
    void writeAuthSnapshot({ token: null, user: null });
    set({ token: null, user: null, status: "unauthenticated" });
  },
}));
