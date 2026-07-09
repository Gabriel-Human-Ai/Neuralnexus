export type DiffToken = { type: "same" | "add" | "del"; text: string };

export function wordDiff(a: string, b: string): DiffToken[] {
  const ta = a.split(/(\s+)/).filter(Boolean);
  const tb = b.split(/(\s+)/).filter(Boolean);
  if (ta.length > 4000 || tb.length > 4000) {
    if (a === b) return [{ type: "same", text: a }];
    return [{ type: "del", text: a }, { type: "add", text: b }];
  }
  const m = ta.length, n = tb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffToken[] = [];
  let i = 0, j = 0;
  const push = (type: DiffToken["type"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text; else out.push({ type, text });
  };
  while (i < m && j < n) {
    if (ta[i] === tb[j]) { push("same", ta[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("del", ta[i]); i++; }
    else { push("add", tb[j]); j++; }
  }
  while (i < m) { push("del", ta[i]); i++; }
  while (j < n) { push("add", tb[j]); j++; }
  return out;
}
