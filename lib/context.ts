import { db } from "./db";
import { BASE_PROMPT } from "./base-prompt";

// Context Builder: compact system prompt instead of dumping everything.
async function readSetting(key: string): Promise<string> {
  const r = await db.setting.findUnique({ where: { key } }).catch(() => null);
  return r?.value ?? "";
}

export async function buildContext(projectId: string) {
  const custom = await readSetting("CUSTOM_INSTRUCTIONS");
  const profile = await readSetting("USER_PROFILE");
  const prefix = [BASE_PROMPT];
  if (profile) prefix.push(`Nutzer-Profil:\n${profile}`);
  if (custom) prefix.push(`Zusätzliche Anweisungen:\n${custom}`);
  const projectCtx = await buildProjectCtx(projectId);
  return [prefix.join("\n\n"), projectCtx].filter(Boolean).join("\n\n");
}

async function buildProjectCtx(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) return "";
  const memories = await db.memory.findMany({
    where: { OR: [{ projectId }, { projectId: null }] },
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
  const handoffs = await db.memory.findMany({ where: { projectId, kind: "handoff" }, orderBy: { createdAt: "desc" }, take: 5 });
  const h = handoffs.map(m => `- ${m.content}`).join("\n") || "- (keine)";
  const stamp = new Date().toISOString();
  return {
    "CLAUDE.md": `${ctx}\n\n## Letzte Handoffs\n${h}\n\n<!-- generiert von Jarvis Bridge ${stamp} -->`,
    "AGENTS.md": `${ctx}\n\n## Letzte Handoffs\n${h}\n\n## Arbeitsweise\n- Kleine Schritte, nach jedem Schritt Status melden.\n- Keine Secrets/.env lesen oder committen.\n\n<!-- generiert von Jarvis Bridge ${stamp} -->`,
  };
}
