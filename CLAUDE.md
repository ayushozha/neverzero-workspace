# NeverZero Workspace

NeverZero is the system of record for AI-generated work. This repo is both the product and a live demonstration of itself.

## GStack Skills

GStack is installed. Use these skills for structured workflow:

- `/gstack-review` — pre-landing code review (runs before every PR)
- `/gstack-ship` — ship workflow: review + bump + PR
- `/gstack-retro` — weekly engineering retrospective
- `/gstack-autoplan` — full plan review pipeline (CEO + design + eng)
- `/gstack-plan-ceo-review` — rethink scope and ambition of a plan
- `/gstack-investigate` — systematic root cause debugging
- `/gstack-office-hours` — product interrogation with 6 forcing questions

GStack writes skill events to `~/.gstack/projects/neverzero-workspace/timeline.jsonl`. NeverZero reads this file and shows your real work in the dashboard.

## NeverZero Data Protocol

Write structured events to `.nz/` so the dashboard tracks your work live.

### Ledger events — append to `.nz/ledger.ndjson`

```json
{"ts": "ISO-8601", "agent_id": "forge", "type": "commit", "summary": "Fixed auth bug in middleware"}
```

**agent_id values:**
- `iris` — research, analysis, reading docs, documentation writing
- `forge` — build, code changes, commits, tests
- `atlas` — planning, architecture, design decisions
- `loop` — review, quality, linting, verification
- `beam` — deploy, release, canary, rollback

**type values:**
- `commit`, `task_started`, `task_completed` — routine work
- `decision` — architectural or product decisions
- `conflict_detected` — disagreement between agents or approaches
- `handoff_created` — one agent handing off to another
- `failure` — something failed
- `research_evidence` — Iris found something important

### Room state — write `.nz/room.json`

Update this when your agent session starts or ends:

```json
{
  "room_id": "nz-<your-session-id>",
  "name": "NeverZero · <task description>",
  "created_at": "ISO-8601",
  "agents": [
    {
      "agent_id": "forge",
      "name": "Forge",
      "glyph": "FG",
      "role": "build-agent",
      "runtime": "GStack",
      "machine": "claude-code",
      "task": "Building resume panel feature",
      "status": "working",
      "last_heartbeat": "ISO-8601"
    }
  ]
}
```

**status values:** `working`, `idle`, `stale`, `dead`

### Memory — write `.nz/memory.json`

Persist decisions and goals across sessions:

```json
{
  "room_id": "nz-<session-id>",
  "updated_at": "ISO-8601",
  "goals": ["Ship hackathon demo by end of day"],
  "constraints": ["No breaking changes to types", "Keep light theme"],
  "decisions": [
    {"id": "d1", "ts": "ISO-8601", "agent_id": "atlas", "text": "Use file-based data over WebSockets for simplicity", "status": "accepted"}
  ],
  "rejected_approaches": ["WebSocket streaming — too complex for demo"],
  "files_touched": ["app/dashboard/_client/Dashboard.tsx", "app/dashboard/dashboard.css"]
}
```

## GBrain

GBrain is installed at `E:\gbrain-repo` (v0.35.1.1). Binary: `E:\bun\bin\gbrain.exe`.

**Note:** PGLite (the local embedded DB) doesn't run on Windows due to a WASM limitation. To use GBrain for memory storage, connect to a Supabase instance:

```bash
# Set your Supabase Session Pooler URL (port 6543, not 5432)
GBRAIN_DATABASE_URL="postgres://..." E:\bun\bin\gbrain init --non-interactive
```

Until then, NeverZero uses `.nz/memory.json` for persistent memory.

## Dev server

```bash
pnpm dev        # starts Next.js at http://localhost:3000
```

Dashboard: http://localhost:3000/dashboard

The dashboard auto-updates on every request (force-dynamic) — refresh to see new `.nz/` data.

## Architecture

- `app/dashboard/page.tsx` — server component, reads `.nz/` + fixtures + `~/.gstack/timeline.jsonl`
- `app/dashboard/_client/Dashboard.tsx` — client component, all interactivity
- `app/dashboard/dashboard.css` — light theme design system
- `fixtures/` — demo data when `.nz/` is empty
- `.nz/` — live data written by agents (gitignored)
