import { db } from "./db";
import { BASE_PROMPT } from "./base-prompt";
import { getSettingForProfile } from "./settings";
import { resolveProfileId } from "./scope";

// Context Builder: compact system prompt instead of dumping everything.
async function readSetting(profileId: string, key: string): Promise<string> {
  return getSettingForProfile(profileId, key);
}

export async function buildContext(args: string | { projectId: string; profileId?: string }) {
  const projectId = typeof args === "string" ? args : args.projectId;
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return BASE_PROMPT;
  const profileId = project.profileId ?? await resolveProfileId(typeof args === "string" ? null : args.profileId);
  const custom = await readSetting(profileId, "CUSTOM_INSTRUCTIONS");
  const profile = await readSetting(profileId, "USER_PROFILE");
  const prefix = [BASE_PROMPT];
  if (profile) prefix.push(`Nutzer-Profil:\n${profile}`);
  if (custom) prefix.push(`Zusätzliche Anweisungen:\n${custom}`);
  const projectCtx = await buildProjectCtx({ projectId, profileId, project });
  return [prefix.join("\n\n"), projectCtx].filter(Boolean).join("\n\n");
}

async function buildProjectCtx(args: { projectId: string; profileId: string; project: { name: string; goal: string; techStack: string; rules: string } }) {
  const { projectId, profileId, project } = args;
  const memories = await db.memory.findMany({
    where: { profileId, OR: [{ projectId }, { projectId: null }] },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  const byKind = (k: string) =>
    memories.filter(m => m.kind === k).map(m => `- ${m.content}`).join("\n") || "- (leer)";
  return [
    `# Projekt: ${project.name}`,
    project.goal && `Ziel: ${project.goal}`,
    project.techStack && `Tech: ${project.techStack}`,
    project.rules && `Regeln: ${project.rules}`,
    `## Entscheidungen\n${byKind("decision")}`,
    `## Status\n${byKind("status")}`,
    `## Bekannte Bugs\n${byKind("bug")}`,
    `## Nicht wiederholen\n${byKind("rule")}`,
    `## Nutzer-Präferenzen\n${byKind("preference")}`,
    
  ].filter(Boolean).join("\n\n");
}

export async function buildMemoryFiles(projectId: string) {
  const ctx = await buildContext(projectId);
  const project = await db.project.findUnique({ where: { id: projectId } });
  const profileId = project?.profileId ?? await resolveProfileId();
  const handoffs = await db.memory.findMany({ where: { profileId, projectId, kind: "handoff" }, orderBy: { createdAt: "desc" }, take: 5 });
  const h = handoffs.map(m => `- ${m.content}`).join("\n") || "- (keine)";
  const stamp = new Date().toISOString();
  return {
    "CLAUDE.md": `${ctx}\n\n## Letzte Handoffs\n${h}\n\n<!-- generiert von Jarvis Bridge ${stamp} -->`,
    "AGENTS.md": `${ctx}\n\n## Letzte Handoffs\n${h}\n\n## Arbeitsweise\n- Kleine Schritte, nach jedem Schritt Status melden.\n- Keine Secrets/.env lesen oder committen.\n\n<!-- generiert von Jarvis Bridge ${stamp} -->`,
  };
}
