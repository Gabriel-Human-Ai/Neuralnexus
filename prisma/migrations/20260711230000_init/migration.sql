-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goal" TEXT NOT NULL DEFAULT '',
    "techStack" TEXT NOT NULL DEFAULT '',
    "rules" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Memory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "purpose" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ModelRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ProfileSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfileSetting_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "workspaceId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "workroomRole" TEXT,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '✦',
    "role" TEXT NOT NULL DEFAULT '',
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "preferredModel" TEXT NOT NULL DEFAULT 'auto',
    "skillIds" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Skill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "name" TEXT NOT NULL,
    "brandName" TEXT NOT NULL DEFAULT '',
    "brandColor" TEXT NOT NULL DEFAULT '#8B5CF6',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workspace_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "name" TEXT NOT NULL,
    "agentIds" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Workflow_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Output" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL DEFAULT '',
    "prompt" TEXT NOT NULL DEFAULT '',
    "draftContent" TEXT NOT NULL,
    "finalContent" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "skillId" TEXT,
    "skillVersion" INTEGER NOT NULL DEFAULT 1,
    "model" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL DEFAULT '',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" REAL NOT NULL DEFAULT 0,
    "knowledgeIds" TEXT NOT NULL DEFAULT '',
    "parentOutputId" TEXT,
    "forkChangedVariable" TEXT,
    "qualityReport" TEXT NOT NULL DEFAULT '',
    "claimsJson" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Output_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "outputId" TEXT NOT NULL,
    "skillId" TEXT,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "domainTag" TEXT NOT NULL DEFAULT 'general',
    "claimText" TEXT NOT NULL,
    "correctionText" TEXT NOT NULL DEFAULT '',
    "warning" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CorrectionRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "contextTag" TEXT NOT NULL DEFAULT 'general',
    "chosenDesc" TEXT NOT NULL,
    "rejectedDesc" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT 'text',
    "source" TEXT NOT NULL,
    "evidence" TEXT NOT NULL DEFAULT '',
    "confidence" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "projectId" TEXT,
    "outputId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaptureRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "sourceHost" TEXT NOT NULL DEFAULT '',
    "captureType" TEXT NOT NULL DEFAULT 'selection',
    "action" TEXT NOT NULL DEFAULT 'save_reference',
    "text" TEXT NOT NULL DEFAULT '',
    "screenshotData" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "decision" TEXT NOT NULL DEFAULT '',
    "decisionNote" TEXT NOT NULL DEFAULT '',
    "indexEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" DATETIME,
    CONSTRAINT "CaptureRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TasteRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "contextTag" TEXT NOT NULL DEFAULT 'general',
    "text" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TasteRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectiveGuard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT NOT NULL,
    "domainTag" TEXT NOT NULL,
    "warning" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SkillRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "skillId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'learned',
    "sourceOutputId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BenchmarkRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL DEFAULT '',
    "primaryModel" TEXT NOT NULL,
    "challengerModel" TEXT NOT NULL,
    "similarityScore" INTEGER NOT NULL DEFAULT 0,
    "primaryCostUsd" REAL NOT NULL DEFAULT 0,
    "challengerCostUsd" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BenchmarkRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ModelPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "projectId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL DEFAULT '*',
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT 'autopilot',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModelPolicy_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_profileId_idx" ON "Project"("profileId");

-- CreateIndex
CREATE INDEX "Message_profileId_projectId_idx" ON "Message"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "Memory_profileId_projectId_idx" ON "Memory"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "ModelRun_profileId_projectId_idx" ON "ModelRun"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "ProfileSetting_profileId_idx" ON "ProfileSetting"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileSetting_profileId_key_key" ON "ProfileSetting"("profileId", "key");

-- CreateIndex
CREATE INDEX "Profile_type_idx" ON "Profile"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_profileId_idx" ON "Agent"("profileId");

-- CreateIndex
CREATE INDEX "Skill_profileId_idx" ON "Skill"("profileId");

-- CreateIndex
CREATE INDEX "Workspace_profileId_idx" ON "Workspace"("profileId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_profileId_workspaceId_idx" ON "WorkspaceMember"("profileId", "workspaceId");

-- CreateIndex
CREATE INDEX "Workflow_profileId_idx" ON "Workflow"("profileId");

-- CreateIndex
CREATE INDEX "Output_profileId_projectId_idx" ON "Output"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "Output_profileId_status_idx" ON "Output"("profileId", "status");

-- CreateIndex
CREATE INDEX "CorrectionRecord_profileId_projectId_idx" ON "CorrectionRecord"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "DecisionRecord_profileId_projectId_idx" ON "DecisionRecord"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "DecisionRecord_profileId_source_status_idx" ON "DecisionRecord"("profileId", "source", "status");

-- CreateIndex
CREATE INDEX "CaptureRecord_profileId_idx" ON "CaptureRecord"("profileId");

-- CreateIndex
CREATE INDEX "TasteRule_profileId_status_idx" ON "TasteRule"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectiveGuard_model_domainTag_warning_key" ON "CollectiveGuard"("model", "domainTag", "warning");

-- CreateIndex
CREATE INDEX "SkillRule_profileId_skillId_idx" ON "SkillRule"("profileId", "skillId");

-- CreateIndex
CREATE INDEX "SkillRule_profileId_status_idx" ON "SkillRule"("profileId", "status");

-- CreateIndex
CREATE INDEX "BenchmarkRun_profileId_projectId_idx" ON "BenchmarkRun"("profileId", "projectId");

-- CreateIndex
CREATE INDEX "ModelPolicy_profileId_projectId_idx" ON "ModelPolicy"("profileId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelPolicy_projectId_stepName_key" ON "ModelPolicy"("projectId", "stepName");
