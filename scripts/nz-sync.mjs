#!/usr/bin/env node
// One-shot indexer: push the .nz/ work record into a ZeroEntropy collection so
// resume can retrieve only the *relevant* prior work instead of dumping it all.
//
//   ZEROENTROPY_API_KEY=... node scripts/nz-sync.mjs
//
// Idempotent: every document is added with overwrite:true.

import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.ZEROENTROPY_BASE_URL ?? 'https://api.zeroentropy.dev/v1'
const KEY = process.env.ZEROENTROPY_API_KEY
const COLLECTION = process.env.ZEROENTROPY_COLLECTION ?? 'neverzero'
const NZ = path.join(process.cwd(), '.nz')

if (!KEY) {
  console.error('✗ ZEROENTROPY_API_KEY is not set. Aborting.')
  process.exit(1)
}
if (!fs.existsSync(NZ)) {
  console.error(`✗ No .nz/ directory at ${NZ}. Nothing to index.`)
  process.exit(1)
}

async function ze(endpoint, body) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const err = new Error(`${endpoint} ${res.status}: ${txt.slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(NZ, rel), 'utf8')) }
  catch { return fallback }
}
function readNdjson(rel) {
  try {
    return fs.readFileSync(path.join(NZ, rel), 'utf8')
      .trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l) } catch { return null } })
      .filter(Boolean)
  } catch { return [] }
}

// ── Collect documents ─────────────────────────────────────────────────────────

const docs = []

const ledger = readNdjson('ledger.ndjson')
ledger.forEach((ev, i) => {
  docs.push({
    path: `ledger/${(ev.ts ?? '').replace(/[:.]/g, '-')}-${i}`,
    text: `[${ev.type ?? 'event'}] ${ev.summary ?? ''}${ev.task ? ` (task: ${ev.task})` : ''}`,
    metadata: { kind: 'ledger', agent_id: String(ev.agent_id ?? ''), ev_type: String(ev.type ?? ''), ts: String(ev.ts ?? '') },
  })
})

const memory = readJson('memory.json', null)
if (memory) {
  for (const d of memory.decisions ?? []) {
    docs.push({
      path: `decision/${d.id ?? d.ts}`,
      text: `Decision (${d.status ?? 'accepted'}): ${d.text ?? ''}`,
      metadata: { kind: 'decision', agent_id: String(d.agent_id ?? ''), status: String(d.status ?? ''), ts: String(d.ts ?? '') },
    })
  }
  ;(memory.goals ?? []).forEach((g, i) =>
    docs.push({ path: `memory/goal-${i}`, text: `Goal: ${g}`, metadata: { kind: 'goal' } }))
  ;(memory.constraints ?? []).forEach((c, i) =>
    docs.push({ path: `memory/constraint-${i}`, text: `Constraint: ${c}`, metadata: { kind: 'constraint' } }))
}

const beam = readJson('handoff/beam-resume.json', null)
if (beam) {
  docs.push({
    path: `beam-resume/${beam.packet_id ?? 'latest'}`,
    text: [
      `Goal: ${beam.goal ?? ''}`,
      `Last known state: ${beam.last_known_state ?? ''}`,
      `Completed: ${(beam.completed_work ?? []).join('; ')}`,
      `Open: ${(beam.open_tasks ?? []).join('; ')}`,
      `Failed: ${(beam.failed_attempts ?? []).map(f => `${f.task} — ${f.reason}`).join('; ')}`,
      `Next: ${beam.next_best_action ?? ''}`,
    ].join('\n'),
    metadata: { kind: 'beam_resume', died_at: String(beam.died_at ?? '') },
  })
}

if (docs.length === 0) {
  console.error('✗ .nz/ has no ledger / memory / beam-resume content to index.')
  process.exit(1)
}

// ── Push ──────────────────────────────────────────────────────────────────────

console.log(`→ collection: ${COLLECTION}  ·  documents: ${docs.length}`)

try {
  await ze('/collections/add-collection', { collection_name: COLLECTION })
  console.log('  created collection')
} catch (e) {
  if (e.status === 409) console.log('  collection exists')
  else { console.error(`✗ collection error: ${e.message}`); process.exit(1) }
}

let ok = 0, skip = 0, fail = 0
for (const d of docs) {
  try {
    await ze('/documents/add-document', {
      collection_name: COLLECTION,
      path: d.path,
      content: { type: 'text', text: d.text },
      metadata: d.metadata,
    })
    ok++
  } catch (e) {
    if (e.status === 409) { skip++; continue }   // already indexed, leave it
    fail++
    console.error(`  ✗ ${d.path}: ${e.message}`)
  }
}

console.log(`✓ indexed ${ok} · skipped ${skip} · failed ${fail}  (of ${docs.length})`)
process.exit(fail && ok === 0 && skip === 0 ? 1 : 0)
