'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type ReactNode } from 'react';
import './install.css';

type Shell = 'powershell' | 'bash';
type ClientId =
  | 'codex'
  | 'claude-code'
  | 'claude-desktop'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'aider'
  | 'custom';

type ClientDef = {
  id: ClientId;
  glyph: string;
  name: string;
  runtime: string;
  meta: string;
  rulesFile: string;
  note: string;
};

const CLIENTS: ClientDef[] = [
  {
    id: 'codex',
    glyph: 'CX',
    name: 'Codex / GStack',
    runtime: 'codex',
    meta: 'CLI runtime',
    rulesFile: 'AGENTS.md',
    note: 'Best fit for this repo. Use the repo instructions plus nz status at task start.',
  },
  {
    id: 'claude-code',
    glyph: 'cc',
    name: 'Claude Code',
    runtime: 'claude-code',
    meta: 'terminal agent',
    rulesFile: 'CLAUDE.md',
    note: 'Add the task-start and handoff commands to the project CLAUDE.md.',
  },
  {
    id: 'claude-desktop',
    glyph: 'CD',
    name: 'Claude Desktop',
    runtime: 'claude-desktop',
    meta: 'manual bridge',
    rulesFile: 'project notes',
    note: 'Use nz status and nz resume output as the context you paste into the chat.',
  },
  {
    id: 'cursor',
    glyph: 'Cu',
    name: 'Cursor',
    runtime: 'cursor',
    meta: 'editor agent',
    rulesFile: '.cursorrules',
    note: 'Put the command checklist in .cursorrules so Composer checks the room first.',
  },
  {
    id: 'vscode',
    glyph: 'VS',
    name: 'VS Code',
    runtime: 'vscode',
    meta: 'editor agent',
    rulesFile: '.github/copilot-instructions.md',
    note: 'Use the same CLI commands from the integrated terminal.',
  },
  {
    id: 'windsurf',
    glyph: 'WS',
    name: 'Windsurf',
    runtime: 'windsurf',
    meta: 'editor agent',
    rulesFile: '.windsurfrules',
    note: 'Keep the rules file short: status before work, handoff before stopping.',
  },
  {
    id: 'aider',
    glyph: 'ai',
    name: 'Aider',
    runtime: 'aider',
    meta: 'terminal agent',
    rulesFile: 'CONVENTIONS.md',
    note: 'Run nz commands in the same project directory before and after the Aider session.',
  },
  {
    id: 'custom',
    glyph: '{}',
    name: 'Custom runner',
    runtime: 'custom',
    meta: 'any shell',
    rulesFile: 'runner prompt',
    note: 'Any agent that can run shell commands can participate in the .nz room.',
  },
];

function CodeBlock({
  path,
  code,
  id,
}: {
  path: string;
  code: string;
  id: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="code">
      <div className="code-hd">
        <span className="path">{path}</span>
        <button
          className={'copy' + (copied ? ' ok' : '')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              /* Clipboard is best-effort in local browser contexts. */
            }
          }}
          type="button"
          data-copy={id}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre id={id}>{code}</pre>
    </div>
  );
}

function Step({ num, children }: { num: number; children: ReactNode }) {
  return (
    <div className="step">
      <span className="num">{num}</span>
      <div className="body">{children}</div>
    </div>
  );
}

