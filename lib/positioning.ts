export const POSITIONING = {
  productName: "NeuralNexus",
  category: "AI workspace builder",

  // The frame: renting vs owning
  oneLiner: "ChatGPT gives you answers. NeuralNexus gives you a system.",
  claim: "Turn your expertise into reusable AI workspaces.",
  subClaim: "Encode your method once. It runs, learns from your edits, meets your quality bar, and gets cheaper over time.",

  frame: {
    rent: "Every chat session starts from zero. Your skill lives in today's prompt and dies in the scroll.",
    own:  "A workspace is an asset. Encode your method once — every run after that compounds.",
  },

  audience: "For anyone whose value is a repeatable method: designers, consultants, coaches, developers, founders, teams.",

  pillars: [
    {
      id: "method",
      name: "Your method, encoded",
      line: "Steps, skills and rules — written once, reused forever.",
      fallback: "Steps, skills and rules — written once, reused forever.",
    },
    {
      id: "genome",
      name: "Learns in the open",
      line: "Every edit you make becomes a visible rule you approve — not a black box.",
      fallback: "Built to learn from your edits — transparently, rule by rule.",
    },
    {
      id: "gates",
      name: "Your quality bar, enforced",
      line: "Outputs are checked against your list and revised until they pass.",
      fallback: "Define the checks every output must pass.",
    },
    {
      id: "models",
      name: "21 models, zero loyalty",
      line: "The right model per step across five providers — and proof when a cheaper one matches.",
      fallback: "The right model per step across five providers.",
    },
    {
      id: "provenance",
      name: "Nothing dies in the scroll",
      line: "Every output keeps its lineage. Fork any result, change one variable, compare.",
      fallback: "Every output keeps its model, skill version and cost on record.",
    },
  ],

  // Honest competitor reframes — factual, no trash talk. Used ONLY in the Why sheet.
  compare: [
    {
      them: "Chat assistants (ChatGPT, Claude, Gemini)",
      theirJob: "Brilliant conversation. Answers on demand.",
      gap: "Results depend on today's prompt. Memory is implicit. One provider. No quality standard you control. The work isn't an asset.",
      us: "Your method runs as a system: explicit rules you approve, your checks enforced, any of 21 models per step, every output owned and auditable.",
    },
    {
      them: "Custom GPTs & Projects",
      theirJob: "A saved system prompt with files.",
      gap: "Locked to one vendor and one model. No workflow steps, no visible learning, no cost view, nothing you can package or sell.",
      us: "Steps, skills, learned rules, quality gates and client packaging — a product, not a configured chat.",
    },
    {
      them: "App builders (Lovable, Base44, Bolt)",
      theirJob: "Turn ideas into software.",
      gap: "Different job: they ship apps for people building products.",
      us: "NeuralNexus builds working systems for people who repeat high-value knowledge work.",
    },
    {
      them: "Docs & wikis (Notion, Confluence)",
      theirJob: "Store what you know.",
      gap: "Documents hold knowledge. They don't run it.",
      us: "NeuralNexus is where your knowledge works, not where it sleeps.",
    },
  ],
} as const;
