import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Room, LedgerEvent, Memory, HandoffPacket, BeamResume, DashboardPayload } from './types'
import { zeEnabled, topSnippets } from './_zeroentropy'

// Shared, server-only loader used by both the page (SSR) and the polling route.

const cwd = process.cwd()

// If an agent's freshest heartbeat is older than this, the room is considered dead.
const HEARTBEAT_STALE_MS = 15_000

type Source = 'nz' | 'fixtures'

function readNz(nzRelPath: string): string | null {
  const full = path.join(cwd, '.nz', nzRelPath)
  try {
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : null
  } catch { return null }
}

function readFixture(rel: string): string | null {
  const full = path.join(cwd, 'fixtures', rel)
  try {
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf-8') : null
  } catch { return null }
}

function tryRead(nzRelPath: string, fixtureRelPath: string): { content: string; source: Source } | null {
  const nz = readNz(nzRelPath)
  if (nz !== null) return { content: nz, source: 'nz' }
  const fx = readFixture(fixtureRelPath)
  if (fx !== null) return { content: fx, source: 'fixtures' }
  return null
}

// ── GStack integration ────────────────────────────────────────────────────────

const SKILL_AGENT: Record<string, string> = {
  review: 'loop',
  ship: 'forge',
  autoplan: 'atlas',
  retro: 'loop',
  'plan-ceo-review': 'atlas',
  'plan-eng-review': 'atlas',
  'plan-design-review': 'atlas',
  investigate: 'iris',
  qa: 'iris',
  cso: 'iris',
  'office-hours': 'atlas',
  canary: 'beam',
  'land-and-deploy': 'beam',
  'document-release': 'forge',
  'document-generate': 'iris',
}

function convertGStackEvent(line: string): LedgerEvent | null {
  try {
    const ev = JSON.parse(line)
    if (!ev.skill || !ev.event) return null
    const agentId = SKILL_AGENT[ev.skill] ?? 'forge'
    const outcomeStr = ev.outcome ? ` · ${ev.outcome}` : ''
    const durationStr = ev.duration_s ? ` (${Math.round(ev.duration_s)}s)` : ''
    const branchStr = ev.branch ? ` on ${ev.branch}` : ''
    const summary = `/${ev.skill} ${ev.event}${outcomeStr}${durationStr}${branchStr}`
    const type = ev.outcome === 'fail'
      ? 'failure'
      : ev.event === 'started'
        ? 'task_started'
        : 'decision'
    return { ts: ev.ts ?? new Date().toISOString(), agent_id: agentId, type, summary }
  } catch { return null }
}

function readGStackTimeline(slug: string): LedgerEvent[] {
  try {
    const gstackHome = process.env.GSTACK_HOME ?? path.join(os.homedir(), '.gstack')
    const livePath    = path.join(gstackHome, 'projects', slug, 'timeline.jsonl')
    const fixturePath = path.join(cwd, 'fixtures', 'gstack-timeline.jsonl')
    const filePath = fs.existsSync(livePath) ? livePath : fs.existsSync(fixturePath) ? fixturePath : null
    if (!filePath) return []
    const content = fs.readFileSync(filePath, 'utf-8')
    return content.trim().split('\n').filter(Boolean)
      .map(convertGStackEvent)
      .filter((e): e is LedgerEvent => e !== null)
  } catch { return [] }
}

function detectTool(candidates: string[]): { installed: boolean; version?: string } {
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return { installed: true, version: fs.readFileSync(p, 'utf-8').trim() }
    } catch { /* skip */ }
  }
  return { installed: false }
}

const detectGStack = () => detectTool([
  path.join(os.homedir(), '.claude', 'skills', 'gstack', 'VERSION'),
])
const detectGBrain = () => detectTool([
  path.join('E:', 'gbrain-repo', 'VERSION'),
  path.join(os.homedir(), 'gbrain', 'VERSION'),
  path.join(os.homedir(), 'git', 'gbrain', 'VERSION'),
])

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultRoom: Room = {
  room_id: 'room-empty',
  name: 'No room data',
  created_at: new Date().toISOString(),
  agents: [],
}

const defaultMemory: Memory = {
  room_id: 'room-empty',
  updated_at: new Date().toISOString(),
  goals: [],
  constraints: [],
  decisions: [],
  rejected_approaches: [],
  files_touched: [],
}

// ── Honest resume prompt (generated from real .nz/ state) ─────────────────────

