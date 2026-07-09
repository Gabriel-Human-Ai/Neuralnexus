"use client";

import { wordDiff } from "@/lib/diff";

export function DiffView({ leftLabel, rightLabel, leftText, rightText, leftMeta, rightMeta }: {
  leftLabel: string; rightLabel: string; leftText: string; rightText: string; leftMeta: string; rightMeta: string;
}) {
  const tokens = wordDiff(leftText, rightText);
  return (
    <div className="diff-view">
      <section>
        <div className="diff-meta"><strong>{leftLabel}</strong><span>{leftMeta}</span></div>
        <p>{tokens.map((token, index) => token.type === "add" ? null : <mark key={index} className={token.type}>{token.text}</mark>)}</p>
      </section>
      <section>
        <div className="diff-meta"><strong>{rightLabel}</strong><span>{rightMeta}</span></div>
        <p>{tokens.map((token, index) => token.type === "del" ? null : <mark key={index} className={token.type}>{token.text}</mark>)}</p>
      </section>
    </div>
  );
}
