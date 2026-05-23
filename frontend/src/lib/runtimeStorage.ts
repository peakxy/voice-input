type ChromeStorageArea = {
  get: (keys: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
};

type RuntimeLike = {
  storage?: {
    local?: ChromeStorageArea;
  };
};

function getChromeRuntime(): RuntimeLike | undefined {
  return (globalThis as typeof globalThis & { chrome?: RuntimeLike }).chrome;
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function readStoredValue(key: string): Promise<string | null> {
  const runtime = getChromeRuntime();
  const area = runtime?.storage?.local;
  if (area) {
    const items = await area.get(key);
    const value = items[key];
    return typeof value === "string" ? value : null;
  }
  const storage = getLocalStorage();
  return storage?.getItem(key) ?? null;
}

export async function writeStoredValue(key: string, value: string | null): Promise<void> {
  const runtime = getChromeRuntime();
  const area = runtime?.storage?.local;
  if (area) {
    if (value === null) {
      await area.remove(key);
    } else {
      await area.set({ [key]: value });
    }
    return;
  }
  const storage = getLocalStorage();
  if (!storage) return;
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
}
