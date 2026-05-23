import { readStoredValue, writeStoredValue } from "@/lib/runtimeStorage";

export type AuthUser = {
  userId: number;
  username: string;
};

export type AuthSnapshot = {
  token: string | null;
  user: AuthUser | null;
};

const TOKEN_KEY = "vi.token";
const USER_KEY = "vi.user";

function parseUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.userId !== "number" || typeof parsed.username !== "string") {
      return null;
    }
    return { userId: parsed.userId, username: parsed.username };
  } catch {
    return null;
  }
}

export async function readAuthSnapshot(): Promise<AuthSnapshot> {
  const [token, userRaw] = await Promise.all([
    readStoredValue(TOKEN_KEY),
    readStoredValue(USER_KEY),
  ]);
  return {
    token,
    user: parseUser(userRaw),
  };
}

export async function writeAuthSnapshot(snapshot: AuthSnapshot): Promise<void> {
  await Promise.all([
    writeStoredValue(TOKEN_KEY, snapshot.token),
    writeStoredValue(USER_KEY, snapshot.user ? JSON.stringify(snapshot.user) : null),
  ]);
}
