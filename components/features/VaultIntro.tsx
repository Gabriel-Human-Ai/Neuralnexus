"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Eye, Layers3, ShieldCheck } from "lucide-react";
import { AuraCard } from "@/components/ui/AuraCard";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { ProfileExport } from "@/components/features/ProfileExport";

type VaultData = {
  asset: { decisions: number; rules: number; corrections: number; guardsActive: number; days: number };
  engines: {
    method: { skills: number; versions: number; topRule: string };
    truth: { corrections: number; topGuard: string; modelsCovered: number };
    taste: { decisions: number; activeRules: number; maturity: { contextTag: string; count: number; unlocked: boolean }[] };
  };
  index: { endpointConfigured: boolean; collectiveGuards: number };
};

export function VaultIntro({ onOpenEye, onOpenSkills }: { onOpenEye: () => void; onOpenSkills: () => void }) {
  const [data, setData] = useState<VaultData | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const res = await fetch("/api/vault");
    if (res.ok) setData(await res.json());
  }

  const asset = data?.asset ?? { decisions: 0, rules: 0, corrections: 0, guardsActive: 0, days: 0 };

  return (
    <>
      <AuraCard variant="fade" className="vault-asset-card">
        <div className="vault-asset-head">
          <div>
            <span className="eyebrow">YOUR PROFILE</span>
            <h1>Your AI personality, in one profile.</h1>
            <p>NeuralNexus learns how you want to be addressed, answered, supported and visually understood.</p>
          </div>
        </div>
        <div className="vault-stat-grid">
          <Stat label="Real choices" value={asset.decisions} />
          <Stat label="Learned rules" value={asset.rules} />
          <Stat label="Corrections" value={asset.corrections} />
          <Stat label="Days in use" value={asset.days} />
        </div>
      </AuraCard>

      <ProfileExport />

      <div className="vault-engine-row">
        <EngineCard icon={<Layers3 size={19} />} label="WORKING STYLE" title={`${data?.engines.method.skills ?? 0} skills · ${data?.engines.method.versions ?? 0} versions`} body={data?.engines.method.topRule || "Skill rules appear here once approved."} onClick={onOpenSkills} />
        <EngineCard icon={<ShieldCheck size={19} />} label="GROUND TRUTH" title={`${data?.engines.truth.corrections ?? 0} corrections · ${data?.engines.truth.modelsCovered ?? 0} models`} body={data?.engines.truth.topGuard || "Correction guards appear after repeated fixes."} />
        <EngineCard icon={<Eye size={19} />} label="VISUAL TASTE" title={`${data?.engines.taste.decisions ?? 0} decisions · ${data?.engines.taste.activeRules ?? 0} active rules`} body={(data?.engines.taste.maturity ?? []).slice(0, 3).map((item) => `${item.contextTag}: ${item.count}/20`).join(" · ") || "Train The Eye through duels and decisions."} onClick={onOpenEye} />
      </div>

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
