"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { POSITIONING_UI } from "@/lib/positioning";
import { GenomeConstellation } from "@/components/immersive/GenomeConstellation";

export function GenomePanel({ skill, onClose }: { skill: { id: string; name: string; version?: number }; onClose: () => void }) {
  const [rules, setRules] = useState<any[]>([]);
  const load = () => fetch(`/api/skills/${skill.id}/rules`).then((res) => res.json()).then(setRules).catch(() => setRules([]));
  useEffect(() => { void load(); }, [skill.id]);
  const act = async (id: string, action: "accept" | "reject") => {
    await fetch(`/api/rules/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    await load();
  };
  const proposed = rules.filter((rule) => rule.status === "proposed");
  const active = rules.filter((rule) => rule.status === "active");
  return (
    <div className="feature-sheet">
      <div className="floating-wizard-head"><span>{skill.name} v{skill.version ?? 1}</span><button onClick={onClose}><X size={15} /></button></div>
      <GenomeConstellation rules={rules} version={skill.version ?? 1} onRuleAction={act} />
      <section>
        <span className="object-label">PROPOSED</span>
        {proposed.length ? proposed.map((rule) => (
          <div className="rule-row" key={rule.id}>
            <p>{rule.text}</p>
            <small>{rule.provenance ? `Learned from "${rule.provenance.stepName}" · ${new Date(rule.createdAt).toLocaleDateString()}` : "Learned from an edit"}</small>
            <div><button onClick={() => act(rule.id, "accept")}>Accept</button><button onClick={() => act(rule.id, "reject")}>Reject</button></div>
          </div>
        )) : <p>{POSITIONING_UI.microcopy.genome}</p>}
      </section>
      <section>
        <span className="object-label">ACTIVE</span>
        {active.map((rule) => <div className="rule-row" key={rule.id}><p>{rule.text}</p><button onClick={() => fetch(`/api/rules/${rule.id}`, { method: "DELETE" }).then(load)}>Remove</button></div>)}
      </section>
    </div>
  );
}
