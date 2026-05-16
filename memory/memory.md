# System Memory

Generated on 2026-05-16 for the workspace:
`C:\Users\ayush\Desktop\Hackathons\YC\05-16-2026\Gstack x Gbrain`

This file captures the current repository memory so a future agent can resume
without rediscovering the same context.

## Health And Repo State

- This folder is not a Git repository. `git status` fails with "not a git repository".
- No `package.json`, lockfile, Vite config, Next config, TypeScript config, `.gitignore`,
  or other app scaffold config exists inside this folder.
- No `.nz/` runtime state directory exists yet.
- No fixture directory exists yet.
- Existing node and python processes are MCP/tooling services outside this repo, not
  repo dev servers. They were left untouched.
- The main memory file now lives at `memory/memory.md`.
- Per-feature memory files belong under `memory/features/`.
- Root `AGENTS.md` defines the memory documentation rules agents must follow at
  the beginning of each task.
- Top-level workstation files match the corresponding files under
  `design-pkg/neverzero-cloud/project/` by SHA-256 hash.
- Mobile prototype files exist only under `design-pkg/neverzero-cloud/project/`.
- `design` and `design.gz` appear to be exported design artifacts.

## Memory Documentation Structure

- `memory/memory.md` is the main system memory for repo-wide context, product
  intent, architecture, contracts, and cross-feature decisions.
- `memory/features/` stores feature-specific memory files.
- Each feature memory file should be named `memory/features/<feature-name>.md`,
  using lowercase kebab-case for `<feature-name>`.
- Agents should update memory documentation during the same task that changes
  behavior, feature scope, repository structure, or implementation intent.
- For repo-wide changes, update this file. For named features, create or update
  the matching file under `memory/features/`.

## Product Identity

- Product name in the design bundle: NeverZero Workstation / NeverZero Mission Control.
- Core pitch: "Git for agent context."
- Product purpose: a control plane / shared workspace for AI-native engineering teams
  where humans and agents coordinate work, preserve project memory, and resume across
  sessions and runtimes.
- The product should make AI work feel multiplayer: agents register in one room, claim
  work, avoid conflicts, append events, preserve decisions, and hand off resumable state.
- The UI direction from the design chat is white background, minimalism, quiet hairlines,
  generous whitespace, Geist type, near-black ink, and low-chroma agent identity colors.

## Workstream Split From Design Notes

Ayush/core workstream:

- Own the local-first primitives for the hackathon demo.
- Build `.nz/` as the single source of truth.
- Build a small `nz` CLI.
- Keep GBrain optional until the local flow works.
- Do not own full UI polish, mobile demo, The Hog workflow, SaaS auth, billing, Docker,
  or production conflict resolution.

Teammate/demo workstream:

- Own the demo dashboard and visualization surfaces.
- Render agent registry, ledger timeline, memory, latest handoff packet, conflict demo,
  and sponsor status strip.
- Build against local JSON/NDJSON fixtures first.
- Keep sponsor APIs behind mockable wrappers and show local fallback states if credentials
  are unavailable.

## Required Local State Contract

The intended demo state shape is:

```text
.nz/
  room.json
  ledger.ndjson
  memory.json
  handoff/
    latest.nzr.json
```

`room.json` should store active agent presence:

- `room_id`
- `project`
- `agents[]`
- agent fields: `id`, `name`, `runtime`, `machine`, `status`, `current_task`,
  `last_heartbeat`

`ledger.ndjson` should append one JSON event per line. Important event types:

- `agent_joined`
- `heartbeat`
- `task_claimed`
- `task_released`
- `decision`
- `failure`
- `handoff_created`
- `resume_consumed`
- optional demo events such as `conflict_detected` and `research_evidence`

`memory.json` should persist:

- goals
- constraints
- decisions with reasons
- rejected approaches
- files touched
- agent capabilities

`handoff/latest.nzr.json` should contain:

- goal
- current_state
- completed_work
- open_tasks
- decisions
- failed_attempts
- next_best_action
- memory_pointers

## Required CLI Surface

Minimum intended `nz` commands:

```text
nz init
nz join --name <name> --runtime <runtime>
nz heartbeat --agent <agent-id>
nz claim --agent <agent-id> --task <task>
nz log --agent <agent-id> --type <type> --summary <summary>
nz memory set --key <key> --value <value>
nz handoff --agent <agent-id>
nz resume
```

Nice-to-have commands:

```text
nz status
nz conflict-check --task <task>
```

## Sponsor Boundaries

- GBrain: primary memory backend candidate, but local JSON must remain the fallback and
  should work first.
- ZeroEntropy: optional compression hook, likely exposed as `nz handoff --compress`.
- The Hog: optional research/review event source; not required for the core path.
- GStack: useful as an agent runtime / registration surface, but the CLI contract should
  not assume GStack-only behavior.
- Lightsprint appears in the prototype as a deployment provider, not in the core contract.

## Current Files

Root workstation prototype:

- `NeverZero Workstation.html` loads React 18, ReactDOM, Babel standalone, `styles.css`,
  `tweaks-panel.jsx`, `icons.jsx`, `data.jsx`, `doc.jsx`, `doc-blocks.jsx`, `shell.jsx`,
  and `app.jsx`.
- `app.jsx` is the root workstation component. It wires tweak state, palette state,
  rail state, focused agent, plan todos, context compression simulation, and animated
  agent cursors.
