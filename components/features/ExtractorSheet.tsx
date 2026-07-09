"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";

export function ExtractorSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (projectId: string) => void }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"input" | "working" | "done" | "error">("input");
  const [message, setMessage] = useState("");
  const stages = ["Reading your material", "Extracting your method", "Building skills", "Assembling workspace"];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (status !== "working") return;
    const id = setInterval(() => setStage((value) => Math.min(stages.length - 1, value + 1)), 1800);
    return () => clearInterval(id);
  }, [status]);
  if (!open) return null;
  const build = async () => {
    setStatus("working");
    window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "thinking" } }));
    const res = await fetch("/api/extractor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    const data = await res.json();
    if (!res.ok) { setStatus("error"); setMessage(data.message || data.error || "Extractor failed."); return; }
    setStatus("done");
    setMessage(`${data.workspaceName} is ready — ${data.stepCount} steps · ${data.skillCount} skills`);
    window.dispatchEvent(new CustomEvent("nexus:orb", { detail: { state: "success" } }));
    setTimeout(() => onDone(data.projectId), 900);
  };
  return (
    <div className="feature-sheet-backdrop" role="dialog" aria-modal="true">
      <div className="feature-sheet extractor-sheet">
        <div className="floating-wizard-head"><span>INSTANT WORKSPACE</span><button onClick={onClose}><X size={15} /></button></div>
        {status === "input" && <>
          <h2>Drop your method. Get a running system.</h2>
          <p>Steps, skills and knowledge — extracted from your material, not invented.</p>
          <label className="file-drop-zone"><Upload size={20} /><span>Drop .pdf .txt .md</span><input type="file" accept=".pdf,.txt,.md" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file && file.type.startsWith("text")) void file.text().then(setText);
            else if (file) setMessage("PDF extraction needs an Anthropic or OpenRouter key. Paste the text instead.");
          }} /></label>
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="...or paste your method, framework or prompt pack" rows={8} />
          {message && <p>{message}</p>}
          <button className="primary-pill" disabled={!text.trim()} onClick={build}>Build workspace</button>
        </>}
        {status === "working" && <h2>{stages[stage]}</h2>}
        {status === "done" && <h2>{message}</h2>}
        {status === "error" && <><h2>{message}</h2><button className="secondary-pill" onClick={() => setStatus("input")}>Retry</button></>}
      </div>
    </div>
  );
}
