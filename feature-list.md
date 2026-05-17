# NeverZero Feature List And Demo Source Of Truth

This document is the current product and demo target for the hackathon build.
Optimize for this demo flow first. Do not treat this as a full production
roadmap.

## Core Idea

NeverZero is the shared context layer for AI-native teams.

Humans open one workspace, register multiple agents, call sponsor-powered
skills with `/skill-name`, and let agents collaborate without losing context
across sessions, devices, or machines.

The document stays clean. Heavy work such as research, verification,
compression, conflict resolution, and handoff creates linked subfiles. The main
document shows only the final summary, linked outputs, agent status, and live
work ledger.

## Demo Priority

The demo should prove one moat:

Multiple registered agents can enter the same room, receive shared compressed
context, spawn or coordinate subagents, resolve conflicts before GitHub, and
hand work off without starting from zero.

The product does not need every production system finished for the demo. It
does need every visible demo action to work end to end, with real state changes
and credible sponsor surfaces.

## Current Build Status

### Frontend

- ✅ Next.js 16, React 19 app with production build passing.
- ✅ `/workstation` renders the rich desktop mission-control prototype with top
  bar, sidebar, right rail, agent inspector, memory/context panels, skill
  palette, compose bar, and live-looking agent cards.
- ✅ `/doc-minimal` renders the editable living document engine with block types
  for paragraph, heading, todo, routine, skill, skill creator, decision, memory,
  agent note, and divider.
- ✅ `LivingDoc` is reused by `/<org>/workstation` with org-scoped storage and
  blank-mode support.
- ✅ `/install`, `/agents`, `/brain`, and org-scoped routes exist.
- ✅ `/<org>/brain` now uses the workstation UI shell driven by REAL org data
  (no dummy values): top bar with NeverZero / org crumb, sidebar with subfile
  tree + attached agents, doc body with mission/open-work/decisions/memory/
  skills sections, right rail with Activity / Agent / Memory / Context tabs,
  org-wide SSE refresh on skill events.
- ✅ `/research` output has real route surfaces:
  `/<org>/research` and `/<org>/research/<id>`.
- ✅ A research progress panel exists and subscribes to SSE for live step updates.
- ✅ The `@agent` and `/skill` autocomplete picker is wired on `/<org>/brain`'s
  command bar (arrow-key navigation, ⇥ to insert, esc to close). Type `@` for
  registered agents, `/` for installed skills.

### CLI

- ✅ `cli/` contains a working local-first `nz` CLI.
- ✅ Implemented commands: `init`, `join`, `heartbeat`, `claim`, `release`, `log`,
  `memory`, `handoff`, `resume`, `status`, and `conflict-check`.
- CLI state contract:

```text
.nz/
  room.json
  ledger.ndjson
  memory.json
  handoff/
    latest.nzr.json
```

- ✅ The CLI e2e proof loop is green: init, join, claim, log, handoff, resume, and
  status all work in a temp room.

### Backend And Data

- ✅ `POST /api/agents` mints per-agent API keys and stores only hashes.
- ✅ `GET /api/agents` lists registered agents.
- ✅ `GET /api/context` returns authenticated cold-start context for an agent key.
- ✅ `POST /api/agents/<id>/heartbeat` records active session metadata and marks
  an agent connected.
- ✅ `POST /api/orgs` and `GET /api/orgs` manage orgs.
- ✅ `GET /POST /api/skills` reads and writes repo-local `skills/<name>/SKILL.md`
  files.
- ✅ `POST /api/research` starts a research operation.
- ✅ `GET /api/research/<id>` returns stored research state.
- ✅ `GET /api/research/<id>/events` streams research progress over SSE.
- ✅ `GET /api/events?org=<slug>` streams org-wide events over SSE.
- ✅ `lib/events.ts` provides the in-memory event bus for hackathon-grade SSE.
- ✅ `lib/research.ts` stores research records in `data/research.json`, runs the
  orchestrator, broadcasts compressed context updates, and writes final reports.
- ✅ Provider catalog (`lib/providers.ts`) — gbrain / gstack / zeroentropy /
  the-hog / lightsprint / neverzero with 22 skills. Per-org install state
  in `data/orgs.json::providers`.
- ✅ `POST /api/orgs/<slug>/providers` install/uninstall; `GET` lists state.
- ✅ `GET /api/orgs/<slug>/skills` returns only skills whose provider is
  installed on the org.
