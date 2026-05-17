# NeverZero

**When your AI coding session dies, the work doesn't.**

A live work record for AI coding agents. Every edit, every decision, every failed approach is captured to disk by Claude Code hooks. When the session dies — Ctrl-C, OOM, network drop, laptop sleep — the dashboard flips DEAD in real time and hands a fresh agent a precise resume prompt that picks up exactly where the dead one left off.

No prompt re-engineering. No "let me catch you up." Zero work lost.

> Try it: `pnpm install && pnpm dev`, then open http://localhost:3000/dashboard.
> Branch: [`kush`](https://github.com/ayushozha/neverzero-workspace/tree/kush)

---

## The problem

You're 90 minutes into a refactor with Claude Code. Mid-session, the process dies — maybe you Ctrl-C'd, maybe the laptop slept, maybe the container OOM'd. You open a fresh session. You spend 15 minutes catching the new model up by hand. You forget the three failed approaches you already tried. You re-litigate decisions you already settled.

This is the default workflow today for every agentic coding tool, and the pain scales linearly with session length. The longer the session, the more catastrophic the death.

NeverZero treats this as a **persistence problem, not a model problem**. The agent's process is ephemeral; its work record shouldn't be. Capture the right state to disk during the session, then make resume cheap.

---

## What you actually see (live, not a mockup)

1. Open the dashboard. Topbar shows `⚡ HOOKS · idle` (gray) — no agent yet.
2. In a second terminal, run `claude`. `SessionStart` hook fires. `.nz/room.json` is written. Dashboard polls every 2s, flips to **ALIVE** within one tick. `⚡ HOOKS · now` goes green and pulses.
3. Ask Claude to do real work — *"refactor the auth middleware"*. Each `Edit`, `Bash`, `TodoWrite` fires `PostToolUse` → appends a ledger event. **Each event flashes into the BEFORE stream as it arrives.** The dashboard reacts to your typing in real time.
4. Hit Ctrl-C, or `/exit`. `SessionEnd` fires → `.nz/handoff/beam-resume.json` is written from the rolling session state. Dashboard flips **DEAD** on the next 2s poll. AFTER side renders a recovery card with the real goal you asked for, real completed work from your session, real open TodoWrite items, real failed attempts.
5. Click **Copy context**, paste into a fresh `claude` session. New Claude reads `.nz/` and says: *"I see the prior session was refactoring the auth middleware, completed X and Y, will continue with Z."* It picks up exactly where the dead one left off.

That last step is not a mockup. It's the entire pitch.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLAUDE CODE SESSION                             │
│                                                                          │
│   you ──prompt──▶ Claude ──tool calls──▶ Edit / Write / Bash / Todo      │
│                       │                          │                       │
└───────────────────────┼──────────────────────────┼───────────────────────┘
                        │                          │
              UserPromptSubmit        PostToolUse · Stop · SessionEnd
                        │                          │
                        ▼                          ▼
              ┌──────────────────────────────────────────┐
              │   .claude/settings.json hooks            │
              │            │                             │
              │            ▼                             │
              │   scripts/nz-hook.mjs  (300 lines)       │
              │   · atomic JSON writes (tmp + rename)    │
              │   · never throws (hook crash = exit 0)   │
              │   · tool-specific summarization          │
              └─────────────────┬────────────────────────┘
                                │
                                ▼
                ┌──────────────────────────────────┐
                │   .nz/   (plain text, on disk)   │
                │                                  │
                │   · ledger.ndjson                │  append-only
                │   · room.json                    │  heartbeat
                │   · session.json                 │  rolling state
                │   · handoff/beam-resume.json     │  death packet
                └─────────────────┬────────────────┘
                                  │
                                  │ every 2s · force-dynamic · no-store
                                  ▼
                ┌──────────────────────────────────┐
                │   GET /dashboard/state           │
                │   · derives liveStatus from      │
                │     heartbeat + beam-resume      │
                │   · synthesizes beam-resume on   │
                │     hard kill (no SessionEnd)    │
                │   · generates honest resume      │
                │     prompt server-side           │
                │   · +retrieval if ZE key set     │
                └─────────────────┬────────────────┘
                                  │
                                  ▼
            ┌──────────────────────────────────────────────┐
            │              /dashboard (browser)            │
            │                                              │
            │   BEFORE (frozen)  │  SEAM  │  AFTER         │
            │   · goal           │   ☠    │  · recovery    │
            │   · open tasks     │  DIED  │    card        │
            │   · live stream    │        │  · Copy ─────┐ │
            └────────────────────┴────────┴──────────────┼─┘
                                                         │
                                                         ▼
                                          ┌─────────────────────────┐
                                          │  NEW Claude Code        │
                                          │  paste resume prompt    │
                                          │  ↳ reads .nz/, continues│
                                          └────────────┬────────────┘
                                                       │
                                                       └─→ writes to .nz/ → loop
```

### Optional retrieval layer (when `ZEROENTROPY_API_KEY` is set)

```
   .nz/ledger + decisions ──▶  scripts/nz-sync.mjs  ──▶  ZeroEntropy
                                                              │
        on resume:  /dashboard/state ◀── zerank-2 top-6 ──────┘
                          │
                          ▼
          inject "RELEVANT PRIOR WORK" block
          above NEXT ACTION in the resume prompt
```

This makes resume **precise** instead of exhaustive. A 90-minute session with hundreds of events doesn't dump everything into the new agent's context — it surfaces only the snippets semantically relevant to the next action.

---

## How it works — three primitives

### 1. The work record (`.nz/`)

A small set of plain-text files on disk that any agent writes to as it works.

| File | Format | Purpose |
| --- | --- | --- |
| `.nz/ledger.ndjson` | append-only NDJSON | every event (edit, bash, todo, decision, failure) |
| `.nz/room.json` | JSON | current agent presence and heartbeat |
| `.nz/session.json` | JSON | rolling state — goal, open todos, failed attempts, files touched |
| `.nz/handoff/beam-resume.json` | JSON | death packet written on `SessionEnd` |

Schema is documented in [`CLAUDE.md`](CLAUDE.md). The format is intentionally runtime-agnostic — Claude Code today, anything tomorrow.

### 2. The hooks (`.claude/settings.json` + `scripts/nz-hook.mjs`)

Claude Code fires shell commands on five lifecycle events. A single ~300-line dispatcher translates each to `.nz/` writes:

| Hook | What the dispatcher does |
| --- | --- |
| `SessionStart` | wipe stale beam-resume, write fresh `room.json` + `session.json`, log `task_started` |
| `UserPromptSubmit` | capture the *first* prompt of the session as the goal (so resume packets get a real goal, not a generic one) |
| `PostToolUse` *(Edit/Write/Bash/TodoWrite)* | append ledger row, track completed / failed / files-touched / open todos |
| `Stop` | refresh heartbeat at end of each assistant turn |
| `SessionEnd` | write `.nz/handoff/beam-resume.json` from rolling state, mark agent dead |

Defensive by design: any hook crash exits 0 silently. A hook must **never** block Claude.

### 3. The dashboard (`app/dashboard/`)

A Next.js page that polls `.nz/` every 2 seconds via a JSON endpoint.

- No `.nz/` → fixtures mode, opens on the catastrophe story (good zero-config first impression).
- Agent writes `.nz/` → flips ALIVE within one tick.
- Agent dies (or heartbeat goes stale >15s without a `SessionEnd`) → flips DEAD; if no `beam-resume.json` exists (hard kill), the server synthesizes one from `session.json` so the recovery card is never blank.
- Resume prompt is generated server-side from real `.nz/` state — not a fixture's pre-baked string.
- Topbar `⚡ HOOKS · 3s ago` pill reads `lastHookEventAt` derived from `.nz/ledger.ndjson` only — not polluted by other demo data. Honest signal of whether hooks are wired and live.
- ⌘K opens a semantic search box over the indexed work record (`top_snippets` + `zerank-2` reranking).

---

## Real use cases

### 1. Long refactors that span sessions
You're three hours into migrating a codebase. You need to sleep. Hit Ctrl-C. Tomorrow morning, paste the copied prompt into a new Claude session. It picks up at the next file in your TodoWrite list, skipping files already done and avoiding the three approaches that didn't work.

### 2. Network drops and OOM kills in containerized agents
Agentic CI runners die from OOM kills and pod restarts more often than anyone admits. `SessionEnd` fires on graceful shutdown; stale-heartbeat detection covers hard kills. The next runner reads `.nz/` and resumes — no external orchestration layer required.

### 3. Async handoff between teammates or agents
End your session. Push `.nz/` (or a redacted variant) to a shared location. Another developer or a different agent pulls it and resumes with full context, including which approaches you already tried and rejected. Pairing without being online at the same time.

### 4. The product is its own demo
This repo is reading the work record of the very Claude Code session that built it. Open the dashboard while developing — the BEFORE stream is your actual edits, the DEAD card is your actual death. Recursion as a feature: judges can verify the system works by watching it watch itself.

---

## Try it

```bash
git clone https://github.com/ayushozha/neverzero-workspace
cd neverzero-workspace
git checkout kush
pnpm install
pnpm dev
# open http://localhost:3000/dashboard
```

Open a second terminal in the same directory and run `claude`. The dashboard will go from fixtures mode to live mode within 2 seconds.

### Turn on retrieval-augmented resume + semantic search

```powershell
# Windows PowerShell
$env:ZEROENTROPY_API_KEY = "your_key_here"
$env:ZEROENTROPY_COLLECTION = "neverzero"      # optional, defaults to "neverzero"
node scripts/nz-sync.mjs                         # indexes .nz/ → ZeroEntropy
# restart `pnpm dev` so it picks up the env var
```

```bash
# macOS / Linux
export ZEROENTROPY_API_KEY="your_key_here"
node scripts/nz-sync.mjs
```

With the key set:
- The resume prompt gets a `== RELEVANT PRIOR WORK (retrieved via ZeroEntropy · zerank-2) ==` block injected above `NEXT ACTION`, with the top-6 reranked snippets from the indexed corpus.
- The topbar input becomes active. ⌘K (or Ctrl-K) focuses it; type a question in plain English; results show each snippet's path, `zerank-2` score, and content. Click a result to copy its content to clipboard.

Without the key, both features are silently disabled — the resume prompt falls back to the base form, the search box shows a disabled placeholder. The demo path never breaks.

---

## What's wired (file map)

```
.claude/settings.json                  hooks → nz-hook.mjs
scripts/
  nz-hook.mjs                          300-line hook dispatcher
  nz-sync.mjs                          one-shot .nz/ → ZeroEntropy indexer
app/dashboard/
  page.tsx                             SSR entry — loadDashboardData() → <Dashboard initial=…>
  _client/Dashboard.tsx                polling client, diptych UI, ⌘K search, hooks pill, flash-on-new
  _data.ts                             shared server loader, prompt builder, ZE augmentation, hard-kill synthesis
  _zeroentropy.ts                      thin fetch client (no SDK dep, ~80 lines)
  dashboard.css                        light theme matching the rest of the app
  state/route.ts                       GET /dashboard/state — polled every 2s
  search/route.ts                      GET /dashboard/search — ⌘K backend
  types.ts                             DashboardPayload, BeamResume, etc
fixtures/                              static demo data when .nz/ is empty
CLAUDE.md                              NeverZero data protocol spec
AGENTS.md                              short pointer to CLAUDE.md
```

---

## Tech choices and why

**Polling, not WebSockets.** Two-second polling is more than enough for a human-watchable dashboard, requires zero infra, works through any corporate proxy, and survives reconnects for free. WebSockets are the wrong abstraction for this signal density.

**No vendor lock on the agent runtime.** `.nz/` is plain files in a documented schema. Claude Code is the first integration; Cursor / Cline / your own scaffold can write the same format.

**Server-only ZeroEntropy client, ~80 lines of `fetch`.** Deliberately did not pull `zeroentropy` SDK — keeps the bundle clean, the failure mode obvious (HTTP errors with status codes, not opaque SDK exceptions), and the integration legible.

**Hooks over polling for the data source.** Hooks are Claude Code's canonical event surface, fire on every tool call, and require no upstream coordination. Polling the model would be wasteful and lossy.

**Honest fallbacks everywhere.**
- No `ZEROENTROPY_API_KEY` → no retrieval, base prompt only.
- No `SessionEnd` (hard kill) → synthesize from rolling `session.json`.
- No `.nz/` → fixtures.
- ZE timeout / error → silent fallback to base prompt.

The demo never breaks. Each fallback is a one-liner in `_data.ts`.

**Atomic file writes.** All JSON writes use `tmp + rename` so the dashboard never reads a half-written file mid-poll. The ledger uses `appendFileSync` and the reader uses `safeParse` to skip torn lines.

**Per-process prompt cache.** Keyed by `packet_id + memory.updated_at` so the 2-second poll doesn't hit ZeroEntropy on every tick. Bust by restarting the dev server or by writing new memory.

---

## Honest caveats

- **Hard kills (SIGKILL) don't fire `SessionEnd`.** Caught via stale-heartbeat detection (>15s) and synthesized from rolling state. Resume still works; the prompt is slightly less rich than after a graceful exit.
- **Hook payload schema is current as of Claude Code May 2026.** Field name changes upstream would require updating `scripts/nz-hook.mjs`. The hook is documented and ~300 lines, so this is a 10-minute fix if it happens.
- **The prompt cache is per-process and in-memory.** Re-indexing without restarting `pnpm dev` won't refresh the augmented prompt until `packet_id` or `memory.updated_at` changes.
- **`.nz/` is local-only by default.** Multi-machine resume requires syncing the directory (git, rsync, S3, your own sync layer). Out of scope for the demo; documented as use case #3.

---

## Status

- **Build:** `pnpm next build` green. All routes return 200.
- **Verified end-to-end:** alive → hard kill → DEAD with synthesized resume → graceful `SessionEnd` → real beam-resume. ZeroEntropy retrieval verified against a live collection (12 documents indexed, queries returned correctly-ranked snippets at 0.62–0.71 relevance).
- **Branch:** [`kush`](https://github.com/ayushozha/neverzero-workspace/tree/kush) on `github.com/ayushozha/neverzero-workspace`.

---

## Author

Built by Kush (`ayushozha`) as a hackathon project to make AI coding sessions actually durable.

The dashboard you're looking at is reading the work record of the session that built it.
