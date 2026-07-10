import type { CaptureAction } from "../lib/messages.js";

export const CAPTURE_ACTION_LABELS: Record<CaptureAction, string> = {
  save_reference: "Save reference",
  review: "Review this",
  compare: "Compare option",
  verify: "Verify claims",
  preflight: "Run preflight",
};

export function actionSelectorHtml(selected: CaptureAction) {
  return `
    <label class="field">
      <span>Action</span>
      <select id="capture-action">
        ${Object.entries(CAPTURE_ACTION_LABELS).map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
  `;
}