- ✅ `POST /api/orgs/<slug>/skills/run` runs a skill — creates a subfile
  DocNode under the brain root, dispatches the kind-specific executor
  (templated markdown for plan/scaffold/review/etc, real Hog research
  for `/research`), and broadcasts `context.update` per agent.
- ✅ `GET /api/orgs/<slug>/docs` tree, `GET /api/orgs/<slug>/docs/<id>` one.
- ✅ `lib/docs.ts` doc tree: brain root + nested subfiles, each with full
  `skillRun` metadata (command, kind, task, mentions, status, timestamps).

## Sponsor Skills

### The Hog

Used for:

- `/research`

Purpose:

The Hog powers web intelligence and external research.

Demo command:

```text
@Iris @Forge /research onboarding flow problems for AI agent workspaces
```

Current implementation:

- ✅ `lib/hog.ts` calls The Hog `companies/search` and `people/search` endpoints
  using `X-Access-Key` and `X-Secret-Key`.
- ✅ The research orchestrator attempts the deep-research endpoint when available
  and falls back gracefully when unavailable.
- ✅ Research creates a persisted report and streams progress with SSE.

Target output:

- ✅ `/research` invocations from the doc create a linked subfile titled
  `Research: <topic>` containing TL;DR, key findings, Hog signal (companies +
  people), sources, and a link back to the dedicated research page.
