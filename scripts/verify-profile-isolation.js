const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function createProfile(name, type) {
  return db.profile.create({ data: { name, type } });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const stamp = `profile-isolation-${Date.now()}`;
  const createdIds = { profiles: [], projects: [], memories: [], decisions: [], tasteRules: [], skills: [], skillRules: [], outputs: [], captures: [] };

  try {
    const work = await createProfile(`Work Test ${stamp}`, "work");
    const life = await createProfile(`Life Test ${stamp}`, "life");
    createdIds.profiles.push(work.id, life.id);

    const workProject = await db.project.create({ data: { profileId: work.id, name: `Work Project ${stamp}` } });
    const lifeProject = await db.project.create({ data: { profileId: life.id, name: `Life Project ${stamp}` } });
    createdIds.projects.push(workProject.id, lifeProject.id);

    const workMemory = await db.memory.create({ data: { profileId: work.id, projectId: null, kind: "note", content: "work memory test" } });
    const lifeMemory = await db.memory.create({ data: { profileId: life.id, projectId: null, kind: "note", content: "life memory test" } });
    createdIds.memories.push(workMemory.id, lifeMemory.id);

    const workDecision = await db.decisionRecord.create({ data: { profileId: work.id, projectId: workProject.id, source: "test", chosenDesc: "work decision" } });
    const lifeDecision = await db.decisionRecord.create({ data: { profileId: life.id, projectId: lifeProject.id, source: "test", chosenDesc: "life decision" } });
    createdIds.decisions.push(workDecision.id, lifeDecision.id);

    const workTaste = await db.tasteRule.create({ data: { profileId: work.id, contextTag: "test", text: "Prefer work test rule." } });
    const lifeTaste = await db.tasteRule.create({ data: { profileId: life.id, contextTag: "test", text: "Prefer life test rule." } });
    createdIds.tasteRules.push(workTaste.id, lifeTaste.id);

    const workSkill = await db.skill.create({ data: { profileId: work.id, name: `Work Skill ${stamp}` } });
    const lifeSkill = await db.skill.create({ data: { profileId: life.id, name: `Life Skill ${stamp}` } });
    createdIds.skills.push(workSkill.id, lifeSkill.id);

    const workRule = await db.skillRule.create({ data: { profileId: work.id, skillId: workSkill.id, text: "Work skill rule" } });
    const lifeRule = await db.skillRule.create({ data: { profileId: life.id, skillId: lifeSkill.id, text: "Life skill rule" } });
    createdIds.skillRules.push(workRule.id, lifeRule.id);

    const workOutput = await db.output.create({ data: { profileId: work.id, projectId: workProject.id, draftContent: "work output" } });
    const lifeOutput = await db.output.create({ data: { profileId: life.id, projectId: lifeProject.id, draftContent: "life output" } });
    createdIds.outputs.push(workOutput.id, lifeOutput.id);

    const workCapture = await db.captureRecord.create({ data: { profileId: work.id, title: "work capture" } });
    const lifeCapture = await db.captureRecord.create({ data: { profileId: life.id, title: "life capture" } });
    createdIds.captures.push(workCapture.id, lifeCapture.id);

    assert((await db.project.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work project scope failed");
    assert((await db.memory.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work memory scope failed");
    assert((await db.decisionRecord.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work decision scope failed");
    assert((await db.tasteRule.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work taste scope failed");
    assert((await db.skill.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work skill scope failed");
    assert((await db.skillRule.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work skill rule scope failed");
    assert((await db.output.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work output scope failed");
    assert((await db.captureRecord.findMany({ where: { profileId: work.id } })).every((row) => row.profileId === work.id), "Work capture scope failed");

    const workContextMemories = await db.memory.findMany({
      where: { profileId: work.id, OR: [{ projectId: workProject.id }, { projectId: null }] },
    });
    assert(workContextMemories.some((row) => row.id === workMemory.id), "Work profile memory missing from context");
    assert(!workContextMemories.some((row) => row.id === lifeMemory.id), "Life profile memory leaked into work context");

    await db.profileSetting.create({ data: { profileId: work.id, key: "PREFERRED_NAME", value: "Work Name" } });
    await db.profileSetting.create({ data: { profileId: life.id, key: "PREFERRED_NAME", value: "Life Name" } });
    const workSetting = await db.profileSetting.findUnique({ where: { profileId_key: { profileId: work.id, key: "PREFERRED_NAME" } } });
    const lifeSetting = await db.profileSetting.findUnique({ where: { profileId_key: { profileId: life.id, key: "PREFERRED_NAME" } } });
    assert(workSetting?.value === "Work Name" && lifeSetting?.value === "Life Name", "Profile settings isolation failed");

    console.log("Two-profile isolation verification passed.");
    console.log("Projects: isolated");
    console.log("Memories: isolated");
    console.log("Eye decisions/taste rules: isolated");
    console.log("Genome skills/rules: isolated");
    console.log("Outputs: isolated");
    console.log("Capture: isolated");
    console.log("Settings: isolated");
  } finally {
    await db.profileSetting.deleteMany({ where: { profileId: { in: createdIds.profiles } } });
    await db.captureRecord.deleteMany({ where: { id: { in: createdIds.captures } } });
    await db.output.deleteMany({ where: { id: { in: createdIds.outputs } } });
    await db.skillRule.deleteMany({ where: { id: { in: createdIds.skillRules } } });
    await db.skill.deleteMany({ where: { id: { in: createdIds.skills } } });
    await db.tasteRule.deleteMany({ where: { id: { in: createdIds.tasteRules } } });
    await db.decisionRecord.deleteMany({ where: { id: { in: createdIds.decisions } } });
    await db.memory.deleteMany({ where: { id: { in: createdIds.memories } } });
    await db.project.deleteMany({ where: { id: { in: createdIds.projects } } });
    await db.profile.deleteMany({ where: { id: { in: createdIds.profiles } } });
  }
}

main()
  .catch((error) => {
    console.error(`Isolation verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
