"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Eye, Layers3, ShieldCheck } from "lucide-react";
import { AuraCard } from "@/components/ui/AuraCard";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { ProfileExport } from "@/components/features/ProfileExport";
import { ProfileMemoryPanel } from "@/components/features/ProfileMemoryPanel";

type VaultData = {
  asset: { decisions: number; rules: number; corrections: number; guardsActive: number; days: number };
  engines: {
    method: { skills: number; versions: number; topRule: string };
    truth: { corrections: number; topGuard: string; modelsCovered: number };
    taste: { decisions: number; activeRules: number; maturity: { contextTag: string; count: number; unlocked: boolean }[] };
  };
  index: {
    endpointConfigured: boolean;
    collectiveGuards: number;
    message: string;
    consentCopy: { network: string; research: string };
    judgmentAsset: {
      contributed: number;
      research: number;
      domains: number;
      pending: number;
      withheld: number;
      minLocalFrequency: number;
      consent: { personal: boolean; network: boolean; research: boolean };
    };
  };
};

export function VaultIntro({ onOpenEye, onOpenSkills }: { onOpenEye: () => void; onOpenSkills: () => void }) {
  const [data, setData] = useState<VaultData | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const res = await fetch("/api/vault");
    if (res.ok) setData(await res.json());
  }

  async function updateConsent(patch: Partial<{ network: boolean; research: boolean }>) {
    const res = await fetch("/api/index/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await load();
  }

  const asset = data?.asset ?? { decisions: 0, rules: 0, corrections: 0, guardsActive: 0, days: 0 };

  return (
    <>
      <AuraCard variant="fade" className="vault-asset-card">
        <div className="vault-asset-head">
          <div>
            <span className="eyebrow">YOUR PROFILE</span>
            <h1>Your profile</h1>
            <p>What NeuralNexus has learned about how you like to work and be spoken to. Yours to keep, edit, or clear — it never leaves without you.</p>
          </div>
        </div>
        <div className="vault-stat-grid">
          <Stat label="Real choices" value={asset.decisions} />
          <Stat label="Learned rules" value={asset.rules} />
          <Stat label="Corrections" value={asset.corrections} />
          <Stat label="Days in use" value={asset.days} />
        </div>
      </AuraCard>

      <ProfileMemoryPanel />

      <section className="judgment-asset-panel" aria-labelledby="judgment-asset-title">
        <div>
          <span className="eyebrow">JUDGMENT LAYER</span>
          <h2 id="judgment-asset-title">Your judgment can help the network, without exposing your work.</h2>
          <p>{data?.index.message || "Anonymized patterns can strengthen collective safeguards for contributors. Your content, names and words stay private."}</p>
        </div>
        <div className="judgment-consent-grid">
          <ConsentCard
            title="Network contribution"
            body={data?.index.consentCopy.network || "Contribute anonymized patterns of how you judge and correct AI — never your content, names, or words. In return, you get collective intelligence: what professionals in your field consistently prefer. Off by default."}
            enabled={Boolean(data?.index.judgmentAsset.consent.network)}
            onToggle={() => void updateConsent({ network: !data?.index.judgmentAsset.consent.network })}
          />
          <ConsentCard
            title="Research asset"
            body={data?.index.consentCopy.research || "Allow your anonymized patterns to become part of the aggregated judgment dataset that helps train better, more human-aligned AI. Fully anonymous. You can withdraw anytime, and your patterns are removed."}
            enabled={Boolean(data?.index.judgmentAsset.consent.research)}
            onToggle={() => void updateConsent({ research: !data?.index.judgmentAsset.consent.research })}
          />
        </div>
        <div className="judgment-asset-stats">
          <Stat label="Anonymized patterns" value={data?.index.judgmentAsset.contributed ?? 0} />
          <Stat label="Research patterns" value={data?.index.judgmentAsset.research ?? 0} />
          <Stat label="Domains" value={data?.index.judgmentAsset.domains ?? 0} />
          <div>
            <span>Withheld until safe</span>
            <strong>{data?.index.judgmentAsset.withheld ?? 0}</strong>
            <small>k-anonymity threshold: {data?.index.judgmentAsset.minLocalFrequency ?? 2}</small>
          </div>
        </div>
        <p className="judgment-asset-note">You own your part of the dataset. Turning a layer off removes the local contribution records for that layer.</p>
      </section>

      <ProfileExport />

      <div className="vault-engine-row">
        <EngineCard icon={<Layers3 size={19} />} label="WORKING STYLE" title={`${data?.engines.method.skills ?? 0} skills · ${data?.engines.method.versions ?? 0} versions`} body={data?.engines.method.topRule || "Skill rules appear here once approved."} onClick={onOpenSkills} />
        <EngineCard icon={<ShieldCheck size={19} />} label="GROUND TRUTH" title={`${data?.engines.truth.corrections ?? 0} corrections · ${data?.engines.truth.modelsCovered ?? 0} models`} body={data?.engines.truth.topGuard || "Correction guards appear after repeated fixes."} />
        <EngineCard icon={<Eye size={19} />} label="VISUAL TASTE" title={`${data?.engines.taste.decisions ?? 0} decisions · ${data?.engines.taste.activeRules ?? 0} active rules`} body={(data?.engines.taste.maturity ?? []).slice(0, 3).map((item) => `${item.contextTag}: ${item.count}/20`).join(" · ") || "Train The Eye through duels and decisions."} onClick={onOpenEye} />
      </div>

    </>
  );
}

function ConsentCard({ title, body, enabled, onToggle }: { title: string; body: string; enabled: boolean; onToggle: () => void }) {
  return (
    <article className="judgment-consent-card">
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <button type="button" className={enabled ? "is-on" : ""} onClick={onToggle} aria-pressed={enabled}>
        {enabled ? "On" : "Off"}
      </button>
    </article>
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
