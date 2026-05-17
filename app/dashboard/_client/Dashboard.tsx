'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Room, LedgerEvent, Memory, HandoffPacket, BeamResume, DashboardPayload } from '../types'

export type { Room, LedgerEvent, Memory, HandoffPacket, BeamResume }

// ── Types ─────────────────────────────────────────────────────────────────────

type UserStatus = 'dead' | 'joining' | 'working'
interface ToolStatus { installed: boolean; version?: string }

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  } catch { return '--:--' }
}

function fmtTimeAgo(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 0) return `${h}h ${m}m ago`
    if (m > 0) return `${m}m ago`
    return 'just now'
  } catch { return '' }
}

function useTick(ms: number) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set(n => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

// ── Topbar ────────────────────────────────────────────────────────────────────

function HooksPill({ lastEventAt }: { lastEventAt: string | null }) {
  useTick(2000)
  if (!lastEventAt) {
    return (
      <div className="nz-hooks-pill off" title="No .nz/ activity detected">
        <span className="nz-hooks-bolt">⚡</span>
        <span>HOOKS · idle</span>
      </div>
    )
  }
  const ageMs = Math.max(0, Date.now() - Date.parse(lastEventAt))
  const fresh = ageMs < 10_000
  const sec = Math.round(ageMs / 1000)
  const ago = ageMs < 1500 ? 'now'
    : sec < 60 ? `${sec}s ago`
    : `${Math.round(sec / 60)}m ago`
  return (
    <div
      className={`nz-hooks-pill ${fresh ? 'live' : 'quiet'}`}
      title="Wired via .claude/settings.json — SessionStart · UserPromptSubmit · PostToolUse · Stop · SessionEnd"
    >
      <span className="nz-hooks-bolt">⚡</span>
      <span>HOOKS · {ago}</span>
    </div>
  )
}

function Topbar({
  projectName, userStatus, gstack, gbrain, lastEventAt,
}: {
  projectName: string
  userStatus: UserStatus
  gstack: ToolStatus
  gbrain: ToolStatus
  lastEventAt: string | null
}) {
  return (
    <div className="nz-topbar">
      <div className="nz-brand">
        <div className="nz-logo" />
        <span className="nz-brand-name">NeverZero</span>
        <span className="nz-brand-sep">/</span>
        <span className="nz-brand-proj">{projectName}</span>
      </div>

      <RetrieveBox />

      <div className="nz-topbar-right">
        <HooksPill lastEventAt={lastEventAt} />
        <div className="nz-tool-pill">
          <div className={`nz-tool-dot ${gbrain.installed ? 'ok' : 'off'}`} />
          <span>GBrain</span>
          {gbrain.version && <span className="nz-tool-ver">{gbrain.version}</span>}
        </div>
        <div className="nz-tool-pill">
          <div className={`nz-tool-dot ${gstack.installed ? 'ok' : 'off'}`} />
          <span>GStack</span>
          {gstack.version && <span className="nz-tool-ver">{gstack.version}</span>}
        </div>
        <div className={`nz-session-badge ${userStatus}`}>
          {userStatus === 'dead' ? '— DEAD'
            : userStatus === 'joining' ? '◌ JOINING'
            : '● ACTIVE'}
        </div>
      </div>
    </div>
  )
}

// ── Retrieve box (semantic search over the work record) ──────────────────────

interface RetrieveHit { path: string; content: string; score: number }
interface RetrieveResponse { enabled: boolean; results: RetrieveHit[]; error?: string }

function RetrieveBox() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [results, setResults] = useState<RetrieveHit[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ⌘K / Ctrl-K to focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  // debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
    const term = q.trim()
    if (term.length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await fetch(`/dashboard/search?q=${encodeURIComponent(term)}&k=6`, {
          cache: 'no-store',
          signal: ctrl.signal,
        })
        const data: RetrieveResponse = await res.json()
        setEnabled(data.enabled)
        setResults(data.results ?? [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [q])

  const handleCopy = useCallback((hit: RetrieveHit) => {
    const text = `[${hit.path}] ${hit.content}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(hit.path)
      setTimeout(() => setCopied(null), 1400)
    })
  }, [])

  const showResults = open && (q.trim().length >= 2 || loading)

  return (
    <div ref={wrapRef} className={`nz-retrieve${open ? ' open' : ''}`}>
      <div className="nz-retrieve-input-wrap">
        <span className="nz-retrieve-icon">⌕</span>
        <input
          ref={inputRef}
          className="nz-retrieve-input"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={enabled ? 'Search the work record · semantic · zerank-2' : 'Set ZEROENTROPY_API_KEY to enable retrieval'}
          disabled={!enabled}
          spellCheck={false}
        />
        {loading
          ? <span className="nz-retrieve-spin" />
          : <span className="nz-retrieve-kbd">⌘K</span>}
      </div>

      {showResults && (
        <div className="nz-retrieve-pop">
          {results.length === 0 ? (
            <div className="nz-retrieve-empty">
              {loading ? 'searching…' : 'no matches'}
            </div>
          ) : (
            <div className="nz-retrieve-list">
              {results.map((hit) => (
                <button
                  key={hit.path}
                  className="nz-retrieve-row"
                  onClick={() => handleCopy(hit)}
                  title="Click to copy this snippet"
                >
                  <div className="nz-retrieve-row-hd">
                    <span className="nz-retrieve-path">{hit.path}</span>
                    <span className="nz-retrieve-score">{hit.score.toFixed(2)}</span>
                  </div>
                  <div className="nz-retrieve-content">
                    {hit.content.replace(/\s+/g, ' ').slice(0, 240)}
                    {hit.content.length > 240 ? '…' : ''}
                  </div>
                  <div className="nz-retrieve-copy">
                    {copied === hit.path ? '✓ copied' : '⎘ copy'}
                  </div>
                </button>
              ))}
              <div className="nz-retrieve-foot">
                ranked by <b>zerank-2</b> · {results.length} of top 6
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── BEFORE side — the agent's last alive moment, frozen ───────────────────────

function BeforeSide({
  beamResume, ledger,
}: {
  beamResume: BeamResume | null
  ledger: LedgerEvent[]
}) {
  const diedAt = beamResume?.died_at

  const stream = ledger
    .slice()
    .reverse()
    .slice(0, 9)

  // Flash newly-arrived events so judges literally see the dashboard react.
  // After 1.6s the row settles. Skips the first render to avoid flashing the
  // entire seed list on initial load.
  const seenRef = useRef<Set<string> | null>(null)
  const [flashed, setFlashed] = useState<Set<string>>(new Set())
  useEffect(() => {
    const seen = seenRef.current
    const curKeys = stream.map(e => `${e.ts}|${e.summary}`)
    if (seen === null) {
      seenRef.current = new Set(curKeys)
      return
    }
    const fresh = curKeys.filter(k => !seen.has(k))
    if (fresh.length === 0) return
    fresh.forEach(k => seen.add(k))
    setFlashed(prev => {
      const next = new Set(prev)
      fresh.forEach(k => next.add(k))
      return next
    })
    const t = setTimeout(() => {
      setFlashed(prev => {
        const next = new Set(prev)
        fresh.forEach(k => next.delete(k))
        return next
      })
    }, 1600)
    return () => clearTimeout(t)
  }, [stream.map(e => `${e.ts}|${e.summary}`).join('§')])

  return (
    <div className="nz-side nz-side-before">
      <div className="nz-side-hd">
        <div className="nz-side-eyebrow">Before</div>
        <div className="nz-side-title">
          <span className="nz-side-dot alive" />
          Agent was alive
        </div>
        <div className="nz-side-sub">
          {diedAt ? `frozen at ${fmtTime(diedAt)} · last living state` : 'last living state'}
        </div>
      </div>

      <div className="nz-side-body nz-frozen">
        <div className="nz-agent-card before">
          <div className="nz-agent-av before">YOU</div>
          <div className="nz-agent-meta">
            <div className="nz-agent-name">You</div>
            <div className="nz-agent-state">working · context loaded</div>
          </div>
          <div className="nz-frozen-tag">FROZEN</div>
        </div>

        {beamResume && (
          <>
            <div className="nz-blk">
              <div className="nz-blk-lbl">Goal</div>
              <div className="nz-blk-goal">{beamResume.goal}</div>
            </div>

            <div className="nz-blk">
              <div className="nz-blk-lbl">Last known state</div>
              <div className="nz-blk-state">{beamResume.last_known_state}</div>
            </div>
          </>
        )}

        <div className="nz-blk">
          <div className="nz-blk-lbl">What it was doing</div>
          <div className="nz-stream">
            {stream.length === 0 ? (
              <div className="nz-stream-empty">No recorded activity</div>
            ) : stream.map((ev, i) => {
              const isSkill = ev.summary.startsWith('/')
              const isFail = ev.type === 'failure'
              const isDone = ev.type === 'decision' && isSkill
              const icon = isFail ? '✗' : isDone ? '✓' : isSkill ? '○' : '·'
              const cls = isFail ? 'fail' : isDone ? 'done' : ''
              const key = `${ev.ts}|${ev.summary}`
              const isNew = flashed.has(key)
              return (
                <div key={`${key}-${i}`} className={`nz-stream-row ${cls}${isNew ? ' nz-new' : ''}`}>
                  <span className="nz-stream-icon">{icon}</span>
                  <span className="nz-stream-txt">{ev.summary}</span>
                  <span className="nz-stream-time">{fmtTime(ev.ts)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {beamResume && beamResume.open_tasks.length > 0 && (
          <div className="nz-blk">
            <div className="nz-blk-lbl">In flight when it died</div>
            <div className="nz-inflight">
              {beamResume.open_tasks.map((t, i) => (
                <div key={i} className="nz-inflight-row">
                  <span className="nz-inflight-dot" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="nz-ctx-bar live">
          <span className="nz-ctx-dot" />
          context window · LIVE
        </div>
      </div>
    </div>
  )
}

// ── SEAM — the death divider down the middle ──────────────────────────────────

function Seam({
  userStatus, diedAt, resumedAt,
}: {
  userStatus: UserStatus
  diedAt?: string
  resumedAt: string | null
}) {
  useTick(30_000)

  return (
    <div className={`nz-seam ${userStatus}`}>
      <div className="nz-seam-line" />
      <div className={`nz-seam-badge ${userStatus}`}>
        <div className="nz-seam-glyph">
          {userStatus === 'dead' ? '☠'
            : userStatus === 'joining' ? '↻'
            : '✓'}
        </div>
        <div className="nz-seam-lbl">
          {userStatus === 'dead' ? 'DIED'
            : userStatus === 'joining' ? 'RESTORING'
            : 'RECOVERED'}
        </div>
        <div className="nz-seam-sub">
          {userStatus === 'dead'
            ? (diedAt ? fmtTimeAgo(diedAt) : 'session ended')
            : userStatus === 'joining'
              ? 'loading context…'
              : (resumedAt ? fmtTimeAgo(resumedAt) : 'just now')}
        </div>
        <div className="nz-seam-tail">
          {userStatus === 'dead' ? 'context lost'
            : userStatus === 'joining' ? 'from work record'
            : 'zero work lost'}
        </div>
        <div className="nz-seam-wire">
          fed by <b>.claude/settings.json</b>
        </div>
      </div>
    </div>
  )
}

// ── AFTER side — dead → joining → recovered ───────────────────────────────────

function AfterDead({
  beamResume, memory, resumePrompt, onRestart,
}: {
  beamResume: BeamResume
  memory: Memory
  resumePrompt: string
  onRestart: () => void
}) {
  const prompt = resumePrompt || beamResume.resume_prompt
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [prompt])

  const acceptedDecisions = memory.decisions.filter(d => d.status === 'accepted').length

  const preserved = [
    { k: 'Goal',           v: 'intact' },
    { k: 'Completed work', v: `${beamResume.completed_work.length} checkpointed` },
    { k: 'Open tasks',     v: `${beamResume.open_tasks.length} recoverable` },
    { k: 'Memory layers',  v: `${memory.goals.length}G · ${memory.constraints.length}C · ${acceptedDecisions}D` },
    { k: 'Resume packet',  v: 'generated' },
  ]

  return (
    <>
      <div className="nz-after-banner dead">
        Process gone — but the work record survived.
      </div>

      <div className="nz-blk">
        <div className="nz-blk-lbl">Survived the crash</div>
        <div className="nz-preserved">
          {preserved.map((p, i) => (
            <div key={i} className="nz-preserved-row">
              <span className="nz-preserved-check">✓</span>
              <span className="nz-preserved-k">{p.k}</span>
              <span className="nz-preserved-v">{p.v}</span>
            </div>
          ))}
        </div>
      </div>

      {beamResume.failed_attempts.length > 0 && (
        <div className="nz-blk">
          <div className="nz-blk-lbl">Don&apos;t repeat</div>
          <div className="nz-failed">
            {beamResume.failed_attempts.map((f, i) => (
              <div key={i} className="nz-failed-row">
                <span className="nz-failed-x">✗</span>
                <div>
                  {f.task}
                  <div className="nz-failed-sub">{f.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="nz-blk">
        <div className="nz-blk-lbl">Next best action</div>
        <div className="nz-next">{beamResume.next_best_action}</div>
      </div>

      <div className="nz-blk">
        <div className="nz-blk-lbl">Context for Claude Code · paste into a fresh session</div>
        <pre className="nz-prompt">{prompt}</pre>
      </div>

      <div className="nz-after-foot">
        <button
          className={`nz-copy${copied ? ' copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ Copied' : '⎘ Copy context'}
        </button>
        <button className="nz-reenter" onClick={onRestart}>
          Re-enter session →
        </button>
      </div>
    </>
  )
}

function AfterJoining() {
  const steps = ['Goal', 'Preserved memory', 'Open tasks', 'Decision log']
  return (
    <div className="nz-joining-stage">
      <div className="nz-joining-orb" />
      <div className="nz-joining-title">Restoring context</div>
      <div className="nz-joining-desc">Re-hydrating from the work record…</div>
      <div className="nz-joining-steps">
        {steps.map((s, i) => (
          <div
            key={i}
            className="nz-joining-step"
            style={{ animationDelay: `${i * 380}ms` }}
          >
            <span className="nz-joining-step-dot" />
            {s}
          </div>
        ))}
      </div>
    </div>
  )
}

function AfterRecovered({
  beamResume, ledger, resumedAt,
}: {
  beamResume: BeamResume | null
  ledger: LedgerEvent[]
  resumedAt: string | null
}) {
  const events = resumedAt
    ? [...ledger, {
        ts: resumedAt, agent_id: 'you', type: 'task_started',
        summary: 'Session resumed · context loaded from work record',
      } as LedgerEvent]
    : ledger
  const feed = events.slice().reverse().slice(0, 12)

  const openN = beamResume?.open_tasks.length ?? 0

  return (
    <>
      <div className="nz-after-banner ok">
        ✓ Resumed exactly where it died.
      </div>

      <div className="nz-proof">
        <div className="nz-proof-cell">
          <div className="nz-proof-num">0</div>
          <div className="nz-proof-lbl">work lost</div>
        </div>
        <div className="nz-proof-cell">
          <div className="nz-proof-num">{openN}</div>
          <div className="nz-proof-lbl">tasks now active</div>
        </div>
        <div className="nz-proof-cell">
          <div className="nz-proof-num ok">✓</div>
          <div className="nz-proof-lbl">context restored</div>
        </div>
      </div>

      <div className="nz-blk">
        <div className="nz-blk-lbl">Live session</div>
        <div className="nz-stream">
          {feed.map((ev, i) => {
            const isResume = ev.agent_id === 'you' && ev.type === 'task_started'
            const isSkill = ev.summary.startsWith('/')
            const isFail = ev.type === 'failure'
            const isDone = ev.type === 'decision' && isSkill
            const icon = isResume ? '▶' : isFail ? '✗' : isDone ? '✓' : isSkill ? '○' : '·'
            const cls = isResume ? 'resumed' : isFail ? 'fail' : isDone ? 'done' : ''
            return (
              <div key={i} className={`nz-stream-row ${cls}`}>
                <span className="nz-stream-icon">{icon}</span>
                <span className="nz-stream-txt">{ev.summary}</span>
                <span className="nz-stream-time">{fmtTime(ev.ts)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="nz-ctx-bar live">
        <span className="nz-ctx-dot" />
        context window · RESTORED
      </div>
    </>
  )
}

function AfterLive({ ledger }: { ledger: LedgerEvent[] }) {
  const feed = ledger.slice().reverse().slice(0, 12)
  return (
    <>
      <div className="nz-after-banner ok">
        ● Live — agent working, memory syncing to the record.
      </div>
      <div className="nz-blk">
        <div className="nz-blk-lbl">Live session</div>
        <div className="nz-stream">
          {feed.length === 0 ? (
            <div className="nz-stream-empty">No activity yet</div>
          ) : feed.map((ev, i) => {
            const isSkill = ev.summary.startsWith('/')
            const isFail = ev.type === 'failure'
            const isDone = ev.type === 'decision' && isSkill
            const icon = isFail ? '✗' : isDone ? '✓' : isSkill ? '○' : '·'
            const cls = isFail ? 'fail' : isDone ? 'done' : ''
            return (
              <div key={i} className={`nz-stream-row ${cls}`}>
                <span className="nz-stream-icon">{icon}</span>
                <span className="nz-stream-txt">{ev.summary}</span>
                <span className="nz-stream-time">{fmtTime(ev.ts)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="nz-ctx-bar live">
        <span className="nz-ctx-dot" />
        context window · LIVE
      </div>
    </>
  )
}

function AfterSide({
  userStatus, beamResume, memory, ledger, resumePrompt, everDied, resumedAt, onRestart,
}: {
  userStatus: UserStatus
  beamResume: BeamResume | null
  memory: Memory
  ledger: LedgerEvent[]
  resumePrompt: string
  everDied: boolean
  resumedAt: string | null
  onRestart: () => void
}) {
  const workingRecovered = userStatus === 'working' && everDied
  const badge =
    userStatus === 'dead' ? { cls: 'dead', txt: 'DEAD', dot: 'dead' }
      : userStatus === 'joining' ? { cls: 'joining', txt: 'RESTORING', dot: 'joining' }
      : workingRecovered ? { cls: 'working', txt: 'RECOVERED', dot: 'working' }
      : { cls: 'working', txt: 'LIVE', dot: 'working' }

  return (
    <div className={`nz-side nz-side-after ${userStatus}`}>
      <div className="nz-side-hd">
        <div className="nz-side-eyebrow">After</div>
        <div className="nz-side-title">
          <span className={`nz-side-dot ${badge.dot}`} />
          {userStatus === 'dead' ? 'Agent is dead'
            : userStatus === 'joining' ? 'Coming back'
            : workingRecovered ? 'Agent recovered'
            : 'Agent is live'}
          <span className={`nz-side-badge ${badge.cls}`}>{badge.txt}</span>
        </div>
        <div className="nz-side-sub">
          {userStatus === 'dead' ? 'preserved & ready to resume'
            : userStatus === 'joining' ? 'restoring from work record'
            : workingRecovered ? 'live again · nothing lost'
            : 'working · writing to the record'}
        </div>
      </div>

      <div
        key={`${userStatus}-${workingRecovered}`}
        className={`nz-side-body nz-after-body ${userStatus}`}
      >
        {userStatus === 'dead' && beamResume && (
          <AfterDead
            beamResume={beamResume}
            memory={memory}
            resumePrompt={resumePrompt}
            onRestart={onRestart}
          />
        )}
        {userStatus === 'joining' && <AfterJoining />}
        {userStatus === 'working' && (
          workingRecovered
            ? <AfterRecovered beamResume={beamResume} ledger={ledger} resumedAt={resumedAt} />
            : <AfterLive ledger={ledger} />
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const POLL_MS = 2000

export default function Dashboard({ initial }: { initial: DashboardPayload }) {
  const [data, setData] = useState<DashboardPayload>(initial)
  const [userStatus, setUserStatus] = useState<UserStatus>(initial.liveStatus)
  const [resumedAt, setResumedAt] = useState<string | null>(null)

  // True once a death has been observed (real beam-resume or a manual re-enter).
  // Distinguishes "recovered after death" from "alive, never died".
  const everDiedRef = useRef<boolean>(initial.beamResume !== null)
  // Manual recovery locks the local joining→working transition so polling
  // can't yank it back — unless the server reports a *newer* death.
  const manualRef = useRef(false)
  const recoveredDiedAtRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Live poll of .nz/ — BEFORE fills in real time; a kill flips to DEAD.
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const res = await fetch('/dashboard/state', { cache: 'no-store' })
        if (!res.ok || !alive) return
        const next: DashboardPayload = await res.json()
        if (!alive) return
        setData(next)

        if (next.beamResume) everDiedRef.current = true
        const serverDead = next.liveStatus === 'dead'
        const newDiedAt = next.beamResume?.died_at ?? null

        setUserStatus(prev => {
          if (prev === 'joining') return prev               // mid-transition, leave it
          if (manualRef.current) {
            // Recovered locally. Only fall back to dead if this is a *new* death.
            if (serverDead && newDiedAt && newDiedAt !== recoveredDiedAtRef.current) {
              manualRef.current = false
              return 'dead'
            }
            return prev
          }
          // Not manually recovered → mirror the live server signal.
          return serverDead ? 'dead' : 'working'
        })
      } catch { /* transient — keep last good state */ }
    }
    const id = setInterval(tick, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const handleRestart = useCallback(() => {
    if (userStatus !== 'dead') return
    manualRef.current = true
    everDiedRef.current = true
    recoveredDiedAtRef.current = data.beamResume?.died_at ?? null
    setUserStatus('joining')
    timerRef.current = setTimeout(() => {
      setUserStatus('working')
      setResumedAt(new Date().toISOString())
    }, 2400)
  }, [userStatus, data.beamResume])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const everDied = everDiedRef.current

  return (
    <div className="nz-dashboard">
      <Topbar
        projectName={data.room.name}
        userStatus={userStatus}
        gstack={data.gstack}
        gbrain={data.gbrain}
        lastEventAt={data.lastHookEventAt}
      />
      <div className="nz-split">
        <BeforeSide beamResume={data.beamResume} ledger={data.ledger} />
        <Seam
          userStatus={userStatus}
          diedAt={data.beamResume?.died_at}
          resumedAt={resumedAt}
        />
        <AfterSide
          userStatus={userStatus}
          beamResume={data.beamResume}
          memory={data.memory}
          ledger={data.ledger}
          resumePrompt={data.resumePrompt}
          everDied={everDied}
          resumedAt={resumedAt}
          onRestart={handleRestart}
        />
      </div>
    </div>
  )
}
