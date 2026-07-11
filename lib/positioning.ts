export const POSITIONING = {
  productName: "NeuralNexus",
  category: "AI personality profile",

  // The frame: renting vs owning
  oneLiner: "Your AI personality, in one profile.",
  claim: "Build your AI personality through use.",
  subClaim: "Build it just by using NeuralNexus. Then every AI — ChatGPT, Claude, image generators — instantly knows how to talk, write and create for you.",

  frame: {
    rent: "Every AI starts with a blank profile. Your preferences disappear between tools and prompts.",
    own:  "Your profile keeps the choices that make the work yours — portable, inspectable and ready when you are.",
  },

  audience: "For people who want AI to understand how they think, work, communicate and create.",

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
    {
      id: "truth",
      name: "It admits when it guesses",
      line: "Every claim is backed, inferred, or flagged — and every correction you make becomes a guard.",
      fallback: "Every claim is backed, inferred, or flagged.",
    },
    {
      id: "eye",
      name: "Your taste, on file",
      line: "It learns your judgment from real decisions — then judges, ranks and defends like you would.",
      fallback: "Built to learn your judgment from real decisions.",
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

export const POSITIONING_UI = {
  home: {
    firstTimeSentence: "Your AI personality, in one profile.",
    firstTimeSubLine: "Build it just by using NeuralNexus, then carry it to the AI tools you already use.",
    whyLabel: "Why NeuralNexus",
  },
  onboarding: {
    typeHeading: "What method are you turning into a system?",
    reviewLine: "This is yours — it improves with every run.",
  },
  connectKey: {
    bodyLine1: "Bring keys from any provider — OpenAI, Anthropic, OpenRouter, Google, DeepSeek.",
    bodyLine2: "NeuralNexus stays neutral: the right model per step, and proof when a cheaper one matches your quality.",
  },
  emptyStates: {
    workspaces: "Your first workspace turns a method you already use into an asset that compounds.",
    skills: "A skill is your method, packaged — with rules the workspace learns from your edits.",
    knowledge: "Notes, PDFs and frameworks make outputs sound like you, not like a model.",
    outputs: "Run a step. Everything you produce keeps its lineage — nothing dies in the scroll.",
  },
  microcopy: {
    qualityGates: "Quality Gates — revised until it meets your bar.",
    genome: "Learning you can read: every rule came from an edit you made, and nothing activates without you.",
    autopilot: "Autopilot tests cheaper models against your real runs. Recommendations come with proof — nothing switches without your tap.",
    fork: "Fork this output, change one variable, compare.",
    extractor: "Steps, skills and knowledge — extracted from your material, not invented.",
  },
  whySheet: {
    eyebrow: "WHY NEURALNEXUS",
    compareLabel: "COMPARED HONESTLY",
    ariaLabel: "Why NeuralNexus",
    closeAriaLabel: "Close Why NeuralNexus",
    createCta: "Create your first workspace",
    backCta: "Back to work",
  },
} as const;
