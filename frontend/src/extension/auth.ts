import { readAuthSnapshot, type AuthSnapshot } from "@/lib/authSession";
import { getChrome } from "@/lib/chrome";

type BackgroundAuthSnapshotResponse =
  | { ok: true; snapshot: AuthSnapshot }
  | { ok: false; error: string };

function isBackgroundAuthSnapshotResponse(
  value: unknown,
): value is Extract<BackgroundAuthSnapshotResponse, { ok: true }> {
  return (
    !!value &&
    typeof value === "object" &&
    "ok" in value &&
    (value as { ok?: unknown }).ok === true &&
    "snapshot" in value
  );
}

export async function readBackgroundAuthSnapshot(): Promise<AuthSnapshot | null> {
  const chrome = getChrome();
  if (!chrome?.runtime?.sendMessage) {
    return null;
  }

  try {
    const response = (await chrome.runtime.sendMessage({
      target: "background",
      type: "auth-get-snapshot",
    })) as unknown;
    if (!isBackgroundAuthSnapshotResponse(response)) {
      return null;
    }
    return response.snapshot;
  } catch {
    return null;
  }
}

export async function readExtensionAuthSnapshot(): Promise<AuthSnapshot> {
  const snapshot = await readBackgroundAuthSnapshot();
  if (snapshot) {
    return snapshot;
  }
  return readAuthSnapshot();
}
