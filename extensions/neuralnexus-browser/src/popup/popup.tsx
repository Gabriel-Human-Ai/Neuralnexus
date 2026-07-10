import { actionSelectorHtml } from "../components/ActionSelector.js";
import { captureChooserHtml } from "../components/CaptureChooser.js";
import { consentNoticeHtml } from "../components/ConsentNotice.js";
import { capturePreviewHtml } from "../components/CapturePreview.js";
import { sendCapture } from "../lib/api.js";
import { capturePage, captureVisibleScreenshot } from "../lib/capture.js";
import type { CaptureAction, CaptureResponse } from "../lib/messages.js";
import { getSettings, rememberLastCapture, saveSettings } from "../lib/storage.js";
import { summarizeError } from "../lib/sanitize.js";

const app = document.getElementById("app")!;
let lastResponse: CaptureResponse | undefined;

render();

async function render(status = "") {
  const settings = await getSettings();
  app.innerHTML = `
    <header>
      <h1>NeuralNexus Capture</h1>
      <p>Capture only what you choose. Review, save or verify it in NeuralNexus.</p>
    </header>
    <label class="field"><span>App URL</span><input id="app-url" value="${settings.appUrl}" /></label>
    <label class="field"><span>Capture token</span><input id="token" type="password" value="${settings.token}" placeholder="nnx_..." /></label>
    <button id="save-settings">Save connection</button>
    ${actionSelectorHtml("save_reference")}
    ${captureChooserHtml()}
    ${capturePreviewHtml(lastResponse)}
    ${consentNoticeHtml()}
    <div class="status">${status}</div>
  `;
  bind();
}

function bind() {
  document.getElementById("save-settings")?.addEventListener("click", async () => {
    await saveSettings({
      appUrl: (document.getElementById("app-url") as HTMLInputElement).value,
      token: (document.getElementById("token") as HTMLInputElement).value,
    });
    await render("Connection saved.");
  });
  document.getElementById("capture-selection")?.addEventListener("click", () => void runCapture("selection"));
  document.getElementById("capture-page")?.addEventListener("click", () => void runCapture("page"));
  document.getElementById("capture-screenshot")?.addEventListener("click", () => void runCapture("screenshot"));
}

async function runCapture(type: "selection" | "page" | "screenshot") {
  try {
    await render("Capturing by explicit action...");
    const action = (document.getElementById("capture-action") as HTMLSelectElement)?.value as CaptureAction || "save_reference";
    const payload = type === "screenshot" ? await captureVisibleScreenshot(action) : await capturePage(type, action);
    lastResponse = await sendCapture(payload);
    await rememberLastCapture(lastResponse);
    await render(lastResponse.error || "Saved to NeuralNexus.");
  } catch (error) {
    await render(summarizeError(error));
  }
}