function buildBasePrompt(b: BeamResume, memory: Memory): string {
  const list = (xs: string[]) => xs.length ? xs.map(x => `- ${x}`).join('\n') : '- (none)'
  const decisions = memory.decisions
    .filter(d => d.status === 'accepted')
    .map(d => `- ${d.text}`)
  const files = memory.files_touched

  return [
    'You are resuming a NeverZero work session that died. Recover, do not restart.',
    '',
    '== HOW TO RECOVER ==',
    '1. Read CLAUDE.md at the repo root for the NeverZero data protocol.',
    '2. Read .nz/memory.json (goals, constraints, decisions) and .nz/ledger.ndjson (full work history).',
    '3. Continue from "NEXT ACTION" below. Do NOT redo completed work. Do NOT retry failed attempts.',
    '',
    '== GOAL ==',
    b.goal,
    '',
    '== LAST KNOWN STATE ==',
    b.last_known_state,
    '',
    '== ALREADY DONE — do not redo ==',
    list(b.completed_work),
    '',
    '== OPEN TASKS — do these ==',
    list(b.open_tasks),
    '',
    '== FAILED — do NOT retry these ==',
    b.failed_attempts.length
      ? b.failed_attempts.map(f => `- ${f.task} — ${f.reason}`).join('\n')
      : '- (none)',
    '',
    '== SETTLED DECISIONS — already agreed, do not relitigate ==',
    decisions.length ? decisions.join('\n') : '- (none recorded)',
    '',
    '== FILES TOUCHED ==',
    files.length ? files.join(', ') : '(none recorded)',
    '',
    '== NEXT ACTION ==',
    b.next_best_action,
    '',
    'Begin now. Append your progress to .nz/ledger.ndjson as you work.',
  ].join('\n')
}

// Cache the (possibly retrieval-augmented) prompt so the 2s dead-state poll
// doesn't hit ZeroEntropy every tick. Keyed by the state that affects it.
const promptCache = new Map<string, string>()

// When ZEROENTROPY_API_KEY is set, pull the most relevant prior work for the
// goal/next-action and inject it — so resume is *precise*, not an exhaustive
// dump. Any failure (no key, timeout, error) falls back to the full base
// prompt: the demo path never breaks.
async function buildResumePrompt(
  b: BeamResume | null,
  memory: Memory,
): Promise<string> {
  if (!b) return ''
  const base = buildBasePrompt(b, memory)
  if (!zeEnabled()) return base

  const cacheKey = `${b.packet_id}|${b.died_at}|${memory.updated_at}`
  const cached = promptCache.get(cacheKey)
  if (cached) return cached

  let out = base
  try {
    const snippets = await topSnippets(`${b.goal}\n${b.next_best_action}`, 6)
    if (snippets.length) {
      const block = snippets
        .map(s => `- [${s.path}] ${s.content.trim().replace(/\s+/g, ' ').slice(0, 280)}`)
        .join('\n')
      const section = [
        '',
        '== RELEVANT PRIOR WORK (retrieved via ZeroEntropy · zerank-2) ==',
        block,
      ].join('\n')
      // Insert just before the NEXT ACTION section.
      const marker = '\n== NEXT ACTION =='
      out = base.includes(marker)
        ? base.replace(marker, `${section}${marker}`)
        : `${base}${section}`
    }
  } catch {
    out = base
  }

  promptCache.set(cacheKey, out)
  return out
}

// ── Live status (derived from real signals) ───────────────────────────────────

function deriveLiveStatus(room: Room, beamResume: BeamResume | null, source: Source): 'dead' | 'working' {
  // A real beam-resume packet is an explicit death signal.
  if (beamResume) return 'dead'

  // In live mode, a stale/dead heartbeat means the agent process is gone.
  if (source === 'nz' && room.agents.length > 0) {
    if (room.agents.some(a => a.status === 'dead' || a.status === 'stale')) return 'dead'
    const freshest = room.agents.reduce((max, a) => {
      const t = Date.parse(a.last_heartbeat)
      return Number.isFinite(t) && t > max ? t : max
    }, 0)
    if (freshest > 0 && Date.now() - freshest > HEARTBEAT_STALE_MS) return 'dead'
  }

  return 'working'
}

// ── Public payload ────────────────────────────────────────────────────────────

