# NeverZero — Killer Demo Script

> Three lengths. Pick by your time slot. Pre-flight is the same for all three.
> The keystone beat (#5) is identical in every version — don't cut it.

---

## The 90-second beat sheet (default — print this card)

| # | Time  | What you do                                                          | What you say |
|---|-------|----------------------------------------------------------------------|--------------|
| 1 | 0:00  | Dashboard already open at `/dashboard`. Fixtures mode, DEAD card visible. | "Every AI coding session you've ever had has died at least once. This is what you usually lose." |
| 2 | 0:08  | Point at the topbar pill: `⚡ HOOKS · idle` (gray).                    | "Right now this dashboard isn't connected to a real agent. Watch what happens when I start one." |
| 3 | 0:14  | Switch to Terminal 2. Type `claude`. Hit enter.                       | "Standard Claude Code. Nothing custom — I just dropped a hook config in this repo." |
| 4 | 0:20  | Cut back to the dashboard. Pill goes **green**: `⚡ HOOKS · now`. Status flips to **ALIVE**. | "It's wired. The dashboard is now reading a live work record on disk." |
| 5 | 0:25  | In Terminal 2, paste the rehearsed prompt (see below). Hit enter.     | "I'll ask it to do something real." |
| 6 | 0:32  | Events start **flashing into the BEFORE stream** as Claude works.     | "Every edit, every command, every todo — landing on disk in real time. Watch the rows light up." |
| 7 | 0:55  | Wait until 2-3 events have landed. Hit **Ctrl+C** in Terminal 2.       | "Now I'm going to kill it. Mid-flight. No warning." |
| 8 | 1:00  | Dashboard flips **DEAD** within 2s. AFTER side renders the recovery card with the **real goal you just typed**, real completed work, real open tasks. | "Process is gone. Work record survived. Goal, files touched, what was completed, what's still open — all here." |
| 9 | 1:08  | Click **Copy context**. Switch to Terminal 3. Type `claude`, paste the copied prompt, hit enter. | "I copy the resume prompt. Open a fresh Claude session. Paste it in." |
| 10 | 1:18 | New Claude reads `.nz/`, identifies the in-flight work, **starts continuing it**. New events begin flashing into the dashboard's stream. | "Brand new model, brand new process. It read the work record and picked up exactly where the dead one left off. **Zero work lost.**" |
| 11 | 1:28 | Pause. Let it sink in.                                                | "Your AI coding tool's process is ephemeral. Your work shouldn't be. That's NeverZero." |

**Total: ~90 seconds. The keystone is beat #10.**

---

## The 60-second lightning version

Cut beats 1-2 and the architecture explanation. Open *cold* with the live wiring already visible.

| # | Time | Action | Narration |
|---|------|--------|-----------|
| 1 | 0:00 | Dashboard live, agent ALIVE, recent events visible. | "Claude Code is running in this other terminal. Every edit hits this dashboard in real time. Watch." |
| 2 | 0:05 | Paste a quick task into Claude. Events flash in. | "I'll ask it to add a small feature." |
| 3 | 0:25 | **Ctrl+C** mid-task. | "Killing it." |
| 4 | 0:28 | Flips DEAD. Real recovery card. | "Process dies. Work record lives." |
| 5 | 0:35 | Copy → paste into Terminal 3 → new Claude. | "New session reads the record…" |
| 6 | 0:50 | New events stream in. | "…and picks up exactly where the dead one stopped. Zero work lost. NeverZero." |

---

## The 3-minute pitch version

Add a 60-second problem framing at the front, plus the ⌘K search beat in the middle.

### Frame the problem (0:00 – 0:45)

> "Show of hands — who's had a Claude Code, Cursor, or Cline session die mid-task? Every hand goes up. What happens next?
>
> You open a fresh session. You spend ten, fifteen minutes catching the new model up by hand. You forget the three approaches that already failed. You re-litigate decisions you settled an hour ago.
>
> The pain scales linearly with session length. The longer you work, the worse the death.
>
> This is a *persistence problem*, not a model problem. The agent's process is ephemeral; the work record shouldn't be. NeverZero captures the right state to disk during the session, then makes resume cheap."

### Run the live demo (0:45 – 2:15)

The full 90s beat sheet above.

### Add the ⌘K search beat (2:15 – 2:35)

*(Requires `ZEROENTROPY_API_KEY` set + `node scripts/nz-sync.mjs` run beforehand.)*

| Action | Narration |
|--------|-----------|
| Hit ⌘K. Type *"why did we not use websockets"*. | "But the work record isn't just a dump. It's queryable." |
| Results dropdown opens. Top hit is the actual ledger event about rejecting WebSockets, scored 0.62. | "Semantic search over every decision the agent has ever made. ZeroEntropy under the hood, zerank-2 reranker. The work record becomes your team's institutional memory." |

### Close (2:35 – 3:00)

> "It's plain files on disk. Runtime-agnostic — Claude Code today, anything tomorrow. The whole thing is on `kush` branch. Demo's running. Questions."

---

## Pre-flight checklist (run 5 min before)

```bash
# 1. Free port 3000 (otherwise next falls back to 3001 — minor pacing risk)
#    Windows: taskkill /PID <pid> /F   ·   macOS/Linux: lsof -ti:3000 | xargs kill

# 2. Clean state — no leftover .nz/ from prior testing
cd E:/gbrain/neverzero-workspace
rm -rf .nz

# 3. Start the dashboard
pnpm install         # if first time
pnpm dev             # leave running; open localhost:3000/dashboard in browser

# 4. Confirm dashboard opens on DEAD (fixtures) with pill = ⚡ HOOKS · idle (gray)

# 5. In Terminal 2, verify Claude Code is wired
claude --version     # any recent version works
# (don't start a session yet — that's beat #3)

# 6. (Optional, for 3-min version) ZeroEntropy
$env:ZEROENTROPY_API_KEY = "your_key"      # in the pnpm dev terminal
node scripts/nz-sync.mjs                    # run once after a real claude session has written .nz/
# Restart pnpm dev to pick up the env var
```

**Smoke test once before going on stage:**
1. `claude` in Terminal 2 → dashboard should flip ALIVE within ~3s.
2. Type any quick prompt → at least one event flashes into BEFORE stream within ~5s.
3. `/exit` → dashboard flips DEAD within ~3s.
4. `rm -rf .nz` to reset for the real demo.

---

## The rehearsed prompts (paste these — don't improvise)

**For the live-demo task (beat #5)** — pick the one that's most visible for your audience:

> Add a small banner component to `app/page.tsx` that says **"Now in private beta · join waitlist →"**. Use the existing landing CSS tokens. Then update the landing page to render it at the top of the hero. Add a TodoWrite plan first.

*Why this prompt:*
- Specific enough that Claude won't ramble
- Visible side effects (file write + edit) hit the hooks immediately
- TodoWrite gives the resume card real open tasks to show
- Audience can see it's a real product change, not a fake echo

**For the resumed Claude (beat #9)** — the copied prompt does the work. Don't add anything. The whole point is *paste verbatim → it continues*.

**For the ⌘K search beat (3-min version, beat 2:15)** — these all return strong reranked hits if you've indexed via `nz-sync.mjs`:
- *"why did we not use websockets"*
- *"what's the next deploy step"*
- *"what failed in this session"*

---

## Failure modes and stage recovery

| If this happens | Do this | Say this |
|-----------------|---------|----------|
| Dashboard stuck on idle after `claude` starts | Wait one more poll cycle (2s). If still idle, check Terminal 2 — Claude might be waiting on a permission prompt. | "Hooks fire on the first tool call — let me give it something to do." |
| Pill turns green but BEFORE stream empty | Claude is still processing the first prompt. Wait 5s. | "First request — give it a beat." |
| Ctrl+C doesn't flip DEAD within 5s | Heartbeat-stale detection kicks in at 15s. If past that, refresh the browser. | "We design for hard kills — even SIGKILL recovers, just slower." |
| New Claude (beat #10) acknowledges but doesn't act | Type a one-liner: *"Yes — start now."* | "The prompt instructs it to begin, but model temperaments vary." |
| ⌘K returns nothing | `nz-sync.mjs` hasn't been run since the last `claude` session. | "Indexing is one command — let me skip the search beat." |
| Browser shows old state | Hard refresh (Ctrl+Shift+R). Polling is no-cache but the SSR shell isn't. | (don't narrate) |
| ZeroEntropy API down / slow | Resume prompt falls back to the base form. The retrieval block disappears. | "We always fall back to the full work record. The demo never breaks." |

---

## What NOT to say

- Don't call it "AI-powered." Of course it is.
- Don't say "revolutionary," "game-changing," "groundbreaking." Show, don't claim.
- Don't apologize for the polling interval. "Every 2 seconds" sounds fine; "only every 2 seconds" sounds defensive.
- Don't explain the architecture diagram unless asked. The live recovery is the proof.
- Don't promise multi-machine sync, web auth, or a cloud product. The pitch is the **local primitive that makes resume cheap.** Everything else is roadmap.

---

## What to do when it works (closers, ranked)

1. *(Recommended)* — "Your AI coding tool's process is ephemeral. Your work shouldn't be. That's NeverZero."
2. — "Every other AI dev tool optimizes the next token. We optimize the next session."
3. — "The product you're looking at is reading the work record of the session that built it. The dashboard knows it died, too."

---

## After-the-demo references (if asked)

- Repo: https://github.com/ayushozha/neverzero-workspace/tree/kush
- Architecture: see [`README.md`](README.md)
- Data protocol spec: [`CLAUDE.md`](CLAUDE.md)
- Hook dispatcher: [`scripts/nz-hook.mjs`](scripts/nz-hook.mjs)
- Polling endpoint: [`app/dashboard/state/route.ts`](app/dashboard/state/route.ts)
- The whole thing is ~3000 lines on one branch. Read it on the plane.
