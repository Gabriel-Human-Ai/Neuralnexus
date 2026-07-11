"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { CopyButton } from "@/components/ui/CopyButton";

type Dimension = "address_and_tone" | "answer_style" | "working_style" | "visual_taste";
type ProfileResponse = {
  counts: Record<Dimension, number>;
  totalSignals: number;
};

const labels: Record<Dimension, string> = {
  address_and_tone: "Address and tone",
  answer_style: "Answer style",
  working_style: "Working style",
  visual_taste: "Visual taste",
};

export function ProfileExport() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void fetch("/api/profile").then((response) => response.ok ? response.json() : null).then((value) => value && setProfile(value));
  }, []);

  async function exportProfile() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/profile/export", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setNotice(payload.message || "Your profile is not ready to export yet.");
        if (payload.counts) setProfile({ counts: payload.counts, totalSignals: payload.totalSignals ?? 0 });
        return;
      }
      setText(payload.text || "");
      setProfile((current) => current ? { ...current, counts: payload.counts, totalSignals: payload.totalSignals } : current);
      setNotice("Profile block ready.");
    } catch {
      setNotice("Profile export is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-export" aria-labelledby="profile-export-title">
      <div className="profile-export-head">
        <div>
          <span className="object-label">PROFILE EXPORT</span>
          <h2 id="profile-export-title">Give your other AIs a head start.</h2>
          <p>Generate one concise instruction block from the preferences NeuralNexus has actually learned.</p>
        </div>
        <button className="primary-pill profile-export-action" type="button" onClick={() => void exportProfile()} disabled={busy}>
          {busy ? <span className="profile-export-spinner" aria-hidden="true" /> : <Sparkles size={16} />}
          {busy ? "Writing profile" : "Generate profile block"}
        </button>
      </div>

      <div className="profile-signal-grid" aria-label="Profile signal counts">
        {(Object.keys(labels) as Dimension[]).map((dimension) => (
          <div key={dimension}>
            <span>{labels[dimension]}</span>
            <strong>{profile?.counts[dimension] ?? 0}</strong>
          </div>
        ))}
      </div>

      {text ? (
        <div className="profile-export-result">
          <textarea value={text} onChange={(event) => setText(event.target.value)} aria-label="Generated profile instruction" />
          <div className="profile-export-result-actions">
            <small>Paste it into an AI assistant&apos;s custom instructions or system prompt.</small>
            <CopyButton text={text} label="Copy profile" />
          </div>
        </div>
      ) : (
        <p className="profile-export-hint">Your profile is yours to inspect, edit and carry to another AI. Nothing is sent anywhere until you choose to generate this block.</p>
      )}
      {notice && <p className="profile-export-notice" role="status">{notice}</p>}
      {text && <Check className="profile-export-check" size={16} aria-hidden="true" />}
    </section>
  );
}

