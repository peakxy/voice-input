import { create } from "zustand";

import { api } from "@/lib/api";
import type { AuthResponse, LoginRequest, MeResponse, RegisterRequest } from "@/lib/types";

const TOKEN_KEY = "vi.token";
const USER_KEY = "vi.user";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthUser = { userId: number; username: string };

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  hydrate: () => void;
  setSession: (token: string, user: AuthUser) => void;
  login: (input: LoginRequest) => Promise<AuthUser>;
  register: (input: RegisterRequest) => Promise<AuthUser>;
  refreshMe: () => Promise<AuthUser | null>;
  logout: () => void;
};

function readStored(): { token: string | null; user: AuthUser | null } {
  if (typeof window === "undefined") return { token: null, user: null };
  const token = window.localStorage.getItem(TOKEN_KEY);
  const userRaw = window.localStorage.getItem(USER_KEY);
  let user: AuthUser | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as AuthUser;
    } catch {
      user = null;
    }
  }
  return { token, user };
}

function persist(token: string | null, user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  status: "idle",
  hydrate: () => {
    const { token, user } = readStored();
    set({
      token,
      user,
      status: token ? "authenticated" : "unauthenticated",
    });
  },
  setSession: (token, user) => {
    persist(token, user);
    set({ token, user, status: "authenticated" });
  },
  login: async (input) => {
    set({ status: "loading" });
    const { data } = await api.post<AuthResponse>("/api/auth/login", input);
    const user: AuthUser = { userId: data.userId, username: data.username };
    persist(data.token, user);
    set({ token: data.token, user, status: "authenticated" });
    return user;
  },
  register: async (input) => {
    set({ status: "loading" });
    const { data } = await api.post<AuthResponse>("/api/auth/register", input);
    const user: AuthUser = { userId: data.userId, username: data.username };
    persist(data.token, user);
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
      persist(token, user);
      set({ user, status: "authenticated" });
      return user;
    } catch {
      persist(null, null);
      set({ token: null, user: null, status: "unauthenticated" });
      return null;
    }
  },
  logout: () => {
    persist(null, null);
    set({ token: null, user: null, status: "unauthenticated" });
  },
}));
