"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, Database, Download, Eye, Layers3, ShieldCheck, X } from "lucide-react";
import { AuraCard } from "@/components/ui/AuraCard";
import { RollingNumber } from "@/components/ui/RollingNumber";

type VaultData = {
  asset: { decisions: number; rules: number; corrections: number; guardsActive: number; days: number };
  engines: {
    method: { skills: number; versions: number; topRule: string };
    truth: { corrections: number; topGuard: string; modelsCovered: number };
    taste: { decisions: number; activeRules: number; maturity: { contextTag: string; count: number; unlocked: boolean }[] };
  };
  index: { endpointConfigured: boolean; collectiveGuards: number };
};

export function VaultIntro({ onOpenEye, onOpenSkills, consent }: { onOpenEye: () => void; onOpenSkills: () => void; consent?: string }) {
  const [data, setData] = useState<VaultData | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentConsent, setCurrentConsent] = useState(consent || "off");
  const [exported, setExported] = useState(false);

  useEffect(() => { void load(); }, []);
  useEffect(() => setCurrentConsent(consent || "off"), [consent]);

  async function load() {
    const res = await fetch("/api/vault");
    if (res.ok) setData(await res.json());
  }

  async function exportVault() {
    const res = await fetch("/api/vault/export");
    const json = await res.text();
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexus-vault.json";
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 900);
  }

  async function openPreview() {
    const res = await fetch("/api/index/preview");
    setPreview(await res.json());
    setPreviewOpen(true);
  }

  async function toggleConsent() {
    const next = currentConsent === "on" ? "off" : "on";
    const res = await fetch("/api/index/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: next }),
    });
    if (res.ok) setCurrentConsent(next);
  }

  const asset = data?.asset ?? { decisions: 0, rules: 0, corrections: 0, guardsActive: 0, days: 0 };

  return (
    <>
      <AuraCard variant="fade" className="vault-asset-card">
        <div className="vault-asset-head">
          <div>
            <span className="eyebrow">THE VAULT</span>
            <h1>Your judgment, on file</h1>
            <p>Built from <RollingNumber value={asset.days} /> days of real work. This asset leaves with you — export anytime.</p>
          </div>
          <button className="secondary-pill" onClick={exportVault}>{exported ? <Check size={16} /> : <Download size={16} />} Export my asset</button>
        </div>
        <div className="vault-stat-grid">
          <Stat label="Decisions" value={asset.decisions} />
          <Stat label="Rules" value={asset.rules} />
          <Stat label="Corrections" value={asset.corrections} />
          <Stat label="Guards active" value={asset.guardsActive} />
        </div>
      </AuraCard>

      <div className="vault-engine-row">
        <EngineCard icon={<Layers3 size={19} />} label="METHOD" title={`${data?.engines.method.skills ?? 0} skills · ${data?.engines.method.versions ?? 0} versions`} body={data?.engines.method.topRule || "Skill rules appear here once approved."} onClick={onOpenSkills} />
        <EngineCard icon={<ShieldCheck size={19} />} label="TRUTH" title={`${data?.engines.truth.corrections ?? 0} corrections · ${data?.engines.truth.modelsCovered ?? 0} models`} body={data?.engines.truth.topGuard || "Correction guards appear after repeated fixes."} />
        <EngineCard icon={<Eye size={19} />} label="TASTE" title={`${data?.engines.taste.decisions ?? 0} decisions · ${data?.engines.taste.activeRules ?? 0} active rules`} body={(data?.engines.taste.maturity ?? []).slice(0, 3).map((item) => `${item.contextTag}: ${item.count}/20`).join(" · ") || "Train The Eye through duels and decisions."} onClick={onOpenEye} />
      </div>

      <AuraCard variant="plain" className="vault-index-panel">
        <div className="section-head">
          <span>The Nexus Index</span>
          <small>{data?.index.endpointConfigured ? "Network endpoint configured" : "Network endpoint not configured"}</small>
        </div>
        <p>Contribute anonymized judgment patterns — never your content — and get collective guards back: protections trained by every professional on the network.</p>
        <p>Shared: failure patterns, verdict counts, rule fingerprints.</p>
        <p>Never shared: your text, outputs, knowledge, names, rules in plaintext.</p>
        <div className="vault-index-actions">
          <button className={`vault-switch ${currentConsent === "on" ? "is-on" : ""} ${!data?.index.endpointConfigured ? "is-disabled" : ""}`} onClick={toggleConsent} aria-pressed={currentConsent === "on"}>
            <span />
            {currentConsent === "on" ? "Consent on" : "Consent off"}
          </button>
          <button className="secondary-pill" onClick={openPreview}><Database size={15} /> View exactly what leaves</button>
        </div>
        {!data?.index.endpointConfigured && <small>The network launches soon. Your consent will activate it.</small>}
      </AuraCard>

      {previewOpen && (
        <div className="vault-preview-backdrop" role="dialog" aria-modal="true" onClick={() => setPreviewOpen(false)}>
          <div className="vault-preview-sheet" onClick={(event) => event.stopPropagation()}>
            <header><strong>Index payload preview</strong><button onClick={() => setPreviewOpen(false)} aria-label="Close preview"><X size={16} /></button></header>
            <pre>{JSON.stringify(preview, null, 2)}</pre>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><span>{label}</span><strong><RollingNumber value={value} /></strong></div>;
}

function EngineCard({ icon, label, title, body, onClick }: { icon: ReactNode; label: string; title: string; body: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag className="vault-engine-card" onClick={onClick as any}>
      <span>{icon}{label}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </Tag>
  );
}
