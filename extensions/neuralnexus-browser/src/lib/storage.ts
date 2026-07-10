import type { ExtensionSettings } from "./messages.js";

declare const chrome: any;

const DEFAULT_SETTINGS: ExtensionSettings = {
  appUrl: "http://localhost:3000",
  token: "",
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(["appUrl", "token"]);
  return {
    appUrl: String(stored.appUrl || DEFAULT_SETTINGS.appUrl).replace(/\/$/, ""),
    token: String(stored.token || ""),
  };
}

export async function saveSettings(settings: ExtensionSettings) {
  await chrome.storage.local.set({
    appUrl: settings.appUrl.replace(/\/$/, ""),
    token: settings.token.trim(),
  });
}

export async function rememberLastCapture(value: unknown) {
  await chrome.storage.local.set({ lastCapture: value });
}

export async function getLastCapture<T>() {
  const stored = await chrome.storage.local.get(["lastCapture"]);
  return stored.lastCapture as T | undefined;
}
