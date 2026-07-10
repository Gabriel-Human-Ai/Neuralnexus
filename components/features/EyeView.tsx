"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronRight, Image as ImageIcon, Link, Sparkles, Upload, X } from "lucide-react";
import { AuraCard } from "@/components/ui/AuraCard";
import { RollingNumber } from "@/components/ui/RollingNumber";

const CONTEXTS = ["design", "copy", "product", "content", "brand", "review", "coaching", "audit", "research", "general"] as const;

type Rule = { id: string; contextTag: string; text: string; confidence: number; status: "proposed" | "active" | "rejected"; createdAt: string };
type DecisionStats = { total: number; bySource: Record<string, number>; latest: { id: string; source: string; medium: string; chosen: string; rejected: string }[] };
type Artifact = { type: "text" | "image"; text?: string; descriptor?: string; preview?: string; label?: string };

export function EyeView() {
  const [contextTag, setContextTag] = useState("design");
  const [stats, setStats] = useState<DecisionStats>({ total: 0, bySource: {}, latest: [] });
  const [rules, setRules] = useState<Rule[]>([]);
  const [verdictText, setVerdictText] = useState("");
  const [verdictUrl, setVerdictUrl] = useState("");
  const [verdictArtifact, setVerdictArtifact] = useState<Artifact | null>(null);
  const [verdict, setVerdict] = useState<any>(null);
  const [verdictError, setVerdictError] = useState("");
  const [verdictBusy, setVerdictBusy] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");
  const [overrideSaved, setOverrideSaved] = useState(false);
  const [curationItems, setCurationItems] = useState<Artifact[]>([]);
  const [curation, setCuration] = useState<any>(null);
  const [curationError, setCurationError] = useState("");
  const [duel, setDuel] = useState<[Artifact | null, Artifact | null]>([null, null]);
  const [duelWinner, setDuelWinner] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("");

  const proposed = rules.filter((rule) => rule.status === "proposed");
  const active = rules.filter((rule) => rule.status === "active");
  const immature = stats.total < 20 || active.length < 1;
  const needed = Math.max(0, 20 - stats.total);

  const refresh = useCallback(async () => {
    const [decisionsRes, rulesRes] = await Promise.all([
      fetch(`/api/eye/decisions?contextTag=${encodeURIComponent(contextTag)}`),
      fetch(`/api/eye/rules?contextTag=${encodeURIComponent(contextTag)}`),
    ]);
    if (decisionsRes.ok) setStats(await decisionsRes.json());
    if (rulesRes.ok) setRules((await rulesRes.json()).rules ?? []);
  }, [contextTag]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && duel[0] && duel[1]) void pickDuel(0);
      if (event.key === "ArrowRight" && duel[0] && duel[1]) void pickDuel(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duel]);

  async function describeFile(file: File): Promise<Artifact> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use JPEG, PNG or WebP.");
    if (file.size > 6 * 1024 * 1024) throw new Error("Image too large (max 6MB).");
    const dataUrl = await readAsDataUrl(file);
    const res = await fetch("/api/eye/describe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUrl, mediaType: file.type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not describe image.");
    return { type: "image", descriptor: data.descriptor, preview: URL.createObjectURL(file), label: file.name };
  }

  function textArtifact(text: string): Artifact {
    return { type: "text", text: text.trim(), label: text.trim().slice(0, 60) || "Text option" };
  }

  async function addCurationText() {
    const text = window.prompt("Paste one option");
    if (!text?.trim()) return;
    setCurationItems((items) => [...items, textArtifact(text)].slice(0, 6));
  }

  async function handleImage(file: File | undefined, target: "verdict" | "curation" | 0 | 1) {
    if (!file) return;
    try {
      setMessage("Describing image");
      const artifact = await describeFile(file);
      if (target === "verdict") setVerdictArtifact(artifact);
      else if (target === "curation") setCurationItems((items) => [...items, artifact].slice(0, 6));
      else setDuel((items) => target === 0 ? [artifact, items[1]] : [items[0], artifact]);
      setMessage("");
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  async function judgeArtifact() {
    setVerdictBusy(true);
    setVerdict(null);
    setVerdictError("");
    try {
      const body = verdictUrl.trim()
        ? { contextTag, url: verdictUrl.trim() }
        : verdictArtifact?.type === "image"
          ? { contextTag, imageDescriptor: verdictArtifact.descriptor }
          : { contextTag, text: verdictArtifact?.text || verdictText };
      const res = await fetch("/api/eye/verdict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "eye_immature") setVerdictError(`The Eye needs ${Math.max(0, data.needed - data.decisions)} more decisions in this context before it judges. Train it in The Duel below.`);
        else setVerdictError(data.error || "The Eye could not judge this.");
      } else setVerdict(data);
    } finally {
      setVerdictBusy(false);
    }
  }

  async function saveOverride() {
    if (!verdict) return;
    const artifact = verdictArtifact?.descriptor || verdictArtifact?.text || verdictText || verdictUrl;
    const firstReason = verdict.reasons?.[0]?.text ?? "";
    await fetch("/api/eye/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextTag, chosen: { text: artifact }, rejected: { text: `EYE VERDICT: ${verdict.verdict} — ${firstReason}` }, medium: verdictArtifact?.type === "image" ? "image" : "text", source: "verdict-override", note: overrideNote }),
    });
    setOverrideSaved(true);
    setTimeout(() => setOverrideSaved(false), 900);
    setOverrideNote("");
    await refresh();
  }

  async function rankOptions() {
    setCuration(null);
    setCurationError("");
    const type = curationItems[0]?.type;
    if (!type || curationItems.length < 2) {
      setCurationError("Curation needs at least two options.");
      return;
    }
    if (curationItems.some((item) => item.type !== type)) {
      setCurationError("Curation options must be the same type.");
      return;
    }
    const res = await fetch("/api/eye/curate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contextTag, items: curationItems.map((item) => item.type === "image" ? { imageDescriptor: item.descriptor } : { text: item.text }) }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data.error === "eye_immature") setCurationError(`The Eye needs ${Math.max(0, data.needed - data.decisions)} more decisions in this context before it ranks.`);
      else setCurationError(data.error || "The Eye could not rank options.");
      return;
    }
    setCuration(data);
  }

  async function chooseCuration(index: number) {
    if (!curation?.ranking?.length) return;
    const topIndex = curation.ranking[0].index;
    const rejectedIndex = index === topIndex ? curation.ranking[1]?.index : topIndex;
    const chosen = curationItems[index];
    const rejected = curationItems[rejectedIndex];
    await postDecision(chosen, rejected, "curation");
    await refresh();
  }

  async function setRule(rule: Rule, action: "accept" | "reject") {
    await fetch(`/api/eye/rules/${rule.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    await refresh();
  }

  async function pickDuel(index: number) {
    if (!duel[0] || !duel[1]) return;
    const chosen = duel[index];
    const rejected = duel[index === 0 ? 1 : 0];
    if (!chosen || !rejected) return;
    setDuelWinner(index);
    await postDecision(chosen, rejected, "duel");
    setStreak((value) => value + 1);
    await refresh();
    window.setTimeout(() => {
      setDuel([null, null]);
      setDuelWinner(null);
    }, 350);
  }

  async function postDecision(chosen: Artifact, rejected: Artifact, source: string) {
    await fetch("/api/eye/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contextTag,
        chosen: chosen.type === "image" ? { descriptor: chosen.descriptor } : { text: chosen.text },
        rejected: rejected.type === "image" ? { descriptor: rejected.descriptor } : { text: rejected.text },
        medium: chosen.type,
        source,
      }),
    });
  }

  const maturityLine = immature ? `(${stats.total}/20 unlocks verdicts)` : "Verdicts unlocked";

  return (
    <div className="screen-stack eye-screen">
      <header className="screen-header eye-header">
        <div>
          <span className="eyebrow">THE EYE</span>
          <h1>Your judgment, executable</h1>
          <p>It learns from every decision — and only judges what it has earned.</p>
        </div>
        <select value={contextTag} onChange={(event) => setContextTag(event.target.value)} aria-label="Eye context">
          {CONTEXTS.map((context) => <option key={context} value={context}>{context}</option>)}
        </select>
      </header>

      <section className="eye-profile-strip">
        <span><RollingNumber value={stats.total} /> decisions</span>
        <span><RollingNumber value={active.length} /> active rules</span>
        <span><RollingNumber value={proposed.length} /> proposed</span>
        <div>{CONTEXTS.map((context) => <button key={context} className={contextTag === context ? "is-active" : ""} onClick={() => setContextTag(context)}>{context}</button>)}</div>
      </section>

      <AuraCard variant="plain" className="eye-panel eye-rules-panel">
        <div className="section-head"><span>TASTE RULES</span><small>{maturityLine}</small></div>
        {rules.length === 0 ? (
          <p className="eye-empty">No taste rules yet. Every duel, pick and edit teaches the Eye.</p>
        ) : (
          <div className="eye-rule-list">
            {proposed.map((rule) => <RuleRow key={rule.id} rule={rule} onAccept={() => setRule(rule, "accept")} onReject={() => setRule(rule, "reject")} />)}
            {active.map((rule) => <RuleRow key={rule.id} rule={rule} active onReject={() => setRule(rule, "reject")} />)}
          </div>
        )}
      </AuraCard>

      <section className="eye-two-col">
        <AuraCard variant="bloom" className="eye-panel eye-verdict-card">
          <div className="section-head"><span>VERDICT</span><small>APPROVE / REVISE / KILL</small></div>
          <div className="eye-drop">
            <textarea value={verdictText} onChange={(event) => { setVerdictText(event.target.value); setVerdictArtifact(textArtifact(event.target.value)); }} placeholder="Paste text to judge" />
            <div className="eye-url-row"><Link size={15} /><input value={verdictUrl} onChange={(event) => setVerdictUrl(event.target.value)} placeholder="Or paste a URL" /></div>
            <label className="secondary-pill eye-upload"><Upload size={15} /> Drop image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleImage(event.target.files?.[0], "verdict")} /></label>
            {verdictArtifact?.preview && <img className="eye-preview" src={verdictArtifact.preview} alt="" />}
          </div>
          <button className="primary-pill" onClick={judgeArtifact} disabled={verdictBusy || (!verdictText.trim() && !verdictArtifact && !verdictUrl.trim())}>{verdictBusy ? "Judging" : "Ask The Eye"} <ChevronRight size={16} /></button>
          {verdictError && <ImmatureState message={verdictError} total={stats.total} />}
          {verdict && <VerdictResult verdict={verdict} overrideNote={overrideNote} setOverrideNote={setOverrideNote} onSave={saveOverride} saved={overrideSaved} />}
        </AuraCard>

        <AuraCard variant="leak" className="eye-panel eye-curation-card">
          <div className="section-head"><span>CURATION</span><small>Rank option sets</small></div>
          <div className="eye-option-actions">
            <button className="secondary-pill" onClick={addCurationText}>Add text</button>
            <label className="secondary-pill"><ImageIcon size={15} /> Add image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handleImage(event.target.files?.[0], "curation")} /></label>
          </div>
          <div className="eye-options-tray">
            {curationItems.map((item, index) => <OptionCard key={index} item={item} index={index} onRemove={() => setCurationItems((items) => items.filter((_, i) => i !== index))} onPick={curation ? () => chooseCuration(index) : undefined} top={curation?.ranking?.[0]?.index === index} />)}
          </div>
          <button className="primary-pill" onClick={rankOptions} disabled={curationItems.length < 2}>Rank by my Eye <ChevronRight size={16} /></button>
          {curationError && <ImmatureState message={curationError} total={stats.total} />}
          {curation?.ranking?.length > 0 && (
            <div className="eye-ranking">
              <p>Which would YOU ship?</p>
              {curation.ranking.map((row: any, rank: number) => (
                <button key={`${row.index}-${rank}`} onClick={() => chooseCuration(row.index)}>
                  <strong>{rank + 1}</strong>
                  <span>{rank === 0 && <em>TOP PICK</em>} Option {row.index + 1}</span>
                  <small>{row.reason}</small>
                </button>
              ))}
            </div>
          )}
        </AuraCard>
      </section>

      <AuraCard variant="bloom" className="eye-panel eye-duel-card">
        <div className="section-head"><span>THE DUEL</span><small>Streak: <RollingNumber value={streak} /> · {maturityLine}</small></div>
        <div className="eye-duel-grid">
          {[0, 1].map((slot) => (
            <DuelSlot key={slot} artifact={duel[slot as 0 | 1]} winner={duelWinner === slot} faded={duelWinner !== null && duelWinner !== slot} onText={() => {
              const text = window.prompt(`Paste option ${slot + 1}`);
              if (text?.trim()) setDuel((items) => slot === 0 ? [textArtifact(text), items[1]] : [items[0], textArtifact(text)]);
            }} onImage={(file) => void handleImage(file, slot as 0 | 1)} onPick={() => pickDuel(slot)} ready={Boolean(duel[0] && duel[1])} />
          ))}
        </div>
      </AuraCard>
      {message && <div className="eye-toast">{message}</div>}
    </div>
  );
}

function RuleRow({ rule, active, onAccept, onReject }: { rule: Rule; active?: boolean; onAccept?: () => void; onReject: () => void }) {
  return (
    <article className="eye-rule-row">
      <span>{active ? "ACTIVE" : "PROPOSED"}</span>
      <p>{rule.text}</p>
      <small>Backed by {rule.confidence} decisions</small>
      <div>
        {!active && <button onClick={onAccept}>Accept</button>}
        <button onClick={onReject}>{active ? "Remove" : "Reject"}</button>
      </div>
    </article>
  );
}

function VerdictResult({ verdict, overrideNote, setOverrideNote, onSave, saved }: { verdict: any; overrideNote: string; setOverrideNote: (value: string) => void; onSave: () => void; saved: boolean }) {
  return (
    <div className={`eye-verdict-result is-${verdict.verdict}`}>
      <h2>{String(verdict.verdict).toUpperCase()} <small>{verdict.confidence}</small></h2>
      <div className="eye-reasons">
        {(verdict.reasons ?? []).map((reason: any, index: number) => (
          <article key={index}>
            <p>{reason.text}</p>
            <small>{reason.ruleId ? `Your rule · ${reason.rule ?? "Rule"} · backed by ${reason.confidenceCount ?? "?"} decisions` : `Instinct · from ${verdict.totalDecisions} decisions`}</small>
          </article>
        ))}
      </div>
      {verdict.verdict === "revise" && verdict.suggestions?.length > 0 && <ul>{verdict.suggestions.map((item: string) => <li key={item}>{item}</li>)}</ul>}
      <div className="eye-override">
        <button onClick={() => setOverrideNote(overrideNote || " ")}>The Eye is wrong</button>
        {overrideNote !== "" && <><input value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Optional note" /><button onClick={onSave}>{saved ? <Check size={16} /> : "Save"}</button></>}
      </div>
    </div>
  );
}

function OptionCard({ item, index, onRemove, onPick, top }: { item: Artifact; index: number; onRemove: () => void; onPick?: () => void; top?: boolean }) {
  return (
    <button className={`eye-option-card ${top ? "is-top" : ""}`} onClick={onPick}>
      <span>{top ? "TOP PICK" : `OPTION ${index + 1}`}</span>
      {item.preview ? <img src={item.preview} alt="" /> : <p>{item.text || item.descriptor}</p>}
      <i onClick={(event) => { event.stopPropagation(); onRemove(); }}><X size={13} /></i>
    </button>
  );
}

function DuelSlot({ artifact, winner, faded, onText, onImage, onPick, ready }: { artifact: Artifact | null; winner: boolean; faded: boolean; onText: () => void; onImage: (file?: File) => void; onPick: () => void; ready: boolean }) {
  return (
    <motion.article className={`eye-duel-slot ${winner ? "is-winner" : ""} ${faded ? "is-faded" : ""}`} animate={{ scale: winner ? 1.02 : 1, opacity: faded ? 0.45 : 1 }}>
      {artifact ? (
        <>
          {artifact.preview ? <img src={artifact.preview} alt="" /> : <p>{artifact.text}</p>}
          <button className="primary-pill" onClick={onPick} disabled={!ready}>Pick</button>
        </>
      ) : (
        <div className="eye-duel-empty">
          <button onClick={onText}>Paste text</button>
          <label>Drop image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onImage(event.target.files?.[0])} /></label>
        </div>
      )}
    </motion.article>
  );
}

function ImmatureState({ message, total }: { message: string; total: number }) {
  return (
    <div className="eye-immature">
      <p>{message}</p>
      <span><i style={{ width: `${Math.min(100, (total / 20) * 100)}%` }} /></span>
      <small>{total}/20</small>
    </div>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
