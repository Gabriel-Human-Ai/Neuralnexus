import { getSettings, saveSettings } from "./storage.js";

export async function isConfigured() {
  const settings = await getSettings();
  return Boolean(settings.appUrl && settings.token);
}

export async function configure(appUrl: string, token: string) {
  await saveSettings({ appUrl, token });
  return isConfigured();
}
