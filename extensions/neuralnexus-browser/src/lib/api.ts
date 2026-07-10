import type { CaptureDecision, CapturePayload, CaptureResponse } from "./messages.js";
import { getSettings } from "./storage.js";

export async function sendCapture(payload: CapturePayload): Promise<CaptureResponse> {
  const settings = await getSettings();
  if (!settings.token) return { error: "Add your NeuralNexus capture token first." };
  const res = await fetch(`${settings.appUrl}/api/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-neuralnexus-extension-token": settings.token,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendDecision(captureId: string, decision: CaptureDecision, note = "", indexEligible = false) {
  const settings = await getSettings();
  const res = await fetch(`${settings.appUrl}/api/capture/${captureId}/decision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-neuralnexus-extension-token": settings.token,
    },
    body: JSON.stringify({ decision, note, indexEligible }),
  });
  return res.json();
}