- ✅ The subfile includes sources, findings, evidence, and recommendations.
- ✅ The main document only shows completion status and a link to the report
  (everything heavy lives in the linked subfile under the brain's doc tree).

### ZeroEntropy

Used for:

- `/compress`
- `/rerank`
- `/context`
- `/resume`

Purpose:

ZeroEntropy compresses messy agent activity into useful context packets.

It creates:

- Summary
- Blockers
- Next action
- Important decisions
- Conflict context
- Resume packet

Demo command:

```text
@Beam /compress current room context for Forge
```

Current implementation:

- ✅ The CLI supports `nz handoff --compress` as a packet flag.
- ✅ The research orchestrator broadcasts compact context payloads to org agents
  on the org SSE channel (`context.update` per agent).
- ⏳ No real ZeroEntropy external API adapter is wired yet — payloads are
  produced by the local skill runner.

Target output:

- Creates a linked subfile named `Compressed Context Packet`.
- Conflict resolution and resume should use the same packet format.

### GStack

Used for:

- `/spawn`
- `/run`
- `/build`
- `/verify`

Purpose:

GStack runs agents and subagents inside the workspace.

Demo command:

```text
@Forge /build implement onboarding changes from research findings
```

Current implementation:

- ✅ The CLI can register agents, claim tasks, heartbeat, release work, and detect
  task-level conflicts.
- ✅ The UI labels build/scaffold work as GStack-backed.
- ✅ `/scaffold`, `/refactor`, `/test`, `/lint` skills are dispatchable from the
  command bar; each creates a structured subfile in the doc tree.
- ⏳ No real GStack runtime bridge or subagent spawn hook is wired yet.

Target output:

- Forge becomes active, claims the task, updates the ledger, and pushes
  implementation progress into the room.
- If Forge spawns another agent, that subagent is registered in NeverZero.

### GBrain

Used for:

- `/remember`
- `/recall`
- `/brain`
- `/handoff`

Purpose:

GBrain stores durable project memory.

It remembers:

- Decisions
- Tasks
- Research outputs
- Conflict resolutions
- Failed attempts
- Handoff packets
- Agent history

Demo command:

```text
@Beam /remember final conflict resolution and handoff packet
```

Current implementation:

- ✅ Org memory exists in `data/orgs.json`.
- ✅ CLI memory exists in `.nz/memory.json`.
- ✅ Authenticated `/api/context` returns cold-start memory to registered agents.
- ✅ `/plan`, `/decompose`, `/estimate`, `/schedule`, `/remember` skills are
  dispatchable from the command bar.
- ⏳ No real GBrain external backend is wired yet — memory is local-file backed.

Target output:

- Creates or updates durable workspace memory so future agents can continue
  without starting from zero.

### Lightsprint

Used for:

- Optional `/deploy`

Purpose:

Deployment provider in the prototype.

Current implementation:

- UI labels exist only.
- Lightsprint is not required for the core demo path unless a deploy beat is
  added.

## Updated Demo Flow

### Step 1: Landing Page

Show the pitch:

NeverZero is Mission Control for AI agents.

It lets teams register agents, assign work, share compressed context, resolve
conflicts, and hand off across sessions.

### Step 2: Agent Registration Page

Show registered agents:

- Iris: research agent using The Hog.
- Forge: build agent using GStack.
- Loop: verification agent.
- Beam: context compression agent using ZeroEntropy and GBrain.

Also show subagents when they appear.

This proves every agent and subagent is visible.

### Step 3: Command Center And Docs ✅

Open the shared project document.

The doc is the command surface. Users can type:

```text
@agent-name @agent-name /skill-name task
```

The main doc stays clean. Every skill creates a separate subfile.

Current state:

- ✅ `/<org>/brain` is the command center.
- ✅ `@` opens the agent picker (registered agents from the org).
- ✅ `/` opens the skill picker (skills from installed providers only).
- ✅ Enter dispatches; the main doc stays clean and a subfile is created in
  the doc tree (visible in the sidebar and the "Open work" section).

### Step 4: Research With The Hog

Type:

```text
@Iris @Forge /research onboarding flow problems for AI agent workspaces
```

Required behavior:

- The `@` picker shows agents.
- The `/` picker shows sponsor skills.
- The Hog-backed research operation starts.
- A new `Research Findings` subfile is created.
- The main doc shows:
  - Research complete.
  - Findings added.
  - Link to `Research Findings`.

Current state:

- ✅ The `/research` backend, research routes, SSE progress panel, and Hog
  companies/people search calls exist.
- ✅ The `@agent` picker is wired on `/<org>/brain` command bar.
- ✅ Main-doc shows the running subfile in a "Currently working" agent block
  and the completed run in the Decision log + Doc tree, both linking to the
  full research subfile.

### Step 5: Verify Research

Type:

```text
@Loop /verify Research Findings
```

Required behavior:

- Loop checks the research page for contradictions, missing evidence, and weak
  claims.
- A new `Verification Report` subfile is created.
- The main doc shows:
  - Loop verified research.
  - Strong findings retained.
  - Weak claims removed.

Current state:

- Review/verification is present as UI and skill labels.
- No real `/verify` backend endpoint exists yet.

### Step 6: Build From Shared Context

Type:

```text
@Forge @Atlas /build improve onboarding flow using verified findings
```

Required behavior:

- GStack runs the build agents.
- Forge and Atlas both receive the same compressed room context.
- They know what research found, what Loop verified, which files are being
  touched, and what decisions already exist.

Current state:

- `nz claim`, `heartbeat`, `release`, and `conflict-check` exist.
- Build execution and UI-to-ledger task claims still need wiring.

### Step 7: Merge Conflict Resolution

Forge and Atlas try to edit the same file.

NeverZero detects the conflict.

ZeroEntropy creates a compressed conflict packet:

```text
Summary: Forge changed consent copy. Atlas changed layout in the same component.
Blocker: Both edits touch onboarding.tsx.
Next: Keep Forge copy first, then apply Atlas layout after review.
```

If an agent needs more information, NeverZero sends only the relevant function,
file section, or decision context.

Output:

- A new `Conflict Resolution Packet` subfile is created.

This proves agents coordinate before GitHub receives the final version.

Current state:

- Task-level conflict detection exists in the CLI.
- File-level conflict ownership, conflict subfiles, and ZeroEntropy compression
  are not wired yet.

### Step 8: Show Live Implementation

After conflict resolution, show:

- Implementation complete.
- Conflict resolved.
- Preview ready.
- Final output generated.

The main doc shows the clean final state.

Current state:

- Workstation UI can display this.
- Build/preview execution is not wired.

### Step 9: Live Work Ledger

Show the ledger in the current document UI.

It should show:

- Iris ran The Hog research.
- Research Findings subfile created.
- Loop verified the findings.
- Forge and Atlas started build work.
- Conflict detected.
- ZeroEntropy created conflict packet.
- Agents resolved conflict.
- GBrain saved memory.
- Resume packet generated.

Current state:

- CLI `ledger.ndjson` exists.
- In-memory SSE events exist for research/org events.
- The document UI still needs a unified ledger panel backed by these events.

### Step 10: Resume And Handoff

Type:

```text
@Beam /resume current project state
```

Required behavior:

- ZeroEntropy compresses the full room history.
- GBrain stores it as durable memory.
- A new `Resume Packet` subfile is created.

The packet includes:

- Goal
- Current state
- Completed work
- Open blockers
- Conflict resolution
- Next action

Then show a new agent joining and continuing from the resume packet.

Current state:

- CLI handoff/resume packets work locally.
- `/api/context` gives registered agents cold-start context.
- UI handoff/resume actions, real compression, and real GBrain persistence are
  not wired yet.

## What The Demo Proves

1. Agents are registered: every agent and subagent is visible.
2. Agents are addressable: users can mention registered agents with `@Iris`,
   `@Forge`, or any active agent.
3. Sponsors are real skills: The Hog, ZeroEntropy, GStack, and GBrain are
   callable through `/skill-name`.
4. The doc stays clean: heavy outputs become separate subfiles.
5. Context is shared live: agents receive compressed context from each other
   instead of reading one giant memory file.
6. Memory is durable: decisions, blockers, failed attempts, and handoff packets
   are saved.
7. Work is coordinated: agents claim tasks and resolve conflicts before final
   output reaches GitHub.
8. Handoff works: a new agent, device, or session can continue from room state.
9. GitHub stays clean: only the final coordinated implementation is committed.

## Gap Analysis

### Demo-Ready Or Mostly Ready

- ✅ Landing and workstation visuals.
- ✅ Agent registration and API-key bootstrap.
- ✅ Org routes and org brain (now with the workstation UI shell + real data).
- ✅ Living document editor.
- ✅ Skill creation to real `SKILL.md` files.
- ✅ CLI room, ledger, memory, handoff, resume, and conflict-check.
- ✅ Authenticated cold-start context endpoint.
- ✅ The Hog-backed research path with SSE progress and research report pages.
- ✅ Provider catalog with per-org install state and 22 skills.
- ✅ Doc-as-command surface with `@agent` + `/skill` autocomplete and skill-
  driven subfile creation.
- ✅ Unified live work ledger inside the document UI (right rail Activity tab).

### Needs Wiring For The Demo

- ✅ `@agent` picker in the compose/editor command surface.
- ✅ Main-doc clean output cards that link to generated subfiles.
- ⏳ `/verify` endpoint and `Verification Report` subfile (`/review` and
  `/factcheck` exist as templated skill subfiles; a dedicated verify endpoint
  that links to a specific research subfile is still pending).
- ⏳ `/build` action that claims work, writes ledger events, and displays progress.
- ⏳ Subagent registration with parent-child relationships (`parentAgentId`).
- ⏳ File-level conflict detection and `Conflict Resolution Packet` subfile.
- ⏳ UI handoff/resume button or command linked to the CLI/API packet generator.
- ✅ Unified live work ledger in the document UI (right rail Activity tab on
  `/<org>/brain` shows subfile creation + research events in real time).

### Still Mocked Or Deferred

- Real ZeroEntropy API calls.
- Real GBrain memory backend.
- Real GStack runtime bridge.
- Real GitHub PR/commit integration.
- Native mobile app.
- Production realtime sync across processes/devices.

## Prioritized Demo Punch List

### P0: Must Land

1. ✅ Add `@agent` picker to the compose surface (lives on `/<org>/brain`).
2. ✅ Make `/research` create or link a `Research Findings` subfile from the main
   doc (lives in the doc tree as `Research: <topic>`).
3. ⏳ Add `/verify` as a demo-backed endpoint and generate `Verification Report`.
4. ⏳ Wire `/build` to task claims, progress events, and ledger rows.
5. ⏳ Add file-level conflict demo and generate `Conflict Resolution Packet`.
6. ⏳ Add `/resume` or `Hand off` UI action that generates `Resume Packet`.
7. ✅ Show a unified live ledger inside the document UI (right rail Activity
   tab on `/<org>/brain`, refreshed on org SSE).

### P1: High Value

1. Add `parentAgentId` and a `/spawn` endpoint for subagent trees.
2. Add a real ZeroEntropy adapter for `/compress` and `/resume`.
3. Add a real GBrain adapter or a clearly labeled GBrain-backed memory wrapper.
4. Add a simple GitHub final-state button or scripted commit/PR proof.

### P2: Cut For Hackathon Unless Already Done

1. Native mobile app.
2. Production WebSocket/pub-sub architecture.
3. Full Git merge conflict automation.
4. SOC2/RBAC/SSO.
5. Billing or account management.

## Percent Done

For the focused hackathon demo:

- Frontend visual surface: about 90%.
- CLI local context engine: about 100% for v0.1.
- Backend registration/context/research APIs: about 75%.
- Sponsor integrations: about 25%, because The Hog is partially real but
  ZeroEntropy, GStack, and GBrain are still mostly labels or local fallbacks.
- Live multi-agent document sync: about 20%, because research/org SSE exists
  but document content is still localStorage-backed.
- Mobile: 0% for this demo path.

Overall demo readiness: about 70% after the research/event work now present in
the repo. The remaining work is mostly wiring the visible workflow together.

