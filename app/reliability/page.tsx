import { db } from "@/lib/db";
import { prepareJudgmentContributionReport } from "@/lib/judgment-layer";
import { resolveProfileId } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function ReliabilityPage() {
  const profileId = await resolveProfileId();
  const [outputs, corrections, judgment] = await Promise.all([
    db.output.findMany({ where: { profileId }, select: { model: true, stepName: true, claimsJson: true } }),
    db.correctionRecord.findMany({ where: { profileId }, select: { model: true, domainTag: true } }),
    prepareJudgmentContributionReport(profileId),
  ]);
  const rows = new Map<string, { model: string; domainTag: string; runs: number; disputed: number; corrections: number }>();
  for (const output of outputs) {
    const domainTag = domainFromText(output.stepName);
    const key = `${output.model}::${domainTag}`;
    const row = rows.get(key) ?? { model: output.model || "unknown", domainTag, runs: 0, disputed: 0, corrections: 0 };
    row.runs += 1;
    row.disputed += parseClaims(output.claimsJson).filter((claim) => claim.status === "disputed" || claim.status === "corrected").length;
    rows.set(key, row);
  }
  for (const correction of corrections) {
    const key = `${correction.model}::${correction.domainTag}`;
    const row = rows.get(key) ?? { model: correction.model || "unknown", domainTag: correction.domainTag, runs: 0, disputed: 0, corrections: 0 };
    row.corrections += 1;
    rows.set(key, row);
  }
  const data = Array.from(rows.values()).sort((a, b) => b.runs - a.runs || b.corrections - a.corrections);

  return (
    <main className="reliability-page">
      <header>
        <span className="eyebrow">RELIABILITY</span>
        <h1>Model Reliability — measured from real work</h1>
        <p>Local reliability from your own runs. The collective layer activates as the network grows.</p>
      </header>
      <section className="reliability-empty">
        {judgment.contributions.length
          ? `${judgment.contributions.length} anonymized judgment patterns are ready locally. ${judgment.endpointConfigured ? "Network endpoint configured." : "No network endpoint is configured, so nothing leaves this app."}`
          : `No shareable judgment pattern yet. ${judgment.withheld} local patterns are withheld until they meet the k-anonymity threshold.`}
      </section>
      <section className="reliability-table" aria-label="Model reliability table">
        <div className="reliability-row reliability-head">
          <span>Model</span>
          <span>Domain</span>
          <span>Runs</span>
          <span>Disputed claim rate</span>
          <span>Corrections</span>
        </div>
        {data.length ? data.map((row) => (
          <div className="reliability-row" key={`${row.model}-${row.domainTag}`}>
            <strong>{row.model}</strong>
            <span>{row.domainTag}</span>
            <span>{row.runs}</span>
            <span>{row.runs ? `${(row.disputed / row.runs).toFixed(2)} / run` : "0 / run"}</span>
            <span>{row.corrections}</span>
          </div>
        )) : (
          <div className="reliability-empty">No reliability data yet. Outputs, disputes and corrections appear here after real workspace runs.</div>
        )}
      </section>
      <footer>Only hashed, generalized patterns can contribute to the collective layer. Raw text, names, prompts and corrections are never part of the payload.</footer>
    </main>
  );
}

function parseClaims(claimsJson: string): { status?: string }[] {
  try {
    const parsed = JSON.parse(claimsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function domainFromText(value: string) {
  const text = String(value ?? "").toLowerCase();
  return ["content", "brand", "review", "coaching", "audit", "research", "general"].find((tag) => text.includes(tag)) ?? "general";
}