export async function loadDashboardData(): Promise<DashboardPayload> {
  const roomResult   = tryRead('room.json',     'room.json')
  const ledgerResult = tryRead('ledger.ndjson', 'ledger.ndjson')
  const memoryResult = tryRead('memory.json',   'memory.json')
  const handoffResult = tryRead('handoff/latest.nzr.json', 'latest.nzr.json')

  const dataSource: Source = roomResult?.source ?? 'fixtures'

  const room: Room = roomResult ? safeParse(roomResult.content, defaultRoom) : defaultRoom
  const memory: Memory = memoryResult ? safeParse(memoryResult.content, defaultMemory) : defaultMemory

  // .nz/ledger only — used both as content AND as the source-of-truth signal
  // for "are the hooks live?" (the topbar pill must not be confused by gstack
  // fixtures, which are unrelated demo data).
  const ledger: LedgerEvent[] = ledgerResult
    ? ledgerResult.content.trim().split('\n').filter(Boolean)
        .map(l => safeParse<LedgerEvent | null>(l, null))
        .filter((e): e is LedgerEvent => e !== null)
    : []

  const lastHookEventAt: string | null =
    ledgerResult?.source === 'nz' && ledger.length
      ? ledger.reduce((max, e) => (e.ts > max ? e.ts : max), ledger[0].ts)
      : null

  const gstackSlug = path.basename(cwd)
  const gstackEvents = readGStackTimeline(gstackSlug)

  let handoff: HandoffPacket | null = null
  if (handoffResult) handoff = safeParse<HandoffPacket | null>(handoffResult.content, null)

  // In LIVE mode, a beam-resume only counts if it's a real .nz/ file — never the
  // fixture — so an alive agent writing .nz/ shows as working, and a kill that
  // writes .nz/handoff/beam-resume.json flips it to dead. In pure fixtures mode
  // we still surface the fixture so the static demo opens on the catastrophe.
  let beamResume: BeamResume | null = null
  const beamNz = readNz('handoff/beam-resume.json')
  if (beamNz !== null) {
    beamResume = safeParse<BeamResume | null>(beamNz, null)
  } else if (dataSource === 'fixtures') {
    const beamFx = readFixture('beam-resume.json')
    if (beamFx !== null) beamResume = safeParse<BeamResume | null>(beamFx, null)
  }

  let liveStatus = deriveLiveStatus(room, beamResume, dataSource)

  // Hard-kill recovery: heartbeat is stale but no SessionEnd fired (no
  // beam-resume packet). Synthesize one from the rolling .nz/session.json the
  // hook script keeps. Otherwise the AFTER side would render blank when DEAD.
  if (!beamResume && liveStatus === 'dead' && dataSource === 'nz') {
    const sessRaw = readNz('session.json')
    if (sessRaw) {
      const s = safeParse<{
        session_id?: string
        goal?: string | null
        completed?: string[]
        open_todos?: string[]
        failed?: { task: string; reason: string }[]
        files_touched?: string[]
        last_event_at?: string
        last_summary?: string | null
      } | null>(sessRaw, null)
      if (s) {
        beamResume = {
          packet_id: `nzr-synth-${s.session_id ?? 'live'}`,
          agent_id: 'forge',
          died_at: s.last_event_at ?? new Date().toISOString(),
          goal: s.goal || 'Continue the in-flight Claude Code session.',
          last_known_state: `Hard exit — heartbeat went stale before SessionEnd fired. ${(s.completed?.length ?? 0)} completed, ${(s.open_todos?.length ?? 0)} open, ${(s.failed?.length ?? 0)} failed.`,
          completed_work: (s.completed ?? []).slice(-8),
          open_tasks: s.open_todos?.length ? s.open_todos : ['(no TodoWrite tasks captured — read .nz/ledger.ndjson)'],
          failed_attempts: s.failed ?? [],
          resume_prompt: '(generated server-side)',
          next_best_action: s.open_todos?.[0]
            ? `Continue with: ${s.open_todos[0]}`
            : s.last_summary
              ? `Continue from: ${s.last_summary}`
              : 'Read .nz/ledger.ndjson, identify the open thread, continue.',
        }
        // Re-derive — synthesized packet should be treated as a real death.
        liveStatus = 'dead'
      }
    }
  }
  const resumePrompt = await buildResumePrompt(beamResume, memory)

  return {
    room,
    ledger: [...ledger, ...gstackEvents],
    memory,
    handoff,
    beamResume,
    resumePrompt,
    liveStatus,
    dataSource,
    lastHookEventAt,
    gstack: detectGStack(),
    gbrain: detectGBrain(),
  }
}

function safeParse<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T } catch { return fallback }
}
