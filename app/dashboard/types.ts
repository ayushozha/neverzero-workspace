export interface Agent {
  agent_id: string
  name: string
  glyph: string
  role: string
  runtime: string
  machine: string
  task: string | null
  status: 'working' | 'idle' | 'stale' | 'dead'
  last_heartbeat: string
}

export interface Room {
  room_id: string
  name: string
  created_at: string
  agents: Agent[]
}

export interface LedgerEvent {
  ts: string
  agent_id: string
  type: string
  task?: string
  summary: string
}

export interface Decision {
  id: string
  ts: string
  agent_id: string
  text: string
  status: 'accepted' | 'rejected'
}

export interface Memory {
  room_id: string
  updated_at: string
  goals: string[]
  constraints: string[]
  decisions: Decision[]
  rejected_approaches: string[]
  files_touched: string[]
}

export interface FailedAttempt {
  task: string
  reason: string
}

export interface HandoffPacket {
  packet_id: string
  created_at: string
  created_by: string
  consumed_by: string | null
  consumed_at: string | null
  goal: string
  current_state: string
  completed_work: string[]
  open_tasks: string[]
  failed_attempts: FailedAttempt[]
  next_best_action: string
}

export interface BeamResume {
  packet_id: string
  agent_id: string
  died_at: string
  goal: string
  last_known_state: string
  completed_work: string[]
  open_tasks: string[]
  failed_attempts: FailedAttempt[]
  resume_prompt: string
  next_best_action: string
}

export interface ToolStatus {
  installed: boolean
  version?: string
}

export interface DashboardPayload {
  room: Room
  ledger: LedgerEvent[]
  memory: Memory
  handoff: HandoffPacket | null
  beamResume: BeamResume | null
  resumePrompt: string
  liveStatus: 'dead' | 'working'
  dataSource: 'nz' | 'fixtures'
  /**
   * Freshest `.nz/ledger.ndjson` event timestamp — used by the topbar HOOKS
   * pill. Null when running on fixtures only (hooks not wired / no .nz/).
   * Intentionally excludes gstack-timeline.jsonl events so the pill reflects
   * hook activity specifically, not unrelated demo data.
   */
  lastHookEventAt: string | null
  gstack: ToolStatus
  gbrain: ToolStatus
}
