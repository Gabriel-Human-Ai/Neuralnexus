import type { CaptureAction, CapturePayload, CaptureType, PageCapture } from "./messages.js";
import { sanitizeText, sanitizeUrl } from "./sanitize.js";

declare const chrome: any;

function pageExtractor(): PageCapture {
  const selection = window.getSelection()?.toString() || "";
  const bodyText = document.body?.innerText || "";
  return {
    title: document.title || "",
    sourceUrl: location.href,
    text: selection || bodyText.slice(0, 12000),
  };
}

export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function capturePage(captureType: CaptureType, action: CaptureAction): Promise<CapturePayload> {
  const tab = await getActiveTab();
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: pageExtractor,
  });
  return {
    title: sanitizeText(result?.title || tab.title || "", 180),
    sourceUrl: sanitizeUrl(result?.sourceUrl || tab.url || ""),
    text: sanitizeText(result?.text || ""),
    captureType,
    action,
  };
}

export async function captureVisibleScreenshot(action: CaptureAction): Promise<CapturePayload> {
  const tab = await getActiveTab();
  const page = await capturePage("screenshot", action);
  const screenshotData = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  return {
    ...page,
    text: page.text.slice(0, 1200),
    screenshotData,
  };
}

export function payloadFromSelection(selectionText: string, pageUrl: string, title: string, action: CaptureAction): CapturePayload {
  return {
    title: sanitizeText(title, 180),
    sourceUrl: sanitizeUrl(pageUrl),
    text: sanitizeText(selectionText),
    captureType: "selection",
    action,
  };
}
