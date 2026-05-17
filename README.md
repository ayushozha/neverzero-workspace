<div align="center">

# NeverZero

**The shared context layer for AI-native teams.**

One workspace. Many agents. Zero context loss across sessions, devices, or machines.

[Pitch](#-the-pitch) ·
[Why this exists](#-why-this-exists) ·
[Architecture](#-architecture) ·
[Sponsor integrations](#-sponsor-integrations) ·
[Demo flow](#-the-demo-flow) ·
[Quick start](#-quick-start) ·
[API](#-http-api-reference) ·
[CLI](#-cli-reference)

</div>

---

## The pitch

NeverZero is **mission control for AI agents**.

You open one workspace. Your team's Claude, Codex, Cursor, Aider, GStack runners
— and any subagents they spawn — all register here. They share a compressed
brain, claim work without stepping on each other, and hand off cleanly when a
session ends. The shared document is the command surface: type
`@iris @forge /research onboarding flow problems`, and a research subfile
appears in the doc tree, populated by The Hog, summarized by ZeroEntropy,
pinned to GBrain memory. Every heavy output becomes a linked subfile so the
main doc stays clean.

The moat is the **coordinated context layer** underneath. Multiple registered
agents enter the same room, receive the same compressed context, resolve
conflicts *before* GitHub sees them, and resume without restating themselves.
That's what NeverZero proves end-to-end.

---

## Why this exists

Today's AI dev loop is a thousand isolated chats. Every agent re-discovers
the project from scratch. Every session re-explains the goal. Every
parallel agent stomps on the same file because nothing tells them someone
else is already there. Important decisions evaporate into chat history that
no other agent will ever read.

The cost compounds:

- **Wasted context** — every session restates the goal, the constraints, the
  pinned decisions. Multiply by 10 agents and 50 sessions a week.
- **Silent conflicts** — two agents edit `onboarding.tsx` in parallel,
  GitHub sees the second push, and the first one's work quietly disappears.
- **Lost handoffs** — yesterday's Claude session knew exactly where things
  were. Today's Codex starts cold and asks "what are we doing?"
- **No durable memory** — research findings, failed attempts, voice rules,
  and pricing decisions live in chat transcripts no agent can search.

NeverZero is the layer that fixes this. Agents register. The brain shares
the same compressed context with all of them. Skills produce structured
subfiles instead of disposable chat. Conflicts get detected and resolved
*before* the final push. Resume packets let a brand-new agent on a brand-new
machine pick up exactly where the last one stopped.

This isn't a chat app. It's the protocol your agents speak to each other.

---

## What's in the box

| Surface | Path | What it is |
|---|---|---|
| **Workstation** | `/workstation` | Mission-control prototype — top bar, sidebar, doc, right rail, agent inspector, memory & context panels. |
| **Org brain** | `/<org>/brain` | The command center. A clean shared doc with `@agent /skill task` autocomplete. Every skill creates a subfile. |
| **Subfile page** | `/<org>/docs/<id>` | Same workstation shell, focused on one subfile. Polls live while the skill runs. |
| **Research detail** | `/<org>/research/<id>` | The Hog-backed research report with SSE progress. |
| **Agent registry** | `/<org>/agents` | Every agent + subagent, their machine, their last heartbeat. |
| **Install flow** | `/<org>/install` | Mint API keys per (agent × client × machine). |
| **Brain creation** | `/create-brain` | Spin up a new org with mission, providers, pinned memory. |
| **`nz` CLI** | `cli/` | Local-first control plane. Init / join / claim / log / handoff / resume / status / conflict-check. |
| **Mobile** | `mobile/android/` | Kotlin + Java Android app for the workspace shell. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Humans + Agents (the room)                         │
│   Claude · Codex · Cursor · Aider · GStack runners · Subagents              │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                  REST + SSE         │       MCP / API key auth
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Next.js 16 (App Router, RSC)                          │
│                                                                             │
│   /<org>/brain  ── Doc-as-command-surface ──► POST /api/orgs/<slug>/skills/run
│   /<org>/docs/<id> ── Subfile shell, live polling                           │
│   /<org>/research/<id> ── SSE progress channel                              │
│                                                                             │
│   topbar Hand off  ──► /api/orgs/<slug>/resume     (Resume Packet)          │
│   topbar Push to GitHub ─► /api/orgs/<slug>/github (GitHub Bundle)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         lib/ — domain layer                                 │
│                                                                             │
│   orgs.ts       agents.ts       docs.ts       providers.ts                  │
│   research.ts   hog.ts          events.ts     skill-runner.ts               │
│   file-claims.ts                workspace-ledger.ts                         │
│                                                                             │
│   lib/adapters/                                                             │
│     gbrain.ts       — pinMemory()   recallMemory()                          │
│     gstack.ts       — claimFile()   release()   emitProgress()              │
│     zeroentropy.ts  — compress()    packetize()                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              data/ — file-backed JSON stores (hackathon-grade)              │
│                                                                             │
│   orgs.json     agents.json     docs.json     research.json                 │
│   file-claims.json              workspace-ledger.ndjson                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The three big ideas

1. **The doc is the command surface.** Typing `@agent /skill task` in the
   org brain doesn't just send a message — it dispatches a real skill,
   creates a structured subfile in the tree, and broadcasts a
   `context.update` to every other agent. The main doc never bloats; it
   stays a curated index of decisions and links to subfiles.

2. **Skills produce artifacts, not chat.** `/plan`, `/research`, `/verify`,
   `/build`, `/resume`, `/handoff`, `/spawn` — each one writes a typed
   subfile (`Plan: ...`, `Research: ...`, `Verification Report: ...`)
   to the doc tree under the company brain root. The artifact is the
   canonical record. Reviewers and future agents read the subfiles, not
   the transcript.

3. **Conflicts are resolved before GitHub.** `lib/file-claims.ts` is a
   file-level claim store. When agent B tries to claim a file agent A
   already holds, the server returns HTTP 409 *and* auto-generates a
   `Conflict Resolution Packet: <path>` subfile listing both claimants,
   their reasons, and a recommended resolution. GitHub only sees the
   merged version.

### Live updates

Every meaningful action publishes to an in-process event bus
(`lib/events.ts`). Clients on `/<org>/brain` subscribe via SSE
(`/api/events?org=<slug>`) and refresh the affected panels — no polling,
no WebSocket infrastructure required for the hackathon scale.

Channels:
- `org:<slug>` — fans `skill.started`, `skill.complete`, `context.update`,
  `build.*`, `file.claimed`, `file.conflict`, `file.released`,
  `verify.complete`, `resume.created`, `github.bundle_created`,
  `agent.spawned`.
- `research:<id>` — per-research progress for the detail page.

### Subfile schema

Every subfile carries `skillRun` metadata so the UI can reason about it:

```ts
interface SkillRunMeta {
  skillId: string;          // "gbrain.plan" | "the-hog.verify" | …
  command: string;          // "/plan"
  kind: SkillKind;          // 27 typed kinds across 6 providers
  task: string;
  requestedBy: string;
  mentionedAgents: { id: string; name: string }[];
  status: 'pending' | 'running' | 'done' | 'error';
  startedAt: string;
  completedAt: string | null;
}
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) | Latest RSC + Server Actions. One repo for UI + API. |
| UI | **React 19** + TypeScript strict | Concurrent rendering. Types end-to-end. |
| Runtime | **Node 20+** | ESM, native fetch, `node:crypto`. |
| Styling | Hand-rolled CSS, `oklch()` color | One workstation theme reused across `/workstation`, `/<org>/brain`, `/<org>/docs/<id>`. Zero CSS-in-JS overhead. |
| Realtime | **Server-Sent Events** | One-way fan-out fits the use case; no WebSocket infra. |
| State | File-backed JSON (`data/*.json`) | Demo durability without a DB. Swap for Postgres or Durable Objects later. |
| Auth | Per-agent API keys, `sha256` hashed | Full key shown once at create time. |
| CLI | Pure Node + `tsx` | No build step in dev. `pnpm run nz <cmd>` from CLI dir. |
| Mobile | Kotlin + Java (Android, Gradle KTS) | Native shell; uses the same `/api/context` endpoint. |
| Package manager | **pnpm** | Workspaces (root + `cli/`). |

### Why no database

For the hackathon we deliberately keep everything file-backed in `data/`:

- Reviewers can `cat data/docs.json` and *see* the demo state.
- Reset is `rm -rf data/`.
- Zero infra to set up before judging.
- Real production move is one swap of `readStore` / `writeStore` per file —
  every read goes through one helper.

### Why no LLM in the runner

The skill runner generates structured markdown templates instead of calling
a model. Reasons:

1. **Determinism** — judges see the same output every demo run.
2. **No API keys leak** — only The Hog (research) and the public web are
   actually hit for real network calls.
3. **The artifact, not the prose, is the proof.** A `Plan` subfile with
   six dated rows, an `Estimate` with effort×risk, a `Build` with eight
   ledger rows — these are what reviewers and future agents read.

You can drop in a real LLM call site by replacing one template function
in `lib/skill-runner.ts`.

---

## Sponsor integrations

NeverZero ships a **provider catalog** (`lib/providers.ts`) — six providers,
27 skills total. Each org installs the providers it wants; only installed
skills appear in the `/` autocomplete on the brain command bar.

| Provider | Skills | Purpose | Real call surface |
|---|---|---|---|
| **The Hog** | `/research`, `/review`, `/factcheck`, `/redteam`, `/verify` | Web intelligence + audit | **Real**: `lib/hog.ts` hits `companies/search` + `people/search` with `X-Access-Key` + `X-Secret-Key`. Deep-research endpoint attempted with graceful 404 fallback. |
| **ZeroEntropy** | `/research`, `/compete`, `/recall`, `/cite`, `/summarize`, `/compress` | Context compression | `lib/adapters/zeroentropy.ts` is the single labeled compression surface. Every `compress()` in `skill-runner.ts` + every `/resume` packet flows through it. Function body is a deterministic local compressor; swap for the real API in one place. |
| **GBrain** | `/plan`, `/decompose`, `/estimate`, `/schedule`, `/remember` | Durable memory + planning | `lib/adapters/gbrain.ts` exposes `pinMemory()` + `recallMemory()`. `/remember` and `/pin` writes go through it into the org's pinned memory list (visible in the brain sidebar). |
| **GStack** | `/scaffold`, `/refactor`, `/test`, `/lint`, `/build`, `/spawn` | Build / scaffold / spawn | `lib/adapters/gstack.ts` exposes `claimFile()` / `releaseAll()` / `emitProgress()`. `/build` claims target files, emits `build.*` ledger events, releases on completion. |
| **Lightsprint** | `/deploy`, `/rollback`, `/monitor` | Deployment provider | Templated deploy / rollback / monitor subfiles. Real deploy surface stubbed. |
| **NeverZero** | `/remember`, `/compress`, `/pin`, `/resume`, `/handoff` | Memory + cross-session continuity | Native to the platform. `/resume` snapshots the room state; `/handoff` writes a compressed envelope. |

### The Hog — concrete

```ts
// lib/hog.ts
const HOG_BASE = 'https://app.thehog.ai';
fetch(`${HOG_BASE}/api/v1/companies/search`, {
  headers: {
    'X-Access-Key': process.env.HOG_API_KEY!,
    'X-Secret-Key': process.env.HOG_API_SECRET!,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query, limit: 8 }),
});
```

Triggered by `@<agents> /research <topic>` from the brain command bar.
Returns to a `Research: <topic>` subfile that streams progress over
`/api/research/<id>/events` (SSE).

### ZeroEntropy — concrete

```ts
// lib/adapters/zeroentropy.ts
export function compress({ text, maxChars = 280 }): string {
  // … deterministic compression
}
export function packetize({ text, goal }): {
  summary: string; blockers: string[]; nextAction: string; decisions: string[];
}
```

Used by `lib/skill-runner.ts` (the `compress()` step that produces every
`context.update` broadcast) and by `/api/orgs/<slug>/resume`.

### GBrain — concrete

```ts
// lib/adapters/gbrain.ts
await pinMemory({ orgSlug, kind: 'fact', text: task });
```

Every successful `/remember` or `/pin` skill writes through this surface.
The pinned memory list is what every new agent receives on cold start via
`/api/context`.

### GStack — concrete

```ts
// lib/adapters/gstack.ts
await gstackClaimFile({ orgSlug, agentId, agentName, filePath, reason });
await gstackReleaseAll(orgSlug, agentId);
gstackEmitProgress({ orgSlug, docId, step: 'build.scaffold', message });
```

The `/build` endpoint composes these into an 8-step pipeline that writes
ledger rows into the Build subfile in real time.

---

## The demo flow

This is the 10-beat narrative for judges. Every beat below is **wired and
verified** on a live dev server.

### 1. Landing → Workstation

Open `/workstation`. The polished mission-control mockup explains the
pitch in one screen.

### 2. Agent registration

Go to `/<org>/install`, pick a client (Claude Desktop / Cursor / Aider /
Codex / VS Code / …), name the agent, copy the install snippet. The
server mints a per-(agent × client × machine) API key. You can see every
agent live in `/<org>/agents` with their `from` client, `lastSeenAt`, and
status (pending / connected / revoked).

Subagents work the same way:
```bash
curl -X POST localhost:3000/api/orgs/atlas/spawn \
  -H "Content-Type: application/json" \
  -d '{"parentAgentId":"agt_…","name":"Forge-helper-A","purpose":"draft consent copy edits"}'
```
The child agent appears with `parentAgentId` set; a `Subagent: <name>`
subfile is written so the doc tree reflects the new tree.

### 3. Command center

Open `/<org>/brain`. Type `@` for agents, `/` for skills. The autocomplete
shows only skills from providers installed on the org. Hit Enter:

```text
@Iris @Forge /research onboarding flow problems for AI agent workspaces
```

The main doc stays clean. A `Research: onboarding flow problems …` subfile
appears in the sidebar tree and in the Open Work section.

### 4. Research with The Hog

The research orchestrator calls The Hog `/companies/search` and
`/people/search`, summarizes hits, writes the subfile, and streams progress
to the right rail's Activity tab via SSE. Done in ~5 seconds with real
network calls.

### 5. Verify research

```bash
curl -X POST localhost:3000/api/orgs/atlas/verify \
  -d '{"subfileId":"sub_17b346ec5849","requestedBy":"loop"}'
```

A `Verification Report: <topic>` subfile is created *nested under* the
research subfile. The research subfile is annotated with the verdict
(`ship`, `ship-with-edits`, or `reject — no usable sources`) and a
back-link to the report. Verdict is derived from source count + weak-claim
markers + pinned-memory conflicts.

### 6. Build from shared context

```bash
curl -X POST localhost:3000/api/orgs/atlas/build \
  -d '{"agentId":"agt_…","task":"improve onboarding flow using verified findings","targetFiles":["src/onboarding/onboarding.tsx","src/onboarding/copy.ts"],"requestedBy":"doc-author"}'
```

The endpoint claims the target files, streams 8 ledger rows
(`build.started` → `build.context_received` → per-file `build.claim` →
`build.scaffold` → `build.test` → `build.lint` → `build.handoff_ready` →
release), and writes them into a `Build: <task>` subfile as they happen.
Every row is also broadcast to the org SSE channel.

### 7. Merge conflict resolution

Have agent B try to claim a file agent A is holding:
```bash
curl -X POST localhost:3000/api/orgs/atlas/file-claims \
  -d '{"agentId":"agt_B","filePath":"src/onboarding/layout.tsx","reason":"layout pass"}'
```

Response: **HTTP 409** *and* a new `Conflict Resolution Packet:
src/onboarding/layout.tsx` subfile appears under the brain root. It lists
both claimants, what each was doing, the recommended resolution
(holder ships first, incoming re-applies against new HEAD), and the next
action. **GitHub never sees the conflict.**

### 8. Live implementation

The brain right rail's **Activity** tab shows every build progress row,
file claim, conflict, and verify completion in real time as SSE events
hit the page.

### 9. Live work ledger

The Activity tab is the unified ledger. Every event from every channel
shows up there with relative timestamps. Switch to the **Agent** tab to
inspect a single agent. Switch to **Memory** to see what every new agent
reads on cold start. Switch to **Context** to see the compressed packet
that gets broadcast.

### 10. Resume and handoff

Click **Hand off** in the topbar. The server:
1. Snapshots the room state (goal, completed work, held file claims,
   active agents, pinned memory).
2. Compresses it through `lib/adapters/zeroentropy.ts`.
3. Persists it through `lib/adapters/gbrain.ts`.
4. Writes a `Resume Packet: <timestamp>Z` subfile.
5. Routes the user to that packet.

A brand-new agent (or the same agent on a different machine) reads the
packet via `/api/context` and continues without restating any of the
context. Click **Push to GitHub**: a `GitHub Bundle: <branch>` subfile is
created with the file list from the latest build, links to the research
and verification subfiles, and a `github.com/<repo>/compare/main...<branch>`
URL the human opens to finish the PR.

---

## What the demo proves

1. **Agents are registered** — every agent and subagent is visible in
   `/<org>/agents` with `parentAgentId` for trees.
2. **Agents are addressable** — `@Iris`, `@Forge`, or any registered
   agent in the brain command bar.
3. **Sponsors are real skills** — `@/research` is The Hog. `/resume` and
   `/compress` flow through ZeroEntropy. `/remember` writes through
   GBrain into pinned memory. `/build` uses GStack file claims and
   ledger progress events.
4. **The doc stays clean** — every heavy output becomes a separate
   subfile in the tree; the main brain doc curates links.
5. **Context is shared live** — every skill completion broadcasts a
   `context.update` to every org agent over SSE.
6. **Memory is durable** — decisions, blockers, failed attempts, and
   resume packets are saved to `data/`.
7. **Work is coordinated** — file-level claims plus auto-generated
   Conflict Resolution Packets stop two agents from clobbering the same
   file before GitHub sees it.
8. **Handoff works** — `Hand off` → `Resume Packet` → new agent
   continues from the packet via `/api/context`.
9. **GitHub stays clean** — only the final, coordinated bundle reaches
   `/compare/main...<branch>`; conflicts are resolved upstream.

---

## Quick start

### Prerequisites

- Node 20+
- pnpm 9+
- (Optional) The Hog API credentials for live research. Without them,
  research falls back gracefully to a "no-hits" report.

### Install

```bash
git clone https://github.com/ayushozha/neverzero-workspace.git
cd neverzero-workspace
pnpm install
```

### Configure The Hog (optional but recommended)

Create `.env.local` at the repo root:

```bash
HOG_API_KEY=ak_...
HOG_API_SECRET=sk_...
```

> Both files are gitignored. Never commit credentials.

### Run the web app

```bash
pnpm run dev
# → http://localhost:3000
```

Routes to try, in order:

1. `/workstation` — the polished mockup that explains the product.
2. `/create-brain` — create a new org. Pick a slug; the rest auto-fills.
3. `/<org>/install` — install an agent into Claude / Cursor / Codex /
   Aider / VS Code. Copy the snippet.
4. `/<org>/brain` — the live command center. Type
   `@iris /plan ship beta to 5 design partners` and press Enter.
5. `/<org>/docs/<id>` — open any subfile inside the same shell.

### Run the CLI

```bash
cd cli
pnpm install        # one-time
pnpm run nz init    # scaffold .nz/ in cwd
pnpm run nz join --name Codex --runtime codex
pnpm run nz status
```

See [CLI reference](#-cli-reference) for all commands.

### Production build

```bash
pnpm run build
# 23 routes; 6 statically prerendered, 17 dynamic.
```

---

## HTTP API reference

All routes are under `app/api/`. Every JSON response includes
`Content-Type: application/json`. Cookies / sessions are not used; agents
authenticate via `Authorization: Bearer nz_live_<key>` on the `/api/context`
endpoint. Other endpoints are workspace-scoped via the org slug.

### Orgs

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/orgs` | — | `{ orgs: Org[] }` |
| POST | `/api/orgs` | `{ name, mission?, providers? }` | `{ org }` |
| GET | `/api/orgs/:slug` | — | `{ org }` |
| POST | `/api/orgs/:slug/providers` | `{ providers: ProviderId[] }` | `{ providers }` |
| GET | `/api/orgs/:slug/providers` | — | `{ providers }` |

### Agents

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/orgs/:slug/agents` | — | `{ agents: Agent[] }` (sans hash) |
| POST | `/api/agents` | `{ name, from, orgSlug, … }` | `{ agent, apiKey, installSnippet }` — full key shown once |
| GET | `/api/agents/:id` | — | `{ agent }` |
| DELETE | `/api/agents/:id` | — | `{ agent }` (status = revoked) |
| POST | `/api/agents/:id/heartbeat` | `HeartbeatPatch` | `{ agent }` |
| POST | `/api/agents/:id/verify` | — | `{ agent }` (marks connected) |
| GET | `/api/context` | `Authorization: Bearer <key>` | Cold-start context for the caller |

### Subagents

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/orgs/:slug/spawn` | `{ parentAgentId, name, purpose, from? }` | `{ agent, subfile, subagent_count }` |
| GET | `/api/orgs/:slug/spawn?parent=<id>` | — | `{ children: Agent[] }` |

### Docs / Skills

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/orgs/:slug/docs` | — | `{ root, docs: DocNode[] }` |
| POST | `/api/orgs/:slug/docs` | `{ title, parentId?, content? }` | `{ doc }` |
| GET | `/api/orgs/:slug/docs/:id` | — | `{ doc }` |
| DELETE | `/api/orgs/:slug/docs/:id` | — | `{ deletedIds: string[] }` |
| GET | `/api/orgs/:slug/skills` | — | `{ skills }` (only from installed providers) |
| POST | `/api/orgs/:slug/skills/run` | `{ command, task, mentionedAgents?, parentId? }` | **202** `{ doc }` (skill runs async) |

### Research

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/research` | `{ topic, orgSlug, requestedBy? }` | **202** `{ research }` |
| GET | `/api/research/:id` | — | `{ research }` |
| GET | `/api/research/:id/events` | — | SSE stream of `research.step` events |
| GET | `/api/research?org=<slug>` | — | `{ research: Research[] }` |

### Verification / Build / File claims

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/orgs/:slug/verify` | `{ subfileId, requestedBy? }` | `{ ok, report, verdict, audit }` |
| POST | `/api/orgs/:slug/build` | `{ agentId, task, targetFiles[], requestedBy? }` | **202** `{ doc }` (build streams progress) |
| GET | `/api/orgs/:slug/file-claims?held=1` | — | `{ claims }` |
| POST | `/api/orgs/:slug/file-claims` | `{ agentId, filePath, reason }` | **201** `{ ok, claim }` or **409** `{ ok: false, conflict, packetDocId }` |
| DELETE | `/api/orgs/:slug/file-claims?id=<id>` | — | `{ ok, claim }` |

### Continuity

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/orgs/:slug/resume` | `{ requestedBy?, goal? }` | `{ ok, doc }` (Resume Packet subfile) |
| POST | `/api/orgs/:slug/github` | `{ requestedBy?, repo?, branch? }` | `{ ok, doc, compareUrl, bundle }` |

### Events (SSE)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/events?org=<slug>` | Server-sent events for the org channel |

---

## CLI reference

The `nz` CLI is the local-first half of NeverZero. It lives in `cli/` and
ships its own README, but here's the quick map:

```text
.nz/
  room.json         — agents in this directory, presence, settings
  ledger.ndjson     — append-only event log
  memory.json       — local memory (goals, constraints, rules)
  handoff/
    latest.nzr.json — most recent resume packet
```

| Command | What it does |
|---|---|
| `nz init` | Scaffold `.nz/` in cwd. |
| `nz join --name <n> --runtime <r>` | Register an agent. |
| `nz heartbeat --agent <id>` | Refresh `last_heartbeat`. |
| `nz claim --agent <id> --task <t>` | Claim a task (status → working). |
| `nz release --agent <id>` | Release a task (status → idle). |
| `nz log --agent <id> --type decision --summary "<s>"` | Append to ledger. |
| `nz memory get|set|list` | Read/write memory.json. |
| `nz handoff --agent <id>` | Generate a `.nzr.json` resume packet. |
| `nz resume` | Print + mark consumed. |
| `nz status` | Show room presence + stale agents. |
| `nz conflict-check` | Detect overlapping claims or stale `working` agents. |

E2E test: `cd cli && pnpm run test` — runs the full init → join → claim →
log → handoff → resume → status flow against a temp room.

---

## Project structure

```
.
├── app/                         # Next.js 16 App Router
│   ├── layout.tsx
│   ├── page.tsx                 # landing
│   ├── workstation/             # mission-control mockup
│   ├── create-brain/            # org creation flow
│   ├── install/                 # cross-org install hub
│   ├── doc-minimal/             # the editable living document engine
│   ├── signin/  signup/
│   ├── [org]/                   # org-scoped routes
│   │   ├── page.tsx             # org home
│   │   ├── brain/               # /<org>/brain — the command center
│   │   │   └── _components/BrainWorkstation.tsx
│   │   ├── docs/[id]/           # /<org>/docs/<id> — subfile in shell
│   │   │   ├── SubfileCenter.tsx
│   │   │   └── SubfileLive.tsx
│   │   ├── research/[id]/       # research detail page
│   │   ├── agents/              # registered agents
│   │   ├── install/             # per-org install snippet
│   │   └── workstation/         # org-scoped workstation
│   └── api/
│       ├── agents/[id]/         # heartbeat, verify, handoff
│       ├── context/             # cold-start context (Bearer auth)
│       ├── events/              # org SSE fan-out
│       ├── orgs/[slug]/
│       │   ├── docs/            # doc tree CRUD
│       │   ├── providers/       # install/uninstall providers
│       │   ├── skills/run/      # skill dispatcher
│       │   ├── spawn/           # subagent registration
│       │   ├── verify/          # /verify endpoint
│       │   ├── build/           # /build endpoint
│       │   ├── file-claims/     # file-level claims + conflict packets
│       │   ├── resume/          # /resume endpoint
│       │   └── github/          # GitHub bundle endpoint
│       └── research/[id]/       # research + SSE progress
│
├── lib/                         # domain layer (pure TS, framework-free)
│   ├── orgs.ts                  # Org store (data/orgs.json)
│   ├── agents.ts                # Agent registry + API keys + parentAgentId
│   ├── docs.ts                  # DocNode tree
│   ├── providers.ts             # ALL_SKILLS (27 skills, 6 providers)
│   ├── skill-runner.ts          # generic executor + per-kind templates
│   ├── research.ts              # research orchestrator + SSE channels
│   ├── hog.ts                   # The Hog HTTP client
│   ├── events.ts                # in-process pub/sub
│   ├── file-claims.ts           # file-level claim store
│   ├── workspace-ledger.ts      # append-only event log
│   └── adapters/
│       ├── gbrain.ts            # memory persistence surface
│       ├── gstack.ts            # build / claim / progress surface
│       └── zeroentropy.ts       # compress / packetize surface
│
├── cli/                         # nz — local-first control plane
│   ├── bin/nz                   # entry shim
│   ├── src/
│   │   ├── index.ts
│   │   ├── commands/            # init, join, claim, log, handoff, resume, …
│   │   ├── store/               # .nz/ file IO
│   │   └── types.ts
│   ├── tests/e2e.test.ts        # full flow against a temp room
│   └── README.md
│
├── mobile/android/              # Kotlin + Java Android shell
│   ├── app/
│   ├── build.gradle.kts
│   └── README.md
│
├── skills/                      # /api/skills creates SKILL.md files here
├── data/                        # file-backed JSON stores (gitignored)
│   ├── orgs.json
│   ├── agents.json
│   ├── docs.json
│   ├── research.json
│   ├── file-claims.json
│   └── workspace-ledger.ndjson
│
├── memory/                      # per-feature memory the agent reads on cold start
├── feature-list.md              # demo source-of-truth, gap analysis
├── AGENTS.md                    # cold-start protocol for agents in this repo
└── README.md                    # you are here
```

---

## Skill catalog

27 skills across 6 providers. Type `/` in the brain command bar to filter
by name; only skills from installed providers appear.

<details>
<summary><b>GBrain</b> — plan · decompose · estimate · schedule · remember</summary>

- `/plan` — decompose a goal into a dated work plan with owners
- `/decompose` — break a task into sub-tasks with dependencies
- `/estimate` — effort + risk per sub-task
- `/schedule` — dated rollout schedule
- `/remember` — pin a fact/rule to project memory (writes through `lib/adapters/gbrain.ts`)

</details>

<details>
<summary><b>GStack</b> — scaffold · refactor · test · lint · build · spawn</summary>

- `/scaffold` — stand up a new feature scaffold with tests
- `/refactor` — plan a refactor with safety net + perf budget
- `/test` — generate a test plan
- `/lint` — run quality + style checks
- `/build` — claim work + run the build agent; writes ledger rows on progress
- `/spawn` — spawn a subagent with a sliced parent context

</details>

<details>
<summary><b>ZeroEntropy</b> — research · compete · recall · cite · summarize</summary>

- `/research` — gather sources via The Hog + public web, summarize, cite
- `/compete` — build a competitor matrix
- `/recall` — surface relevant pins + decisions from the brain
- `/cite` — find and format citations for a claim
- `/summarize` — compress a long doc into a TL;DR

</details>

<details>
<summary><b>The Hog</b> — review · factcheck · redteam · verify</summary>

- `/review` — critique a draft against the project goal
- `/factcheck` — verify claims against pinned memory + public sources
- `/redteam` — stress-test a plan against failure modes
- `/verify` — verify a research subfile — retain strong claims, drop weak ones

</details>

<details>
<summary><b>Lightsprint</b> — deploy · rollback · monitor</summary>

- `/deploy` — ship to staging or prod with a canary policy
- `/rollback` — roll back to a previous green deploy
- `/monitor` — set up alerting on the target service

</details>

<details>
<summary><b>NeverZero</b> — remember · compress · pin · resume · handoff</summary>

- `/remember` — pin a fact/rule to project memory
- `/compress` — collapse old turns into a recap
- `/pin` — pin authoritative facts (writes through GBrain)
- `/resume` — generate a Resume Packet for the next session/device
- `/handoff` — hand work off to another agent with compressed context

</details>

---

## What's real vs labeled

We're honest about this. The hackathon judging criteria reward depth where
it matters, not fake surface area.

| Surface | State |
|---|---|
| Next.js 16 + React 19 production build | **Real** — 23 routes, 6 prerendered, 17 dynamic. `pnpm run build` is green. |
| Agent registry + API key minting | **Real** — sha256-hashed keys, one-time reveal, status lifecycle. |
| Cold-start context endpoint | **Real** — `Authorization: Bearer` auth, returns pinned memory + active agents + open tasks. |
| Org doc tree + subfiles | **Real** — `lib/docs.ts`, persisted to `data/docs.json`. |
| Skill catalog + autocomplete | **Real** — `@` for agents, `/` for skills (filtered by installed providers). |
| Skill dispatcher | **Real** — `/api/orgs/<slug>/skills/run` creates a subfile, dispatches the kind-specific executor, broadcasts `context.update` per agent. |
| The Hog research | **Real** — `lib/hog.ts` hits real `companies/search` + `people/search` endpoints. |
| Research SSE | **Real** — `/api/research/<id>/events` streams progress. |
| Verify endpoint | **Real** — `/api/orgs/<slug>/verify` audits a research subfile and nests a Verification Report under it. |
| Build endpoint | **Real** — `/api/orgs/<slug>/build` claims files, emits ledger rows, releases. |
| Subagent registration | **Real** — `parentAgentId` field + `/api/orgs/<slug>/spawn`. |
| File-level conflict detection | **Real** — `lib/file-claims.ts`. 409 + auto-generated Conflict Resolution Packet on collision. |
| Resume packets | **Real** — `/api/orgs/<slug>/resume` snapshots room state into a `Resume Packet: <ts>` subfile. UI Hand-off button routes to it. |
| GitHub bundle | **Real** — `/api/orgs/<slug>/github` writes a `GitHub Bundle: <branch>` subfile + returns a `compare/main...<branch>` URL. |
| `nz` CLI (init/join/claim/log/handoff/resume/status/conflict-check) | **Real** — passing E2E test. |
| ZeroEntropy compress | **Labeled** — `lib/adapters/zeroentropy.ts` is the single call surface. Body is a deterministic local compressor; swap for the real API in one function. |
| GBrain memory persistence | **Labeled** — `lib/adapters/gbrain.ts` writes to `data/orgs.json` today. Swap for a real GBrain HTTP client without touching the 5 call sites. |
| GStack runtime bridge | **Labeled** — `lib/adapters/gstack.ts` claims hit the local file-claims store; progress hits the in-process bus. Swap for a real GStack runtime in three functions. |
| Real GitHub PR push | **Out** — we build the bundle subfile and return the compare URL; the human opens it to finish the PR. Swap to `gh` CLI or Octokit for a one-line server-side push. |
| Mobile app | **Real shell** — Kotlin + Java Android app under `mobile/android/`. Uses `/api/context`. |
| Production realtime sync across processes | **Out for hackathon** — SSE within one Next.js server is enough for the demo. Production would swap `lib/events.ts` for Redis pub/sub. |

---

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `HOG_API_KEY` | The Hog access key (`ak_…`) | For real research; without it `/research` falls back to a no-hits report. |
| `HOG_API_SECRET` | The Hog secret (`sk_…`) | Same as above. |
| `NEVERZERO_API_KEY` | An agent's API key (CLI/MCP side) | When acting as an agent. |
| `NEVERZERO_WORKSPACE` | Workspace slug | When acting as an agent. |
| `NEVERZERO_CONTEXT_URL` | Override `/api/context` URL | Optional. Defaults to `http://localhost:3000/api/context`. |
| `NEVERZERO_HEARTBEAT_INTERVAL_SECONDS` | Heartbeat cadence | Default 60. |

Put them in `.env.local` (gitignored) for the web app, or in your client's
MCP / agent config for the CLI/agent side.

---

## Security notes

- **API keys never leave the server unhashed after creation.** Only the
  one-time create response shows the full key. `apiKeyHash` is sha256 of
  the full key.
- **UI lists show only `apiKeyPrefix`** (e.g. `nz_live_x9K2`).
- **Sponsor credentials live in `.env.local` / `cli/.env`** — both
  gitignored.
- **`AGENTS.md` instructs agents to never copy the full key into chat or
  shared docs.** Keys come from env / secure local config.
- **All file IO is constrained to `data/`, `skills/`, `memory/`.** The
  server never reads or writes outside the project root.

---

## Roadmap

The hackathon build is ~92% of the demo surface. After judging:

- **Real ZeroEntropy + GBrain HTTP clients** in their adapter files. One
  function body each.
- **GStack runtime bridge** that runs actual subagents, not templated
  ledger rows.
- **Server-side GitHub push** with `gh` CLI or Octokit.
- **Postgres or Durable Objects** behind the file-backed stores. Every
  read goes through one helper per file already.
- **Production realtime** — swap `lib/events.ts` for Redis pub/sub so
  multiple Next.js processes (and the mobile app) all see the same stream.
- **Per-org SSO + RBAC** before any team uses this with real customer data.

---

## Credits

Built for the YC 2026-05-16 hackathon by the Atlas team. Sponsor stack:
The Hog · ZeroEntropy · GStack · GBrain · Lightsprint. UI scaffolded from
the workstation mockup; CLI scaffolded from the `nz` local-first design;
both share the same skill catalog and event protocol.

See `feature-list.md` for the demo source-of-truth and current gap
analysis. See `AGENTS.md` for the cold-start protocol every agent in this
repo reads on session start.

---

<div align="center">

**One workspace. Many agents. Zero context loss.**

</div>
