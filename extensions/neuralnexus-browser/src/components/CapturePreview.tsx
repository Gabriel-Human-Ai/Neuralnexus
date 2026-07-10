import type { CaptureResponse } from "../lib/messages.js";

export function capturePreviewHtml(response?: CaptureResponse) {
  if (!response?.capture) return `<section class="preview muted">No capture yet.</section>`;
  const capture = response.capture;
  return `
    <section class="preview">
      <span>${capture.captureType} · ${capture.action}</span>
      <strong>${escapeHtml(capture.title || capture.sourceHost || "Captured reference")}</strong>
      <p>${escapeHtml(capture.summary)}</p>
    </section>
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}
