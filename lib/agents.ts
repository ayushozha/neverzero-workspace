// Agent registry — file-backed JSON store under data/agents.json.
// For hackathon-grade demos only; swap for a real DB before production.
//
// An "agent" here is a per-(workspace × client × machine) connection: each
// install of NeverZero into Claude Desktop / Cursor / Aider / etc. mints
// one Agent record, which carries its own API key.

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ClientId =
  | 'claude-desktop'
  | 'claude-code'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'antigravity'
  | 'zed'
  | 'continue'
  | 'aider'
  | 'custom';

export type AgentStatus = 'pending' | 'connected' | 'revoked';
export type AgentScope = 'read' | 'write';

export interface Agent {
  // Required fields per the spec
  id: string;                 // agent-id (uuid-ish slug)
  name: string;               // agent-name (user chosen, e.g. "Codex on Sam's MacBook")
  from: ClientId;             // agent-from (which platform/client it lives in)
  ownedBy: string;            // agent-ownedby (workspace owner id)

  // Auth
  apiKeyPrefix: string;       // safe display, e.g. "nz_live_x9K2"
  apiKeyHash: string;         // sha256 of the full key — full key only returned once
  scopes: AgentScope[];
  workspace: string;          // e.g. "acme"

  // Lifecycle
  status: AgentStatus;
  createdAt: string;          // ISO
  lastSeenAt: string | null;  // ISO when the agent first verified

  // Platform-specific
  platform: {
    os?: 'mac' | 'win' | 'linux' | 'wsl' | null;
    runtime?: string;         // e.g. "Claude Desktop 0.7.4"
    machine?: string;         // user-supplied label
  };

  // Free-form bag — install snippet used, MCP endpoint url, etc.
  metadata: Record<string, string>;
}

/** Shape returned on creation only — full key shown ONCE. */
export interface AgentCreatedResponse {
  agent: Agent;
  apiKey: string;             // full key, e.g. "nz_live_..."
  installSnippet: string;     // pre-filled snippet for the chosen client
}

// ───────── Storage ─────────

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const STORE = join(DATA_DIR, 'agents.json');

interface StoreFile {
  agents: Agent[];
}

async function readStore(): Promise<StoreFile> {
  try {
    const txt = await readFile(STORE, 'utf8');
    const parsed = JSON.parse(txt) as Partial<StoreFile>;
    return { agents: Array.isArray(parsed.agents) ? parsed.agents : [] };
  } catch {
    return { agents: [] };
  }
}

async function writeStore(s: StoreFile): Promise<void> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await writeFile(STORE, JSON.stringify(s, null, 2), 'utf8');
}

// ───────── ID + Key generation ─────────

function shortId(prefix: string): string {
  return prefix + '_' + randomBytes(6).toString('hex');
}

function newApiKey(): { key: string; prefix: string; hash: string } {
  const body = randomBytes(24).toString('hex'); // 48 hex chars
  const key = `nz_live_${body}`;
  const prefix = key.slice(0, 12); // "nz_live_xxxx"
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

// ───────── Public API ─────────

export async function listAgents(): Promise<Agent[]> {
  const s = await readStore();
  return s.agents.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const s = await readStore();
  return s.agents.find((a) => a.id === id);
}

export interface CreateAgentInput {
  name: string;
  from: ClientId;
  ownedBy?: string;      // defaults to 'sam' (single-user demo)
  workspace?: string;    // defaults to 'acme'
  scopes?: AgentScope[]; // defaults to ['read', 'write']
  platform?: Agent['platform'];
  metadata?: Record<string, string>;
}

export async function createAgent(input: CreateAgentInput): Promise<AgentCreatedResponse> {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error('Agent name is required.');
  if (trimmedName.length > 80) throw new Error('Agent name must be ≤ 80 characters.');

  const { key, prefix, hash } = newApiKey();
  const agent: Agent = {
    id: shortId('agt'),
    name: trimmedName,
    from: input.from,
    ownedBy: input.ownedBy ?? 'sam',
    apiKeyPrefix: prefix,
    apiKeyHash: hash,
    scopes: input.scopes ?? ['read', 'write'],
    workspace: input.workspace ?? 'acme',
    status: 'pending',
    createdAt: new Date().toISOString(),
    lastSeenAt: null,
    platform: input.platform ?? {},
    metadata: input.metadata ?? {},
  };

  const store = await readStore();
  store.agents.push(agent);
  await writeStore(store);

  return {
    agent,
    apiKey: key,
    installSnippet: buildInstallSnippet(agent.from, key, agent.workspace),
  };
}

export async function revokeAgent(id: string): Promise<Agent | undefined> {
  const store = await readStore();
  const idx = store.agents.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const existing = store.agents[idx];
  if (!existing) return undefined;
  const updated: Agent = { ...existing, status: 'revoked' };
  store.agents[idx] = updated;
  await writeStore(store);
  return updated;
}

/** Called when the agent first checks in — flips status to 'connected'. */
export async function markVerified(id: string): Promise<Agent | undefined> {
  const store = await readStore();
  const idx = store.agents.findIndex((a) => a.id === id);
  if (idx < 0) return undefined;
  const existing = store.agents[idx];
  if (!existing) return undefined;
  const updated: Agent = {
    ...existing,
    status: existing.status === 'revoked' ? 'revoked' : 'connected',
    lastSeenAt: new Date().toISOString(),
  };
  store.agents[idx] = updated;
  await writeStore(store);
  return updated;
}

// ───────── Snippet generation ─────────

function buildInstallSnippet(client: ClientId, apiKey: string, workspace: string): string {
  switch (client) {
    case 'claude-desktop':
    case 'cursor':
    case 'windsurf':
    case 'continue':
    case 'zed':
      return JSON.stringify(
        {
          mcpServers: {
            neverzero: {
              command: 'npx',
              args: ['-y', '@neverzero/mcp'],
              env: { NEVERZERO_API_KEY: apiKey, NEVERZERO_WORKSPACE: workspace },
            },
          },
        },
        null,
        2,
      );
    case 'claude-code':
      return [
        `claude mcp add neverzero \\`,
        `  --command "npx -y @neverzero/mcp" \\`,
        `  --env NEVERZERO_API_KEY=${apiKey} \\`,
        `  --env NEVERZERO_WORKSPACE=${workspace}`,
      ].join('\n');
    case 'antigravity':
      return JSON.stringify(
        {
          tool_servers: [
            {
              id: 'neverzero',
              protocol: 'mcp',
              command: 'npx -y @neverzero/mcp',
              env: { NEVERZERO_API_KEY: apiKey },
              auto_invoke: ['brain.read', 'memory.recall'],
            },
          ],
        },
        null,
        2,
      );
    case 'aider':
      return [
        `export NEVERZERO_API_KEY=${apiKey}`,
        `aider \\`,
        `  --mcp-server "npx -y @neverzero/mcp" \\`,
        `  --read-from-mcp brain.read,memory.recall`,
      ].join('\n');
    case 'vscode':
      return JSON.stringify(
        {
          'neverzero.apiKey': apiKey,
          'neverzero.workspace': workspace,
          'neverzero.autoReadBrain': true,
          'neverzero.copilot.injectMemory': true,
        },
        null,
        2,
      );
    case 'custom':
      return [
        `curl https://api.neverzero.cloud/v1/brain/${workspace} \\`,
        `  -H "Authorization: Bearer ${apiKey}"`,
      ].join('\n');
  }
}
