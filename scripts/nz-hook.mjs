#!/usr/bin/env node
// NeverZero · Claude Code hook dispatcher.
//
// Wired in .claude/settings.json. Receives the hook payload as JSON on stdin.
// Writes the NeverZero work record to ./.nz/ so the dashboard can show real
// agent activity in real time and recover the session if it dies.
//
// Usage: node scripts/nz-hook.mjs <event>
//   events: session-start | user-prompt | post-tool-use | stop | session-end
//
// Design rules:
//  · NEVER throw. A hook failure must not block Claude. Catch everything, exit 0.
//  · Atomic writes (tmp + rename) so the dashboard never reads half-written JSON.
//  · Append-only ledger. Files-touched is a set, not a list, so it stays small.

import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const NZ = path.join(cwd, '.nz')
const HANDOFF = path.join(NZ, 'handoff')
const ROOM = path.join(NZ, 'room.json')
const LEDGER = path.join(NZ, 'ledger.ndjson')
const SESSION = path.join(NZ, 'session.json')
const BEAM = path.join(HANDOFF, 'beam-resume.json')

const AGENT_ID = 'forge'
const AGENT_NAME = 'Claude Code'
const ROOM_NAME = 'NeverZero · live Claude Code session'

const now = () => new Date().toISOString()

function readStdin() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve('')
    let data = ''
    const to = setTimeout(() => resolve(data), 800)  // hook may have no stdin
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end',  () => { clearTimeout(to); resolve(data) })
    process.stdin.on('error', () => { clearTimeout(to); resolve(data) })
  })
}

function ensureDirs() {
  fs.mkdirSync(NZ, { recursive: true })
  fs.mkdirSync(HANDOFF, { recursive: true })
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function writeJsonAtomic(p, obj) {
  const tmp = `${p}.tmp-${process.pid}`
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2))
  fs.renameSync(tmp, p)
}

function appendLedger(ev) {
  fs.appendFileSync(LEDGER, JSON.stringify(ev) + '\n')
}

function freshRoom(sessionId, status = 'working', task = null) {
  return {
    room_id: `nz-${sessionId ?? 'live'}`,
    name: ROOM_NAME,
    created_at: now(),
    agents: [{
      agent_id: AGENT_ID,
      name: AGENT_NAME,
      glyph: 'CC',
      role: 'build-agent',
      runtime: 'Claude Code',
      machine: 'local',
      task,
      status,
      last_heartbeat: now(),
    }],
  }
}

function touchHeartbeat(task) {
  const room = readJson(ROOM, null)
  if (!room || !Array.isArray(room.agents) || room.agents.length === 0) return
  room.agents[0].last_heartbeat = now()
  if (typeof task === 'string') room.agents[0].task = task
  room.agents[0].status = 'working'
  writeJsonAtomic(ROOM, room)
}

function loadSession(sessionId) {
  const s = readJson(SESSION, null)
  if (s && s.session_id === sessionId) return s
  return {
    session_id: sessionId ?? 'unknown',
    started_at: now(),
    goal: null,
    completed: [],     // strings — for beam-resume completed_work
    open_todos: [],    // strings — for beam-resume open_tasks
    failed: [],        // { task, reason }
    files_touched: [], // unique paths
    last_event_at: now(),
    last_summary: null,
  }
}

function saveSession(s) {
  s.last_event_at = now()
  writeJsonAtomic(SESSION, s)
}

function pushUnique(arr, v, max = 32) {
  if (!v) return arr
  const i = arr.indexOf(v)
  if (i >= 0) return arr
  arr.push(v)
  if (arr.length > max) arr.shift()
  return arr
}

