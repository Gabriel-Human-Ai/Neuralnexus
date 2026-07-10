import type { CaptureDecision } from "../lib/messages.js";

const decisions: { value: CaptureDecision; label: string }[] = [
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "revise", label: "Revise" },
  { value: "keep", label: "Keep" },
  { value: "mark_wrong", label: "Mark wrong" },
];

export function resultPreviewHtml(captureId?: string) {
  if (!captureId) return "";
  return `
    <section class="decisions">
      <span>Decision creates a private Vault signal</span>
      <div>
        ${decisions.map((item) => `<button data-decision="${item.value}">${item.label}</button>`).join("")}
      </div>
      <textarea id="decision-note" placeholder="Optional note"></textarea>
    </section>
  `;
}
