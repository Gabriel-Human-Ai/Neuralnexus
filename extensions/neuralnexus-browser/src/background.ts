import { sendCapture } from "./lib/api.js";
import { payloadFromSelection } from "./lib/capture.js";
import type { CaptureAction } from "./lib/messages.js";
import { rememberLastCapture } from "./lib/storage.js";

declare const chrome: any;

const MENU_ITEMS: { id: string; title: string; action: CaptureAction }[] = [
  { id: "nnx-save-selection", title: "Save selection to NeuralNexus", action: "save_reference" },
  { id: "nnx-review-selection", title: "Review selection with NeuralNexus", action: "review" },
  { id: "nnx-verify-selection", title: "Verify selected claims", action: "verify" },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create({
        id: item.id,
        title: item.title,
        contexts: ["selection"],
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
  const item = MENU_ITEMS.find((entry) => entry.id === info.menuItemId);
  if (!item || !info.selectionText) return;
  const payload = payloadFromSelection(info.selectionText, info.pageUrl || tab?.url || "", tab?.title || "", item.action);
  const response = await sendCapture(payload);
  await rememberLastCapture(response);
  if (chrome.sidePanel?.open && tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId });
});
