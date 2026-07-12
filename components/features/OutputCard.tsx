"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, Eye, EyeOff, GitFork, RefreshCcw, WandSparkles } from "lucide-react";
import { PremiumSlideAction } from "@/components/PremiumSlideAction";
import { QualityGateReport } from "@/components/features/QualityGateReport";
import { CopyButton } from "@/components/ui/CopyButton";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { POSITIONING_UI } from "@/lib/positioning";
import type { Claim, ClaimStatus, QualityReport } from "@/lib/types";

export type OutputCardOutput = {
  id: string;
  stepName: string;
  model: string;
  provider?: string;
  costUsd: number;
  content: string;
  skillVersion: number;
  knowledgeIds?: string;
  qualityReport: QualityReport | null;
  claimsJson?: string;
  claims?: Claim[] | null;
  trustUnavailable?: boolean;
};

export function OutputCard({ output, onRefine, onRegenerate, onFinalize, onFork }: {
  output: OutputCardOutput;
  onRefine: (text: string, instruction: string) => void;
  onRegenerate: () => void;
  onFinalize: (text: string) => void;
  onFork: (change: { type: "model" | "skill"; value: string }) => void;
}) {
  const [content, setContent] = useState(output.content);
  const [instruction, setInstruction] = useState("");
  const initialClaims = useMemo(() => parseOutputClaims(output.claimsJson, output.claims), [output.claims, output.claimsJson]);
  const [claims, setClaims] = useState<Claim[]>(initialClaims);
  const [mode, setMode] = useState<"read" | "edit">(initialClaims.length ? "read" : "edit");
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<ClaimStatus | null>(null);
  const [trustMarks, setTrustMarks] = useState(true);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [correctingClaimId, setCorrectingClaimId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [ackClaimId, setAckClaimId] = useState<string | null>(null);
  const [whyClaimId, setWhyClaimId] = useState<string | null>(null);
  const [forgottenClaims, setForgottenClaims] = useState<string[]>([]);
  const knowledgeCount = output.knowledgeIds ? output.knowledgeIds.split(",").filter(Boolean).length : 0;
  const visibleClaims = useMemo(() => claims.filter((claim) => !forgottenClaims.includes(claim.id)), [claims, forgottenClaims]);
  const counts = countClaims(visibleClaims);
  const activeClaim = visibleClaims.find((claim) => claim.id === activeClaimId) ?? null;

  useEffect(() => {
    setClaims(initialClaims);
    setMode(initialClaims.length ? "read" : "edit");
    setForgottenClaims([]);
    setWhyClaimId(null);
  }, [initialClaims]);

  useEffect(() => {
    const stored = localStorage.getItem("UI_TRUST_MARKS");
    setTrustMarks(stored !== "off");
  }, []);

  function toggleTrustMarks() {
    const next = !trustMarks;
    setTrustMarks(next);
    localStorage.setItem("UI_TRUST_MARKS", next ? "on" : "off");
    void fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ UI_TRUST_MARKS: next ? "on" : "off" }) }).catch(() => {});
  }

  async function verifyClaim(id: string) {
    setPendingClaimId(id);
    const response = await fetch(`/api/outputs/${output.id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimIds: [id] }),
    });
    const data = await response.json();
    setPendingClaimId(null);
    if (response.status === 409) {
      setClaims((items) => items.map((claim) => claim.id === id ? { ...claim, verdictNote: "Cross-examination needs a second provider key." } : claim));
      return;
    }
    if (response.ok && Array.isArray(data.claims)) setClaims(data.claims);
  }

  async function markWrong(claim: Claim) {
    setPendingClaimId(claim.id);
    const response = await fetch(`/api/outputs/${output.id}/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimId: claim.id, correctionText }),
    });
    const data = await response.json();
    setPendingClaimId(null);
    if (response.ok && Array.isArray(data.claims)) {
      setClaims(data.claims);
      setAckClaimId(claim.id);
      setCorrectionText("");
      setCorrectingClaimId(null);
      setTimeout(() => {
        setAckClaimId(null);
        setActiveClaimId(null);
      }, 650);
    }
  }

  return (
    <section className="output-card liquid-card">
      <div className="output-head">
        <span className="object-label">OUTPUT</span>
        <div>
          <strong>{output.stepName}</strong>
          <small>{output.model} · ${output.costUsd.toFixed(4)}</small>
        </div>
      </div>
      <div className="output-content-head">
        {claims.length > 0 && (
          <div className="read-edit-toggle" role="group" aria-label="Output mode">
            <button className={mode === "read" ? "is-active" : ""} onClick={() => setMode("read")}>Read</button>
            <button className={mode === "edit" ? "is-active" : ""} onClick={() => setMode("edit")}>Edit</button>
          </div>
        )}
      </div>
      {mode === "read" && claims.length > 0 ? (
        <div className={`claim-read-mode ${trustMarks ? "" : "trust-hidden"}`} onKeyDown={(event) => { if (event.key === "Escape") setActiveClaimId(null); }}>
          {renderClaimText(content, visibleClaims, activeClaimId, highlight, (claim) => (
            <span
              key={claim.id}
              data-claim={claim.id}
              className={`claim claim--${claim.status} ${activeClaimId === claim.id ? "is-active" : ""} ${highlight === claim.status ? "is-hl" : ""}`}
              tabIndex={0}
              onMouseEnter={() => window.setTimeout(() => setActiveClaimId(claim.id), 300)}
              onClick={() => setActiveClaimId(claim.id)}
              onKeyDown={(event) => { if (event.key === "Enter") setActiveClaimId(claim.id); }}
            >
              {claim.text}
            </span>
          ))}
          {activeClaim && (
            <div className="claim-popover" role="dialog">
              <div className="trust-mini-actions" aria-label="Trust actions">
                <button type="button" onClick={() => setWhyClaimId(whyClaimId === activeClaim.id ? null : activeClaim.id)}>Why this?</button>
                <button type="button" onClick={() => { setCorrectingClaimId(activeClaim.id); setCorrectionText(activeClaim.text); }}>Edit</button>
                <button type="button" onClick={() => { setForgottenClaims((items) => [...items, activeClaim.id]); setActiveClaimId(null); }}>Forget</button>
              </div>
              {(whyClaimId === activeClaim.id || activeClaim.status !== "grounded") && <ClaimPopoverContent claim={activeClaim} />}
              {activeClaim.status === "external" && activeClaim.verifierModel && <p>Independently confirmed · {activeClaim.verifierModel}</p>}
              {activeClaim.status === "external" && !activeClaim.verifierModel && (
                <button onClick={() => verifyClaim(activeClaim.id)} disabled={pendingClaimId === activeClaim.id}>{pendingClaimId === activeClaim.id ? "..." : "Verify"}</button>
              )}
              {correctingClaimId === activeClaim.id && (
                <div className="claim-correction-row">
                  <input value={correctionText} onChange={(event) => setCorrectionText(event.target.value)} placeholder="Rewrite this claim or note what is wrong" />
                  <button onClick={() => markWrong(activeClaim)} disabled={pendingClaimId === activeClaim.id}>{pendingClaimId === activeClaim.id ? "..." : "Save"}</button>
                </div>
              )}
              {ackClaimId === activeClaim.id && <span className="claim-ack"><Check size={14} /> Recorded</span>}
            </div>
          )}
        </div>
      ) : (
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={10} />
      )}
      <QualityGateReport report={output.qualityReport} />
      <div className="trust-bar">
        {output.trustUnavailable ? (
          <span>Trust layer needs a connected model.</span>
        ) : claims.length ? (
          <>
            <button onClick={() => setHighlight(highlight === "grounded" ? null : "grounded")}>✓ <RollingNumber value={counts.grounded} /> grounded</button>
            <button onClick={() => setHighlight(highlight === "inferred" ? null : "inferred")}><RollingNumber value={counts.inferred} /> inferred</button>
            <button onClick={() => setHighlight(highlight === "external" ? null : "external")}><RollingNumber value={counts.external} /> unverified</button>
            {counts.disputed > 0 && <button className="danger" onClick={() => setHighlight(highlight === "disputed" ? null : "disputed")}>⚠ <RollingNumber value={counts.disputed} /> disputed</button>}
          </>
        ) : (
          <span>Trust layer unavailable for this output.</span>
        )}
        <button className="trust-eye" onClick={toggleTrustMarks} aria-label={trustMarks ? "Hide trust marks" : "Show trust marks"}>
          {trustMarks ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      <div className="output-actions">
        <CopyButton text={content} label="Copy" />
        <button onClick={onRegenerate}><RefreshCcw size={14} /> Regenerate</button>
        <button onClick={() => onFork({ type: "model", value: "gpt-4o-mini" })} aria-label={POSITIONING_UI.microcopy.fork} title={POSITIONING_UI.microcopy.fork}><GitFork size={14} /> Fork model</button>
      </div>
      <div className="refine-row">
        <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Refine instruction" />
        <button onClick={() => instruction.trim() && onRefine(content, instruction)}><WandSparkles size={14} /> Refine</button>
      </div>
      <PremiumSlideAction label="Slide to save as final" completionText="Saved as final" onComplete={() => onFinalize(content)} />
      <p className="output-provenance">{output.model} · Skill v{output.skillVersion} · {knowledgeCount} knowledge sources · ${output.costUsd.toFixed(4)}</p>
    </section>
  );
}