function Inline({ children }: { children: ReactNode }) {
  return <code className="inline">{children}</code>;
}

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="os-tabs">
      {options.map((o) => (
        <button
          key={o.id}
          className="ot"
          data-on={o.id === value ? '1' : '0'}
          onClick={() => onChange(o.id)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function setupCode(shell: Shell): string {
  if (shell === 'powershell') {
    return [
      '# Run from this repository root',
      'pnpm --dir cli install',
      'pnpm --dir cli run build',
      '',
      '# Keep this shell pointed at the built CLI',
      '$env:NZ_CLI = (Resolve-Path .\\cli\\dist\\index.js).Path',
      'node $env:NZ_CLI --version',
    ].join('\n');
  }

  return [
    '# Run from this repository root',
    'pnpm --dir cli install',
    'pnpm --dir cli run build',
    '',
    '# Keep this shell pointed at the built CLI',
    'export NZ_CLI="$(pwd)/cli/dist/index.js"',
    'node "$NZ_CLI" --version',
  ].join('\n');
}

function initCode(shell: Shell): string {
  if (shell === 'powershell') {
    return [
      '# Run in the project you want agents to share',
      'mkdir $env:TEMP\\nz-demo -Force | Out-Null',
      'cd $env:TEMP\\nz-demo',
      'node $env:NZ_CLI init',
      '',
      '# The local state contract should now exist',
      'Get-ChildItem .nz',
    ].join('\n');
  }

  return [
    '# Run in the project you want agents to share',
    'mkdir -p /tmp/nz-demo',
    'cd /tmp/nz-demo',
    'node "$NZ_CLI" init',
    '',
    '# The local state contract should now exist',
    'ls -la .nz',
  ].join('\n');
}

function joinCode(shell: Shell, client: ClientDef): string {
  if (shell === 'powershell') {
    return [
      `$agentName = "${client.name}"`,
      `node $env:NZ_CLI join --name $agentName --runtime ${client.runtime} --machine $env:COMPUTERNAME`,
      '$room = Get-Content -Raw .nz\\room.json | ConvertFrom-Json',
      '$agent = ($room.agents | Where-Object { $_.name -eq $agentName } | Select-Object -Last 1).id',
      'node $env:NZ_CLI status',
    ].join('\n');
  }

  return [
    `AGENT_NAME="${client.name}"`,
    `node "$NZ_CLI" join --name "$AGENT_NAME" --runtime ${client.runtime} --machine "$(hostname)"`,
    'AGENT=$(node -e "const name=process.argv[1]; const r=require(\'./.nz/room.json\'); const a=[...r.agents].reverse().find((x)=>x.name===name); if(!a) process.exit(1); console.log(a.id)" "$AGENT_NAME")',
    'node "$NZ_CLI" status',
  ].join('\n');
}

function handoffCode(shell: Shell): string {
  if (shell === 'powershell') {
    return [
      'node $env:NZ_CLI claim --agent $agent --task "connect shared context"',
      'node $env:NZ_CLI log --agent $agent --type decision --summary "Use local-first .nz state"',
      'node $env:NZ_CLI handoff --agent $agent',
      'node $env:NZ_CLI resume',
      'node $env:NZ_CLI status',
    ].join('\n');
  }

  return [
    'node "$NZ_CLI" claim --agent "$AGENT" --task "connect shared context"',
    'node "$NZ_CLI" log --agent "$AGENT" --type decision --summary "Use local-first .nz state"',
    'node "$NZ_CLI" handoff --agent "$AGENT"',
    'node "$NZ_CLI" resume',
    'node "$NZ_CLI" status',
  ].join('\n');
}

function rulesCode(shell: Shell, client: ClientDef): string {
  const nz = shell === 'powershell' ? 'node $env:NZ_CLI' : 'node "$NZ_CLI"';
  return [
    '# NeverZero local context',
    '',
    `This project uses the local .nz room. Runtime name: ${client.runtime}.`,
    '',
    `At task start, run: ${nz} status`,
    `Before claiming work, run: ${nz} conflict-check --task "<task name>"`,
    `When taking work, run: ${nz} claim --agent <agent-id> --task "<task name>"`,
    `When a decision is made, run: ${nz} log --agent <agent-id> --type decision --summary "<decision>"`,
    `Before stopping, run: ${nz} handoff --agent <agent-id>`,
    '',
    'Treat .nz/room.json, .nz/ledger.ndjson, .nz/memory.json, and',
    '.nz/handoff/latest.nzr.json as the shared context contract.',
  ].join('\n');
}

export type InstallAppProps = {
  orgSlug?: string;
};

function InstallPageInner({ orgSlug }: InstallAppProps) {
  const params = useSearchParams();
  const fromBrain = params.get('from') === 'brain';
  const [shell, setShell] = useState<Shell>('powershell');
  const [clientId, setClientId] = useState<ClientId>('codex');
  const workspaceLabel = orgSlug ?? 'local demo';
  const selectedClient = useMemo(
    () => CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0],
    [clientId],
  );

  return (
    <div className="install-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">NeverZero<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-crumb">
            <span>Docs</span>
            <span className="sep">{'>'}</span>
            <span className="cur">Install</span>
          </div>
          <div className="nav-right">
            <span className="ver">{workspaceLabel}</span>
            <Link className="txt" href="/workstation">Workstation</Link>
            <Link className="txt" href="/agents">Agents</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">DOCS / INSTALL / LOCAL-FIRST CLI</div>
        <h1>
          Install the shared<br />
          <span className="muted">agent context room.</span>
        </h1>
        <p className="lede">
          This hackathon build works through the local <b>nz</b> CLI and a plain <b>.nz/</b>
          directory beside your code. No cloud key, MCP package, database, or hosted API is
          required for the working path.
        </p>
        <div className="hero-stat-row">
          <span className="item"><b>0</b> network calls</span>
          <span className="item"><b>4</b> local files</span>
          <span className="item"><b>10</b> CLI commands</span>
          <span className="item">Works on <b>Windows / macOS / Linux / WSL</b></span>
        </div>
      </section>

      <section className="section">
        <h2>
          Pick your runtime
          <span className="count">/ command snippets adapt below</span>
        </h2>
        <div className="client-grid">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              className="client"
              data-on={clientId === c.id ? '1' : '0'}
              onClick={() => setClientId(c.id)}
              type="button"
            >
              <span className="glyph">{c.glyph}</span>
              <span className="name">{c.name}</span>
              <span className="meta">{c.meta}</span>
              {c.id === 'codex' && <span className="stat">recommended</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="steps-wrap">
        {fromBrain && (
          <div className="onboard-banner" style={{ marginBottom: 16 }}>
            <span className="num">1</span>
            <div className="txt">
              <b>Brain draft complete.</b> The next working step is creating the local .nz room
              and joining your first agent runtime.
            </div>
            <Link className="skip" href="/workstation">skip to workstation</Link>
          </div>
        )}

        <Step num={1}>
          <h3>Build the local CLI</h3>
          <p className="lede">
            The repo-local CLI is the source of truth today. Build it once, then run it from any
            project directory with <Inline>node $NZ_CLI</Inline>.
          </p>
          <Tabs
            value={shell}
            onChange={setShell}
            options={[
              { id: 'powershell', label: 'PowerShell' },
              { id: 'bash', label: 'macOS / Linux / WSL' },
            ]}
          />
          <CodeBlock path="terminal" id="setup-cli" code={setupCode(shell)} />
          <div className="note">
            The install path deliberately uses <Inline>cli/dist/index.js</Inline> instead of
            unpublished package names. It is the command path verified in this repo.
          </div>
        </Step>

        <Step num={2}>
          <h3>Initialize the shared room</h3>
          <p className="lede">
            Run this inside the repo or fixture directory you want agents to coordinate in.
            It creates the local state contract used by the workstation and handoff flow.
          </p>
          <CodeBlock path="target project" id="init-room" code={initCode(shell)} />
          <CodeBlock
            path=".nz/"
            id="state-contract"
            code={[
              '.nz/',
              '  room.json',
              '  ledger.ndjson',
              '  memory.json',
              '  handoff/',
              '    latest.nzr.json',
            ].join('\n')}
          />
        </Step>

        <Step num={3}>
          <h3>Join {selectedClient.name}</h3>
          <p className="lede">
            This registers the current runtime as an agent in <Inline>.nz/room.json</Inline>.
            Use runtime <Inline>{selectedClient.runtime}</Inline> for this selected client.
          </p>
          <CodeBlock
            path={`${selectedClient.name} terminal`}
            id="join-runtime"
            code={joinCode(shell, selectedClient)}
          />
          <div className="note">
            {selectedClient.note}
          </div>
        </Step>

        <Step num={4}>
          <h3>Prove the handoff loop</h3>
          <p className="lede">
            A working install is not just a rendered page. It should claim work, write a decision,
            create a resume packet, read it back, and show the room status.
          </p>
          <CodeBlock path="target project" id="handoff-loop" code={handoffCode(shell)} />
        </Step>

        <Step num={5}>
          <h3>Pin the rule in {selectedClient.rulesFile}</h3>
          <p className="lede">
            Add a short instruction to the client&apos;s project rules so the agent keeps using
            the room instead of relying on memory from the current chat.
          </p>
          <CodeBlock
            path={selectedClient.rulesFile}
            id="agent-rules"
            code={rulesCode(shell, selectedClient)}
          />
        </Step>
      </section>

      <section className="capabilities">
        <h2>What this enables now</h2>
        <div className="grid">
          <div className="cap">
            <div className="h">PRESENCE</div>
            <h4>Agents join one room.</h4>
            <p>
              Each runtime writes its name, machine, status, active task, and heartbeat to the
              same local room file.
            </p>
            <div className="tools">
              <span className="tool">nz init</span>
              <span className="tool">nz join</span>
              <span className="tool">nz status</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">WORK LEDGER</div>
            <h4>Decisions become state.</h4>
            <p>
              Claims, releases, failures, and decisions append to ledger.ndjson. Decision events
              also update memory.json.
            </p>
            <div className="tools">
              <span className="tool">nz claim</span>
              <span className="tool">nz log</span>
              <span className="tool">nz memory show</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">RESUME</div>
            <h4>Context survives the chat.</h4>
            <p>
              Handoff packets summarize current work, open tasks, recent decisions, and the next
              best action for the next agent.
            </p>
            <div className="tools">
              <span className="tool">nz handoff</span>
              <span className="tool">nz resume</span>
              <span className="tool">latest.nzr.json</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tshoot" id="troubleshoot">
        <h2>Troubleshooting</h2>
        <details>
          <summary>I see older hosted-package install notes elsewhere</summary>
          <div className="ds-body">
            Ignore those for this hackathon build. The verified path is the local CLI in
            <Inline>cli/dist/index.js</Inline>. Hosted MCP, package publishing, and cloud-key
            commands are future surfaces, not working install steps in this repo.
          </div>
        </details>
        <details>
          <summary>node cannot find cli/dist/index.js</summary>
          <div className="ds-body">
            Re-run <Inline>pnpm --dir cli run build</Inline> from the repository root, then reset
            <Inline>NZ_CLI</Inline> with the Step 1 command for your shell.
          </div>
        </details>
        <details>
          <summary>nz says the room is not initialized</summary>
          <div className="ds-body">
            You are probably in the wrong directory. Change into the target project and run
            <Inline>node $NZ_CLI init</Inline> before <Inline>join</Inline>, <Inline>claim</Inline>,
            <Inline>handoff</Inline>, or <Inline>resume</Inline>.
          </div>
        </details>
        <details>
          <summary>Unknown agent when claiming work</summary>
          <div className="ds-body">
            Re-read the agent id from <Inline>.nz/room.json</Inline> or run <Inline>node $NZ_CLI status</Inline>.
            The id printed by <Inline>nz join</Inline> is the value required by claim, log, and handoff.
          </div>
        </details>
        <details>
          <summary>Where does GBrain fit?</summary>
          <div className="ds-body">
            GBrain is the likely indexed memory backend later. Today the local contract comes first:
            keep <Inline>.nz/memory.json</Inline> and <Inline>.nz/handoff/latest.nzr.json</Inline>
            working, then an adapter can index those files.
          </div>
        </details>
      </section>

      <section className="support">
        <div className="row">
          <span>Need a second surface?</span>
          <span className="grow" />
          <Link href="/workstation">Open workstation</Link>
          <Link href="/agents">Manage demo agents</Link>
          <Link href="/docs/install">Canonical docs URL</Link>
        </div>
      </section>
    </div>
  );
}

export function InstallApp({ orgSlug }: InstallAppProps) {
  return (
    <Suspense fallback={<div className="install-root" />}>
      <InstallPageInner orgSlug={orgSlug} />
    </Suspense>
  );
}

export default function InstallPage() {
  return <InstallApp />;
}
