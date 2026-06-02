import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { config } from 'dotenv';
config();

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import {
  getRegistryPayload,
  getProvidersPayload,
  getMcpPayload,
  getRunHistoryPayload,
  loadRegistryFromYaml
} from './src/skillLabBackend.js';

async function main() {
  console.log('Seeding Database from YAML configs (source of truth for librarian:* seeds etc)...');
  
  // 1. Seed Skills
  // Load directly from yaml (source of truth) to populate DB
  const registry = await loadRegistryFromYaml();
  for (const skill of registry.skills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: {
        tier: skill.tier,
        path: skill.path,
        description: skill.description,
        trustTier: skill.trustTier,
        status: skill.status,
      },
      create: {
        name: skill.name,
        tier: skill.tier,
        path: skill.path,
        description: skill.description,
        trustTier: skill.trustTier,
        status: skill.status,
      }
    });
  }
  console.log(`✅ Seeded ${registry.skills.length} skills (including any librarian:* explainer seeds from registry.yaml)`);

  // 2. Seed Providers
  const providers = await getProvidersPayload();
  await prisma.providerConfig.upsert({
    where: { id: 1 }, // simple, or use first
    update: {
      defaultProvider: providers.defaultProvider,
      defaultModel: providers.defaultModel,
      roles: JSON.stringify(providers.roles),
      providers: JSON.stringify(providers.providers),
      envStatus: JSON.stringify(providers.envStatus)
    },
    create: {
      defaultProvider: providers.defaultProvider,
      defaultModel: providers.defaultModel,
      roles: JSON.stringify(providers.roles),
      providers: JSON.stringify(providers.providers),
      envStatus: JSON.stringify(providers.envStatus)
    }
  });
  console.log(`✅ Seeded Provider Configurations`);

  // 3. Seed MCP Servers
  const mcp = await getMcpPayload();
  for (const [serverName, server] of Object.entries(mcp.servers)) {
    await prisma.mcpServerConfig.upsert({
      where: { name: serverName },
      update: {
        enabled: server.enabled,
        purpose: server.purpose,
        trustTier: server.trustTier,
        scope: JSON.stringify(server.scope || []),
        envKey: server.envKey,
        envConfigured: server.envConfigured,
      },
      create: {
        name: serverName,
        enabled: server.enabled,
        purpose: server.purpose,
        trustTier: server.trustTier,
        scope: JSON.stringify(server.scope || []),
        envKey: server.envKey,
        envConfigured: server.envConfigured,
      }
    });
  }
  console.log(`✅ Seeded ${Object.keys(mcp.servers).length} MCP Servers`);

  // 4. Seed History
  const history = await getRunHistoryPayload();
  for (const entry of history.entries) {
    await prisma.runHistory.create({
      data: {
        command: entry.command,
        exitCode: entry.exitCode,
        durationMs: entry.durationMs,
        ok: entry.ok,
        stdoutPreview: entry.stdoutPreview,
        stderrPreview: entry.stderrPreview,
        timestamp: new Date(entry.timestamp)
      }
    });
  }
  console.log(`✅ Seeded ${history.entries.length} History entries`);

  console.log('Database successfully seeded!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