function trim(s, n = 140) {
  if (!s) return ''
  const one = String(s).replace(/\s+/g, ' ').trim()
  return one.length > n ? one.slice(0, n - 1) + '…' : one
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function onSessionStart(payload) {
  ensureDirs()
  const sid = payload.session_id ?? 'live'
  // Alive again — wipe any prior death packet.
  try { fs.unlinkSync(BEAM) } catch { /* not there */ }
  writeJsonAtomic(ROOM, freshRoom(sid, 'working', 'Starting session'))
  saveSession(loadSession(sid))
  appendLedger({
    ts: now(), agent_id: AGENT_ID, type: 'task_started',
    summary: `Session started · source=${payload.source ?? 'unknown'}`,
  })
}

async function onUserPrompt(payload) {
  ensureDirs()
  const sid = payload.session_id ?? 'live'
  const sess = loadSession(sid)
  const prompt = String(payload.prompt ?? '').trim()
  if (prompt && !sess.goal) sess.goal = trim(prompt, 200)
  saveSession(sess)
  touchHeartbeat(prompt ? `Responding: ${trim(prompt, 60)}` : null)
}

async function onPostToolUse(payload) {
  ensureDirs()
  const sid = payload.session_id ?? 'live'
  const sess = loadSession(sid)
  const tool = String(payload.tool_name ?? '')
  const input = payload.tool_input ?? {}
  const resp = payload.tool_response ?? {}

  let summary = `tool: ${tool}`
  let type = 'commit'
  let failed = false
  let reason = ''

  // Detect error responses (varies by tool — be generous in what we accept).
  if (resp && typeof resp === 'object') {
    if (resp.is_error === true) failed = true
    if (typeof resp.error === 'string' && resp.error.length) { failed = true; reason = trim(resp.error, 200) }
    if (typeof resp.stderr === 'string' && resp.stderr.length && /\b(error|failed|exception)\b/i.test(resp.stderr)) {
      failed = true; reason = trim(resp.stderr, 200)
    }
  }

  switch (tool) {
    case 'Edit': {
      const p = input.file_path ?? input.path ?? '(unknown)'
      summary = `Edit · ${path.basename(p)}`
      pushUnique(sess.files_touched, p)
      break
    }
    case 'Write': {
      const p = input.file_path ?? input.path ?? '(unknown)'
      summary = `Write · ${path.basename(p)}`
      pushUnique(sess.files_touched, p)
      break
    }
    case 'Bash': {
      const cmd = input.command ?? ''
      summary = `Bash · ${trim(cmd, 80)}`
      break
    }
    case 'TodoWrite': {
      const todos = Array.isArray(input.todos) ? input.todos : []
      sess.open_todos = todos
        .filter(t => t && t.status !== 'completed')
        .map(t => trim(t.content ?? t.activeForm ?? '', 120))
        .filter(Boolean)
      const done = todos.filter(t => t && t.status === 'completed').length
      summary = `Todos · ${sess.open_todos.length} open · ${done} done`
      type = 'decision'
      break
    }
    case 'Read': case 'Glob': case 'Grep':
      // Too chatty for the demo ledger.
      saveSession(sess)
      touchHeartbeat(`Used ${tool}`)
      return
    default:
      summary = `tool: ${tool}`
  }

  if (failed) {
    sess.failed.push({ task: summary, reason: reason || 'tool reported error' })
    if (sess.failed.length > 16) sess.failed.shift()
    type = 'failure'
  } else {
    sess.completed.push(summary)
    if (sess.completed.length > 32) sess.completed.shift()
  }
  sess.last_summary = summary

  appendLedger({ ts: now(), agent_id: AGENT_ID, type, summary })
  saveSession(sess)
  touchHeartbeat(summary)
}

async function onStop(payload) {
  ensureDirs()
  // Claude finished a turn → definitely alive. Just refresh the heartbeat.
  // Also fold any stop_hook_active so we don't recurse.
  if (payload.stop_hook_active === true) return
  touchHeartbeat('Idle · waiting for next prompt')
}

async function onSessionEnd(payload) {
  ensureDirs()
  const sid = payload.session_id ?? 'live'
  const sess = loadSession(sid)
  const reason = payload.reason ?? 'unknown'
  const diedAt = now()

  const nextAction = sess.open_todos.length
    ? `Continue with: ${sess.open_todos[0]}`
    : sess.last_summary
      ? `Continue from: ${sess.last_summary}`
      : 'Read .nz/ledger.ndjson, identify the open thread, continue.'

  const beam = {
    packet_id: `nzr-${sid}-${Date.now()}`,
    agent_id: AGENT_ID,
    died_at: diedAt,
    goal: sess.goal ?? 'Continue the in-flight Claude Code session.',
    last_known_state: `Session ended (reason: ${reason}). ${sess.completed.length} completed, ${sess.open_todos.length} open, ${sess.failed.length} failed. Files touched: ${sess.files_touched.length}.`,
    completed_work: sess.completed.slice(-8),
    open_tasks: sess.open_todos.length ? sess.open_todos : ['(no TodoWrite tasks captured — read .nz/ledger.ndjson)'],
    failed_attempts: sess.failed,
    resume_prompt: '(generated server-side by the dashboard)',
    next_best_action: nextAction,
  }
  writeJsonAtomic(BEAM, beam)

  // Mark the agent dead in room.json so the dashboard flips immediately.
  const room = readJson(ROOM, null)
  if (room && room.agents && room.agents[0]) {
    room.agents[0].status = 'dead'
    room.agents[0].task = `Died: ${reason}`
    writeJsonAtomic(ROOM, room)
  }

  appendLedger({
    ts: diedAt, agent_id: AGENT_ID, type: 'failure',
    summary: `Session ended (${reason}) · beam-resume packet written`,
  })
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

const event = process.argv[2] ?? ''
const raw = await readStdin()
let payload = {}
try { payload = raw ? JSON.parse(raw) : {} } catch { payload = {} }

try {
  switch (event) {
    case 'session-start':  await onSessionStart(payload);  break
    case 'user-prompt':    await onUserPrompt(payload);    break
    case 'post-tool-use':  await onPostToolUse(payload);   break
    case 'stop':           await onStop(payload);          break
    case 'session-end':    await onSessionEnd(payload);    break
    default:
      process.stderr.write(`nz-hook: unknown event "${event}"\n`)
  }
} catch (e) {
  // Belt and suspenders — a hook crash must NEVER block Claude.
  process.stderr.write(`nz-hook[${event}] error: ${e?.message ?? e}\n`)
}
process.exit(0)