- `shell.jsx` defines `TopBar`, `Sidebar`, `RightRail`, `ActivityList`, `AgentInspector`,
  `MemoryPanel`, `ContextPanel`, `Compose`, `SkillPalette`, and `MobilePop`.
- `doc.jsx` defines document-level components: `ContextStrip`, `StatusStrip`, `Todo`,
  and `TodoList`.
- `doc-blocks.jsx` defines embedded blocks: `AgentBlock`, `DecisionLog`, `MemoryBlock`,
  `SkillsRow`, and `ContinueBanner`.
- `data.jsx` defines static `AGENTS`, `PEOPLE`, `SKILLS`, `EVENTS`, and `MEMORY`, then
  attaches them to `window`.
- `icons.jsx` defines inline SVG icon components and attaches `Icons` to `window`.
- `tweaks-panel.jsx` provides the design-tool tweak panel and localStorage-backed edit
  controls.
- `styles.css` implements the desktop workstation visual system.

Other root prototype:

- `NeverZero Doc - Minimal.html` is a standalone minimal document prototype with inline
  CSS/JS and no React component graph.

Packaged design bundle:

- `design-pkg/neverzero-cloud/README.md` identifies the folder as a Claude Design handoff
  bundle and says to read chat transcripts before implementation.
- `design-pkg/neverzero-cloud/chats/chat1.md` records the design conversation. It covers
  workstation creation, mobile companion creation, verifier pass, and ends with a user
  request for a landing page.
- `design-pkg/neverzero-cloud/project/` contains the duplicated workstation files plus
  mobile-only prototype files.

Mobile-only packaged files:

- `NeverZero Mobile.html` loads React 18, ReactDOM, Babel standalone, `mobile.css`,
  `ios-frame.jsx`, `data.jsx`, `mobile-icons.jsx`, `mobile-screens.jsx`,
  `mobile-sheets.jsx`, and `mobile-app.jsx`.
- `mobile-app.jsx` wires the iOS-style app shell, tabs, compose sheet, agent detail sheet,
  and responsive phone scaling.
- `mobile-screens.jsx` defines Today, Doc, Agents, and Activity screens.
- `mobile-sheets.jsx` defines the compose sheet, agent detail sheet, and bottom tab bar.
- `ios-frame.jsx` provides the iOS device/status/nav/list/keyboard frame components.
- `mobile-icons.jsx` defines mobile icon components.
- `mobile.css` implements the mobile visual system.

## Prototype Behavior Implemented

Desktop workstation:

- Notion-style project document for "Atlas Q3 Launch".
- Top bar with workspace breadcrumbs, human and agent presence, search, sync, share, and
  overflow controls.
- Sidebar with workspace navigation, project tree, attached agents, and sponsor strip.
- Living document with status strip, plan todos, embedded live agent block, decision log,
  project memory pins, skills row, and continue-on-mobile banner.
- Right rail tabs for Activity, Agent, Memory, and Context.
- Compose bar with `/` skill palette invocation.
- Keyboard shortcut `Cmd/Ctrl+K` opens the skill palette.
- `Compress old turns` simulates context compression from 84 percent to 38 percent.
- Agent cursors animate over the document when enabled.
- Tweaks panel controls density, right rail visibility, agent cursor visibility, and
  compression action.

Mobile prototype:

- iPhone-style shell with Today, Doc, Agents, and Activity tabs.
- Center FAB opens compose sheet.
- Agent rows open an agent detail sheet.
- Shares data with the desktop prototype through `data.jsx`.
- Intended to communicate continuity: same agents, project, context, and memory across
  laptop and mobile.

## Static Data In Current Prototype

Agents:

- Iris: research-agent, provider ZeroEntropy, working.
- Forge: build-agent, provider GStack, working.
- Atlas: planning-agent, provider GBrain, idle.
- Loop: review-agent, provider The Hog, idle.
- Beam: deploy-agent, provider Lightsprint, idle.

People:

- Sam Aoki, PM.
- Yuna Park, Design.
- Diego Marin, Eng lead.
- Priya Shah, GTM.

Skills include plan, decompose, research, compete, interview, scaffold, refactor,
review, factcheck, redteam, remember, recall, compress, and deploy.

Pinned memory items include:

- Pricing has Solo, Team, and Workspace tiers; Workspace gets agent SSO and shared memory.
- Onboarding must show one real agent doing real work within 60 seconds.
- Brand voice should say "agent" or agent names, not "AI assistant".

## Gaps To Close Next

- There is no production app scaffold yet.
- There is no CLI implementation yet.
- There is no `.nz/` state store yet.
- There are no dashboard fixtures yet.
- There is no file reader for `.nz/room.json`, `.nz/ledger.ndjson`, `.nz/memory.json`,
  or `.nz/handoff/latest.nzr.json`.
- There is no conflict-check implementation yet.
- There is no GBrain adapter boundary yet.
- There is no landing page file currently visible, despite the design transcript ending
  with a landing page request.
- The existing prototypes are browser-loaded React/Babel files and should be treated as
  design prototypes, not production architecture.

## Continuation Guidance

- If implementing core demo behavior, start with local `.nz/` files and the `nz` CLI
  before any sponsor integration.
- If implementing UI, build against the `.nz/` contract or matching fixture files and
  keep the first screen operational rather than marketing-heavy.
- Keep dependencies minimal until the demo primitives work.
- Preserve the visual language already established: white, minimal, hairline borders,
  Geist type, compact operational surfaces, and low-chroma agent identity colors.
- Ask before changing architecture, adding a framework, adding a database, or making a
  sponsor API mandatory.
