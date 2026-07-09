export type ViewId = "home" | "chat" | "workspaces" | "skills" | "templates" | "knowledge" | "usage" | "settings";

export type WorkspaceLite = {
  id?: string;
  name: string;
  createdAt?: string;
  messages?: unknown[];
  hasKnowledge?: boolean;
};

export type SkillLite = {
  id?: string;
  name: string;
};

export type NextBestAction = {
  label: string;
  description: string;
  view: ViewId;
  action?: "wizard" | "run-step" | "add-knowledge" | "connect-key";
};

function olderThanSevenDays(date?: string) {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() > 7 * 24 * 60 * 60 * 1000;
}

export function nextBestAction(state: {
  workspaces: WorkspaceLite[];
  skills: SkillLite[];
  hasApiKey: boolean;
  lastOutputAt?: string;
}): NextBestAction {
  const workspace = state.workspaces[0];

  if (!workspace) {
    return {
      label: "Create your first workspace",
      description: "Turn one method you already use into a reusable system.",
      view: "home",
      action: "wizard",
    };
  }

  if (!workspace.messages?.length) {
    return {
      label: `Run your first step in ${workspace.name}`,
      description: "Two minutes to your first real output.",
      view: "workspaces",
      action: "run-step",
    };
  }

  if (!state.hasApiKey) {
    return {
      label: "Connect your AI engine",
      description: "One key unlocks generation across your configured models.",
      view: "settings",
      action: "connect-key",
    };
  }

  if (workspace.hasKnowledge === false) {
    return {
      label: `Add knowledge to ${workspace.name}`,
      description: "Your PDFs and notes make outputs sound like you.",
      view: "knowledge",
      action: "add-knowledge",
    };
  }

  if (olderThanSevenDays(state.lastOutputAt || workspace.createdAt)) {
    return {
      label: `Continue ${workspace.name}`,
      description: "Pick up where you left off: the next workflow step is waiting.",
      view: "workspaces",
      action: "run-step",
    };
  }

  return {
    label: `Start a session in ${workspace.name}`,
    description: "Continue from the most recent workspace.",
    view: "workspaces",
    action: "run-step",
  };
}
