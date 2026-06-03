-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "allowedTools" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "instructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "references" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "requiredMcps" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "requiredProviderRole" TEXT NOT NULL DEFAULT 'executor',
ADD COLUMN     "sideEffects" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "triggerPhrases" TEXT NOT NULL DEFAULT '[]';