function parseOutputClaims(claimsJson?: string, claims?: Claim[] | null) {
  if (claims?.length) return claims;
  try {
    const parsed = JSON.parse(claimsJson || "[]");
    return Array.isArray(parsed) ? parsed as Claim[] : [];
  } catch {
    return [];
  }
}

function countClaims(claims: Claim[]) {
  return claims.reduce((acc, claim) => {
    acc[claim.status] = (acc[claim.status] ?? 0) + 1;
    return acc;
  }, { grounded: 0, inferred: 0, external: 0, disputed: 0, corrected: 0 } as Record<ClaimStatus, number>);
}

function renderClaimText(
  text: string,
  claims: Claim[],
  activeId: string | null,
  highlight: ClaimStatus | null,
  renderClaim: (claim: Claim) => ReactNode,
) {
  const positioned = claims.map((claim) => ({ claim, start: text.indexOf(claim.text) })).filter((item) => item.start >= 0).sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  positioned.forEach(({ claim, start }) => {
    if (start < cursor) return;
    if (start > cursor) nodes.push(<Fragment key={`p-${cursor}`}>{text.slice(cursor, start)}</Fragment>);
    nodes.push(renderClaim({ ...claim, verifierModel: claim.id === activeId ? claim.verifierModel : claim.verifierModel, status: highlight === claim.status ? claim.status : claim.status }));
    cursor = start + claim.text.length;
  });
  if (cursor < text.length) nodes.push(<Fragment key={`p-${cursor}`}>{text.slice(cursor)}</Fragment>);
  return nodes;
}

function ClaimPopoverContent({ claim }: { claim: Claim }) {
  if (claim.status === "grounded") {
    return <><strong>Backed by your knowledge</strong><p>From: {claim.sourceTitle}</p>{claim.sourceQuote && <blockquote>"{claim.sourceQuote}"</blockquote>}</>;
  }
  if (claim.status === "inferred") return <><strong>Inferred from: {claim.sourceTitle}</strong></>;
  if (claim.status === "disputed") return <><strong>Disputed by {claim.verifierModel}</strong><p className="danger">{claim.verdictNote}</p></>;
  if (claim.status === "corrected") return <strong>You corrected this claim.</strong>;
  return <><strong>Model knowledge — not in your sources.</strong>{claim.verdictNote && <p>{claim.verdictNote}</p>}</>;
}
