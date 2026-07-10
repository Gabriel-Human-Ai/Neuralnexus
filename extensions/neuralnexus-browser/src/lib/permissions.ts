declare const chrome: any;

export async function requestCurrentOriginPermission(tabUrl?: string) {
  if (!tabUrl) return false;
  const origin = new URL(tabUrl).origin + "/*";
  return chrome.permissions.request({ origins: [origin] });
}
