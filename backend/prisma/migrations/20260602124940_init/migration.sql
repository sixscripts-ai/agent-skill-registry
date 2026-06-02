-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "trustTier" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" SERIAL NOT NULL,
    "defaultProvider" TEXT NOT NULL DEFAULT 'local',
    "defaultModel" TEXT NOT NULL DEFAULT 'none',
    "roles" TEXT NOT NULL DEFAULT '{}',
    "providers" TEXT NOT NULL DEFAULT '{}',
    "envStatus" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpServerConfig" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "purpose" TEXT NOT NULL,
    "trustTier" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '[]',
    "envKey" TEXT,
    "envConfigured" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpServerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunHistory" (
    "id" SERIAL NOT NULL,
    "command" TEXT NOT NULL,
    "exitCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "stdoutPreview" TEXT NOT NULL,
    "stderrPreview" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "McpServerConfig_name_key" ON "McpServerConfig"("name");
