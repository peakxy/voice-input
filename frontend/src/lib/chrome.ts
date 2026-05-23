type RuntimeMessageListener = (
  message: unknown,
  sender: { tab?: { id?: number } },
  sendResponse: (response?: unknown) => void,
) => void | boolean;

type ChromeRuntime = {
  onMessage?: {
    addListener: (listener: RuntimeMessageListener) => void;
  };
  sendMessage: (message: unknown) => Promise<unknown>;
  getURL: (path: string) => string;
};

type ChromeTabs = {
  query: (queryInfo: { active?: boolean; currentWindow?: boolean }) => Promise<Array<{ id?: number }>>;
  sendMessage: (tabId: number, message: unknown) => Promise<unknown>;
};

type ChromeSidePanel = {
  open: (options: { tabId: number }) => Promise<void>;
};

type ChromeCommands = {
  onCommand: {
    addListener: (listener: (command: string) => void) => void;
  };
};

type ChromeOffscreen = {
  createDocument: (options: {
    url: string;
    reasons: string[];
    justification: string;
  }) => Promise<void>;
  hasDocument?: () => Promise<boolean>;
};

export type ChromeApi = {
  runtime?: ChromeRuntime;
  tabs?: ChromeTabs;
  sidePanel?: ChromeSidePanel;
  commands?: ChromeCommands;
  offscreen?: ChromeOffscreen;
  storage?: {
    local?: {
      get: (keys: string | string[] | null) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
  };
};

export function getChrome(): ChromeApi | undefined {
  return (globalThis as typeof globalThis & { chrome?: ChromeApi }).chrome;
}

export async function queryActiveTabId(): Promise<number | null> {
  const chrome = getChrome();
  const [activeTab] = (await chrome?.tabs?.query({ active: true, currentWindow: true })) ?? [];
  return activeTab?.id ?? null;
}

export async function openSidePanelForCurrentTab(): Promise<boolean> {
  const chrome = getChrome();
  const tabId = await queryActiveTabId();
  if (!chrome?.sidePanel || tabId === null) return false;
  await chrome.sidePanel.open({ tabId });
  return true;
}
