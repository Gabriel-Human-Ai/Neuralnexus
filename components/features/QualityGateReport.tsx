"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { QualityReport } from "@/lib/types";

export function QualityGateReport({ report }: { report: QualityReport | null }) {
  const [open, setOpen] = useState(false);
  if (!report) return null;
  const passed = report.checks.filter((check) => check.passed).length;
  return (
    <div className="quality-report">
      <button className="quality-summary" onClick={() => setOpen((value) => !value)}>
        <span>Quality: {passed}/{report.checks.length} checks</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="quality-lines">
          {report.checks.map((check) => (
            <div key={check.check} className={check.passed ? "is-passed" : "is-failed"}>
              <strong>{check.passed ? check.fixed ? "↻ fixed" : "✓" : "✗"}</strong>
              <span>{check.check}{!check.passed && check.reason ? ` — ${check.reason}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
