import { consentNoticeHtml } from "../components/ConsentNotice.js";
import { capturePreviewHtml } from "../components/CapturePreview.js";
import { resultPreviewHtml } from "../components/ResultPreview.js";
import { sendDecision } from "../lib/api.js";
import type { CaptureDecision, CaptureResponse } from "../lib/messages.js";
import { getLastCapture, rememberLastCapture } from "../lib/storage.js";
import { summarizeError } from "../lib/sanitize.js";

const app = document.getElementById("app")!;
let lastResponse: CaptureResponse | undefined;

void render();

async function render(status = "") {
  lastResponse = await getLastCapture<CaptureResponse>();
  const captureId = lastResponse?.capture?.id;
  app.innerHTML = `
    <header>
      <h1>Capture result</h1>
      <p>Make one explicit decision. That creates a private Vault signal.</p>
    </header>
    ${capturePreviewHtml(lastResponse)}
    ${resultPreviewHtml(captureId)}
    ${consentNoticeHtml()}
    <div class="status">${status}</div>
  `;
  bind(captureId);
}

function bind(captureId?: string) {
  if (!captureId) return;
  document.querySelectorAll<HTMLButtonElement>("[data-decision]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const note = (document.getElementById("decision-note") as HTMLTextAreaElement)?.value || "";
        const result = await sendDecision(captureId, button.dataset.decision as CaptureDecision, note, false);
        await rememberLastCapture({ ...lastResponse, decisionResult: result });
        await render(result.error || "Decision saved privately.");
      } catch (error) {
        await render(summarizeError(error));
      }
    });
  });
}
