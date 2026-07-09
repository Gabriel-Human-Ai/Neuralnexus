export type WizardIntent =
  | "create_workspace"
  | "open_chat"
  | "create_skill"
  | "open_knowledge"
  | "open_usage"
  | "open_templates"
  | "open_workspaces"
  | "open_settings"
  | "start_xray"
  | "find_something"
  | "open_outputs"
  | "unknown";

export type WizardRoute = {
  intent: WizardIntent;
  label: string;
  message: string;
};

const ROUTES: Array<{ intent: WizardIntent; label: string; keywords: string[]; message: string }> = [
  {
    intent: "open_chat",
    label: "Open general chat",
    keywords: ["chat", "ask anything", "general question", "question", "talk"],
    message: "I can open a free chat that is not tied to any workspace.",
  },
  {
    intent: "create_workspace",
    label: "Create workspace",
    keywords: ["create workspace", "new workspace", "build workspace", "brand workspace", "workspace"],
    message: "I can take you to the workspace builder.",
  },
  {
    intent: "create_skill",
    label: "Create a skill",
    keywords: ["create skill", "build skill", "new skill", "skill"],
    message: "I can open Skills so you can package a reusable AI capability.",
  },
  {
    intent: "open_knowledge",
    label: "Open Knowledge",
    keywords: ["files", "knowledge", "sources", "pdf", "brief", "documents"],
    message: "I can take you to Knowledge, where source material is prepared.",
  },
  {
    intent: "open_usage",
    label: "Open Usage",
    keywords: ["usage", "cost", "budget", "spend", "model runs"],
    message: "I can open Usage so you can see model costs and activity.",
  },
  {
    intent: "open_templates",
    label: "Show templates",
    keywords: ["templates", "template", "library"],
    message: "I can show the template library.",
  },
  {
    intent: "open_workspaces",
    label: "Open Workspaces",
    keywords: ["my workspaces", "projects", "continue", "next step"],
    message: "I can open Workspaces and help you continue from there.",
  },
  {
    intent: "open_settings",
    label: "Open Settings",
    keywords: ["settings", "personalize", "orb settings", "preferences"],
    message: "I can open Settings.",
  },
  {
    intent: "start_xray",
    label: "Start Business X-Ray",
    keywords: ["x-ray", "xray", "scan", "business scan", "analyze business"],
    message: "Business X-Ray is prepared as a workspace mode. I can start the builder with the closest real setup.",
  },
  {
    intent: "open_outputs",
    label: "Open outputs",
    keywords: ["outputs", "results", "final", "approved"],
    message: "Outputs live inside each workspace. I can take you to Workspaces.",
  },
  {
    intent: "find_something",
    label: "Find something",
    keywords: ["find", "search", "where is", "locate"],
    message: "I can open the command center for search and navigation.",
  },
];

export function routeWizardRequest(input: string): WizardRoute {
  const text = input.trim().toLowerCase();
  const match = ROUTES.find((route) => route.keywords.some((keyword) => text.includes(keyword)));
  if (match) return { intent: match.intent, label: match.label, message: match.message };
  return {
    intent: "unknown",
    label: "Open command center",
    message: "I can help route that. Try the command center for the closest real action.",
  };
}

export const WIZARD_QUICK_ACTIONS: WizardRoute[] = [
  { intent: "open_chat", label: "Ask anything", message: "Open the free general chat." },
  { intent: "create_workspace", label: "Create workspace", message: "Open the workspace builder." },
  { intent: "create_skill", label: "Create a skill", message: "Open Skills." },
  { intent: "open_knowledge", label: "Go to Knowledge", message: "Open Knowledge." },
  { intent: "open_usage", label: "Go to Usage", message: "Open Usage." },
];
