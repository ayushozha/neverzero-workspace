'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type ReactNode } from 'react';
import './install.css';
import { InstallProvider, useKeySubstitutor, type RegisteredAgent } from './_components/InstallContext';
import RegisterAgentModal from './_components/RegisterAgentModal';
import RegisterBanner from './_components/RegisterBanner';

type ClientId =
  | 'claude-desktop'
  | 'claude-code'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'antigravity'
  | 'zed'
  | 'continue'
  | 'aider'
  | 'custom';

type ClientDef = {
  id: ClientId;
  glyph: string;
  name: string;
  meta: string;
  stat?: { label: string; beta?: boolean };
};

const CLIENTS: ClientDef[] = [
  { id: 'claude-desktop', glyph: 'CD', name: 'Claude Desktop', meta: 'MCP · OFFICIAL', stat: { label: 'recommended' } },
  { id: 'claude-code',    glyph: 'cc', name: 'Claude Code',    meta: 'MCP · CLI' },
  { id: 'cursor',         glyph: '⌘',  name: 'Cursor',          meta: 'MCP' },
  { id: 'vscode',         glyph: 'VS', name: 'VS Code',         meta: 'EXTENSION' },
  { id: 'windsurf',       glyph: '~~', name: 'Windsurf',        meta: 'MCP' },
  { id: 'antigravity',    glyph: 'AG', name: 'Antigravity',     meta: 'MCP', stat: { label: 'beta', beta: true } },
  { id: 'zed',            glyph: 'Zd', name: 'Zed',             meta: 'CONTEXT SERVER' },
  { id: 'continue',       glyph: '→',  name: 'Continue.dev',    meta: 'MCP' },
  { id: 'aider',          glyph: 'ai', name: 'Aider',           meta: 'CLI · FLAG' },
  { id: 'custom',         glyph: '{}', name: 'Custom / REST',   meta: 'SDK · CURL' },
];

// ───────── Code highlighter helpers ─────────
type Token = string | { c: 'k' | 's' | 'c' | 'p' | 'v' | 'n'; t: string };
const tk = {
  k: (t: string) => ({ c: 'k' as const, t }),
  s: (t: string) => ({ c: 's' as const, t }),
  c: (t: string) => ({ c: 'c' as const, t }),
  p: (t: string) => ({ c: 'p' as const, t }),
  v: (t: string) => ({ c: 'v' as const, t }),
  n: (t: string) => ({ c: 'n' as const, t }),
};

function CodeBlock({
  path,
  tokens,
  id,
}: {
  path: string;
  tokens: Token[][];
  id: string;
}) {
  const [copied, setCopied] = useState(false);
  const sub = useKeySubstitutor();
  const plain = useMemo(
    () =>
      tokens
        .map((line) => line.map((p) => (typeof p === 'string' ? sub(p) : sub(p.t))).join(''))
        .join('\n'),
    [tokens, sub],
  );
  return (
    <div className="code">
      <div className="code-hd">
        <span className="path">{path}</span>
        <button
          className={'copy' + (copied ? ' ok' : '')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(plain);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              /* ignore */
            }
          }}
          type="button"
          data-copy={id}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre id={id}>
        {tokens.map((line, i) => (
          <span key={i}>
            {line.map((part, j) =>
              typeof part === 'string' ? (
                <span key={j}>{sub(part)}</span>
              ) : (
                <span key={j} className={part.c}>
                  {sub(part.t)}
                </span>
              ),
            )}
            {i < tokens.length - 1 ? '\n' : ''}
          </span>
        ))}
      </pre>
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

// ───────── Per-client step content ─────────

function ClaudeDesktopSteps() {
  type OS = 'mac' | 'win' | 'linux';
  const [os, setOs] = useState<OS>('mac');

  const cfg = (forOs: OS): Token[][] => {
    const cmd = forOs === 'win' ? '"cmd"' : '"npx"';
    const args =
      forOs === 'win'
        ? `["/c", "npx", "-y", "@neverzero/mcp"]`
        : `["-y", "@neverzero/mcp"]`;
    return [
      [tk.p('{')],
      ['  ', tk.k('"mcpServers"'), tk.p(':'), ' ', tk.p('{')],
      ['    ', tk.k('"neverzero"'), tk.p(':'), ' ', tk.p('{')],
      ['      ', tk.k('"command"'), tk.p(':'), ' ', tk.s(cmd), tk.p(',')],
      ['      ', tk.k('"args"'), tk.p(':'), ' ', tk.s(args), tk.p(',')],
      ['      ', tk.k('"env"'), tk.p(':'), ' ', tk.p('{')],
      ['        ', tk.k('"NEVERZERO_API_KEY"'), tk.p(':'), ' ', tk.s('"nz_live_x9K2…"'), tk.p(',')],
      ['        ', tk.k('"NEVERZERO_WORKSPACE"'), tk.p(':'), ' ', tk.s('"acme"')],
      ['      ', tk.p('}')],
      ['    ', tk.p('}')],
      ['  ', tk.p('}')],
      [tk.p('}')],
    ];
  };

  const paths: Record<OS, string> = {
    mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
    win: '%APPDATA%\\Claude\\claude_desktop_config.json',
    linux: '~/.config/Claude/claude_desktop_config.json',
  };

  return (
    <>
      <Step num={2}>
        <h3>
          Install the NeverZero MCP server <span className="platform-only">no install needed</span>
        </h3>
        <p className="lede">
          Claude Desktop ships with an MCP runtime. Nothing to install separately — just point it
          at our server via <Inline>npx</Inline>.
        </p>
      </Step>
      <Step num={3}>
        <h3>Add NeverZero to your Claude config</h3>
        <p className="lede">
          Open Claude Desktop → <b>Settings</b> → <b>Developer</b> → <b>Edit config</b>. Add the{' '}
          <Inline>neverzero</Inline> server under <Inline>mcpServers</Inline>.
        </p>
        <Tabs
          value={os}
          onChange={setOs}
          options={[
            { id: 'mac', label: 'macOS' },
            { id: 'win', label: 'Windows' },
            { id: 'linux', label: 'Linux' },
          ]}
        />
        <CodeBlock path={paths[os]} tokens={cfg(os)} id={`cd-${os}`} />
        <div className="note">
          <b>Quit and reopen Claude</b> after saving — MCP servers are read at boot. A &quot;🔌
          NeverZero&quot; hammer icon appears in the chat composer when it loaded successfully.
        </div>
      </Step>
    </>
  );
}

function ClaudeCodeSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Add NeverZero to Claude Code</h3>
        <p className="lede">
          Claude Code (the CLI) reads MCP servers from <Inline>~/.claude.json</Inline>. The
          fastest path is the <Inline>claude mcp add</Inline> command.
        </p>
        <CodeBlock
          path="terminal"
          id="cce-add"
          tokens={[
            [tk.c('# add the server, scoped to your user')],
            [tk.k('claude'), ' mcp add neverzero ', tk.p('\\')],
            ['  --command ', tk.s('"npx -y @neverzero/mcp"'), ' ', tk.p('\\')],
            ['  --env NEVERZERO_API_KEY=', tk.s('nz_live_x9K2…'), ' ', tk.p('\\')],
            ['  --env NEVERZERO_WORKSPACE=', tk.s('acme')],
            [''],
            [tk.c('# confirm it shows up')],
            [tk.k('claude'), ' mcp list'],
            [tk.p('→'), ' neverzero    npx -y @neverzero/mcp    ', tk.v('ready')],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>Pin a CLAUDE.md hint</h3>
        <p className="lede">
          Add a one-liner so Claude reads the brain before each task. Drop this in any{' '}
          <Inline>CLAUDE.md</Inline> at the root of a project.
        </p>
        <CodeBlock
          path="CLAUDE.md"
          id="cce-md"
          tokens={[
            [tk.c('# NeverZero')],
            [''],
            ['Always call ', tk.k('brain.read'), ' at the start of a task.'],
            ['Cite pinned memory by id (e.g. ', tk.s('memory.pricing.tier-3'), ') when relevant.'],
            ['Log decisions via ', tk.k('decision.log'), ', not as plain prose.'],
          ]}
        />
      </Step>
    </>
  );
}

function CursorSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Add NeverZero to Cursor&apos;s MCP config</h3>
        <p className="lede">
          Cursor reads MCP servers from <Inline>~/.cursor/mcp.json</Inline>. Create it if it
          doesn&apos;t exist.
        </p>
        <CodeBlock
          path="~/.cursor/mcp.json"
          id="curs-cfg"
          tokens={[
            [tk.p('{')],
            ['  ', tk.k('"mcpServers"'), tk.p(':'), ' ', tk.p('{')],
            ['    ', tk.k('"neverzero"'), tk.p(':'), ' ', tk.p('{')],
            ['      ', tk.k('"command"'), tk.p(':'), ' ', tk.s('"npx"'), tk.p(',')],
            ['      ', tk.k('"args"'), tk.p(':'), ' ', tk.s('["-y", "@neverzero/mcp"]'), tk.p(',')],
            ['      ', tk.k('"env"'), tk.p(':'), ' ', tk.p('{')],
            ['        ', tk.k('"NEVERZERO_API_KEY"'), tk.p(':'), ' ', tk.s('"nz_live_x9K2…"')],
            ['      ', tk.p('}')],
            ['    ', tk.p('}')],
            ['  ', tk.p('}')],
            [tk.p('}')],
          ]}
        />
        <div className="note">
          <b>Per-project config?</b> Drop the same JSON in <Inline>.cursor/mcp.json</Inline> at the
          repo root and it overrides the user-level one.
        </div>
      </Step>
      <Step num={3}>
        <h3>Tell Composer to use it</h3>
        <p className="lede">
          Add a hint to <Inline>.cursorrules</Inline> so the agent calls into NeverZero before every
          task.
        </p>
        <CodeBlock
          path=".cursorrules"
          id="curs-rules"
          tokens={[
            [tk.c('# NeverZero brain')],
            [''],
            ['You are working inside a NeverZero-connected project.'],
            ['Before any code change:'],
            ['  ', tk.p('1.'), ' Call ', tk.k('brain.read'), ' to load the company brain.'],
            ['  ', tk.p('2.'), ' Call ', tk.k('memory.recall'), ' with the task description.'],
            ['  ', tk.p('3.'), ' Cite pinned memory and decisions inline.'],
            [''],
            ['After shipping, call ', tk.k('decision.log'), ' with a short reason.'],
          ]}
        />
      </Step>
    </>
  );
}

function VSCodeSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Install the NeverZero extension</h3>
        <p className="lede">
          One marketplace install. Works with GitHub Copilot, Continue, and any extension that
          consumes the VS Code Language Model API.
        </p>
        <CodeBlock
          path="terminal"
          id="vsc-install"
          tokens={[
            [tk.c('# from the command line')],
            [tk.k('code'), ' --install-extension neverzero.neverzero'],
            [''],
            [tk.c('# or: ⌘⇧P → "Extensions: Install Extensions"')],
            [tk.c('# →  search "NeverZero"  →  Install')],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>Sign in from the side panel</h3>
        <p className="lede">
          Click the NeverZero icon in the activity bar → <b>Sign in</b>. The extension picks up
          your <Inline>nz_live_…</Inline> key via system browser, no manual paste.
        </p>
        <CodeBlock
          path="settings.json (workspace)"
          id="vsc-settings"
          tokens={[
            [tk.p('{')],
            ['  ', tk.k('"neverzero.workspace"'), tk.p(':'), ' ', tk.s('"acme"'), tk.p(',')],
            ['  ', tk.k('"neverzero.autoReadBrain"'), tk.p(':'), ' ', tk.v('true'), tk.p(',')],
            ['  ', tk.k('"neverzero.copilot.injectMemory"'), tk.p(':'), ' ', tk.v('true')],
            [tk.p('}')],
          ]}
        />
        <div className="note">
          <b>Copilot users:</b> turn on <Inline>copilot.injectMemory</Inline> to inject pinned
          brain memory into every Copilot completion as a system message.
        </div>
      </Step>
    </>
  );
}

function WindsurfSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Add NeverZero to Windsurf&apos;s MCP config</h3>
        <p className="lede">
          Windsurf (Codeium) reads MCP servers from{' '}
          <Inline>~/.codeium/windsurf/mcp_config.json</Inline>.
        </p>
        <CodeBlock
          path="~/.codeium/windsurf/mcp_config.json"
          id="wd-cfg"
          tokens={[
            [tk.p('{')],
            ['  ', tk.k('"mcpServers"'), tk.p(':'), ' ', tk.p('{')],
            ['    ', tk.k('"neverzero"'), tk.p(':'), ' ', tk.p('{')],
            ['      ', tk.k('"command"'), tk.p(':'), ' ', tk.s('"npx"'), tk.p(',')],
            ['      ', tk.k('"args"'), tk.p(':'), ' ', tk.s('["-y", "@neverzero/mcp"]'), tk.p(',')],
            ['      ', tk.k('"env"'), tk.p(':'), ' ', tk.p('{'), ' ', tk.k('"NEVERZERO_API_KEY"'), tk.p(':'), ' ', tk.s('"nz_live_x9K2…"'), ' ', tk.p('}')],
            ['    ', tk.p('}')],
            ['  ', tk.p('}')],
            [tk.p('}')],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>Reload Cascade</h3>
        <p className="lede">
          Run <Inline>⌘⇧P → Windsurf: Reload MCP Servers</Inline>. The NeverZero plug shows in the
          bottom bar with <em>connected · 5 agents</em> when ready.
        </p>
      </Step>
    </>
  );
}

function AntigravitySteps() {
  return (
    <>
      <Step num={2}>
        <h3>Add NeverZero as a tool server</h3>
        <p className="lede">
          In Antigravity (Google&apos;s agentic IDE), open{' '}
          <b>Settings → Agents → Tool servers</b> and click <b>+ Add</b>. Antigravity speaks MCP
          natively.
        </p>
        <CodeBlock
          path="~/.antigravity/agents.json"
          id="ag-cfg"
          tokens={[
            [tk.p('{')],
            ['  ', tk.k('"tool_servers"'), tk.p(':'), ' ', tk.p('[')],
            ['    ', tk.p('{')],
            ['      ', tk.k('"id"'), tk.p(':'), ' ', tk.s('"neverzero"'), tk.p(',')],
            ['      ', tk.k('"protocol"'), tk.p(':'), ' ', tk.s('"mcp"'), tk.p(',')],
            ['      ', tk.k('"command"'), tk.p(':'), ' ', tk.s('"npx -y @neverzero/mcp"'), tk.p(',')],
            ['      ', tk.k('"env"'), tk.p(':'), ' ', tk.p('{'), ' ', tk.k('"NEVERZERO_API_KEY"'), tk.p(':'), ' ', tk.s('"nz_live_x9K2…"'), ' ', tk.p('},')],
            ['      ', tk.k('"auto_invoke"'), tk.p(':'), ' ', tk.s('["brain.read", "memory.recall"]')],
            ['    ', tk.p('}')],
            ['  ', tk.p(']')],
            [tk.p('}')],
          ]}
        />
        <div className="note">
          <b>Antigravity is in beta</b> — the <Inline>auto_invoke</Inline> array tells the planner
          to call those tools at task start without a prompt.
        </div>
      </Step>
      <Step num={3}>
        <h3>Restart the agent runner</h3>
        <p className="lede">
          Click the orbit icon in the side bar → <b>Restart runner</b>. The NeverZero glyph (a
          tiny dashed circle) appears next to every agent it&apos;s wired to.
        </p>
      </Step>
    </>
  );
}

function ZedSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Add NeverZero as a context server</h3>
        <p className="lede">
          Zed treats MCP servers as <em>context servers</em>. Edit{' '}
          <Inline>~/.config/zed/settings.json</Inline> and add this block.
        </p>
        <CodeBlock
          path="~/.config/zed/settings.json"
          id="zed-cfg"
          tokens={[
            [tk.p('{')],
            ['  ', tk.k('"context_servers"'), tk.p(':'), ' ', tk.p('{')],
            ['    ', tk.k('"neverzero"'), tk.p(':'), ' ', tk.p('{')],
            ['      ', tk.k('"command"'), tk.p(':'), ' ', tk.p('{')],
            ['        ', tk.k('"path"'), tk.p(':'), ' ', tk.s('"npx"'), tk.p(',')],
            ['        ', tk.k('"args"'), tk.p(':'), ' ', tk.s('["-y", "@neverzero/mcp"]'), tk.p(',')],
            ['        ', tk.k('"env"'), tk.p(':'), ' ', tk.p('{'), ' ', tk.k('"NEVERZERO_API_KEY"'), tk.p(':'), ' ', tk.s('"nz_live_x9K2…"'), ' ', tk.p('}')],
            ['      ', tk.p('}')],
            ['    ', tk.p('}')],
            ['  ', tk.p('}')],
            [tk.p('}')],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>Open the assistant panel</h3>
        <p className="lede">
          <Inline>⌘?</Inline> opens Zed&apos;s assistant. NeverZero tools appear in the{' '}
          <em>Context</em> menu alongside built-in commands.
        </p>
      </Step>
    </>
  );
}

function ContinueSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Add NeverZero to Continue&apos;s config</h3>
        <p className="lede">
          Continue.dev reads from <Inline>~/.continue/config.json</Inline>. Add an{' '}
          <Inline>mcpServers</Inline> entry (newer versions) or a <Inline>contextProviders</Inline>{' '}
          entry on older ones.
        </p>
        <CodeBlock
          path="~/.continue/config.json"
          id="ct-cfg"
          tokens={[
            [tk.p('{')],
            ['  ', tk.k('"mcpServers"'), tk.p(':'), ' ', tk.p('[')],
            ['    ', tk.p('{')],
            ['      ', tk.k('"name"'), tk.p(':'), ' ', tk.s('"neverzero"'), tk.p(',')],
            ['      ', tk.k('"command"'), tk.p(':'), ' ', tk.s('"npx"'), tk.p(',')],
            ['      ', tk.k('"args"'), tk.p(':'), ' ', tk.s('["-y", "@neverzero/mcp"]'), tk.p(',')],
            ['      ', tk.k('"env"'), tk.p(':'), ' ', tk.p('{'), ' ', tk.k('"NEVERZERO_API_KEY"'), tk.p(':'), ' ', tk.s('"nz_live_x9K2…"'), ' ', tk.p('}')],
            ['    ', tk.p('}')],
            ['  ', tk.p(']')],
            [tk.p('}')],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>
          Type <Inline>@neverzero</Inline> in the chat
        </h3>
        <p className="lede">
          Continue surfaces MCP tools through the <Inline>@</Inline> mention menu.{' '}
          <Inline>@neverzero brain</Inline> pastes the company brain into context;{' '}
          <Inline>@neverzero recall</Inline> pulls relevant pinned memory.
        </p>
      </Step>
    </>
  );
}

function AiderSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Run Aider with the NeverZero flag</h3>
        <p className="lede">
          Aider 0.65+ accepts MCP servers via the <Inline>--mcp-server</Inline> flag. Set your key
          in the environment.
        </p>
        <CodeBlock
          path="terminal"
          id="ad-cmd"
          tokens={[
            [tk.k('export'), ' NEVERZERO_API_KEY=', tk.s('nz_live_x9K2…')],
            [''],
            [tk.k('aider'), ' ', tk.p('\\')],
            ['  --mcp-server ', tk.s('"npx -y @neverzero/mcp"'), ' ', tk.p('\\')],
            ['  --read-from-mcp brain.read,memory.recall'],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>
          (Optional) save to <Inline>.aider.conf.yml</Inline>
        </h3>
        <p className="lede">So you don&apos;t have to retype the flag every session.</p>
        <CodeBlock
          path=".aider.conf.yml"
          id="ad-yml"
          tokens={[
            [tk.k('mcp-server'), tk.p(':'), ' ', tk.s('"npx -y @neverzero/mcp"')],
            [tk.k('read-from-mcp'), tk.p(':')],
            ['  ', tk.p('-'), ' ', tk.s('brain.read')],
            ['  ', tk.p('-'), ' ', tk.s('memory.recall')],
            [tk.k('commit-message-include-mcp'), tk.p(':'), ' ', tk.v('true')],
          ]}
        />
      </Step>
    </>
  );
}

function CustomSteps() {
  return (
    <>
      <Step num={2}>
        <h3>Call the REST API directly</h3>
        <p className="lede">
          Building your own agent or harness? Talk to NeverZero over plain HTTPS — no MCP runtime
          required. Same endpoints, same scopes.
        </p>
        <CodeBlock
          path="curl · read the brain"
          id="cu-read"
          tokens={[
            [tk.k('curl'), ' https://api.neverzero.cloud/v1/brain/acme ', tk.p('\\')],
            ['  -H ', tk.s('"Authorization: Bearer nz_live_x9K2…"')],
          ]}
        />
        <CodeBlock
          path="curl · recall pinned memory"
          id="cu-recall"
          tokens={[
            [tk.k('curl'), ' https://api.neverzero.cloud/v1/memory/recall ', tk.p('\\')],
            ['  -H ', tk.s('"Authorization: Bearer nz_live_x9K2…"'), ' ', tk.p('\\')],
            ['  -H ', tk.s('"Content-Type: application/json"'), ' ', tk.p('\\')],
            ['  -d ', tk.s('\'{ "query": "pricing tier-3", "top_k": 3 }\'')],
          ]}
        />
      </Step>
      <Step num={3}>
        <h3>Or use the SDK</h3>
        <p className="lede">
          Typed clients for Node, Python, and Go. Same surface as the REST API, with streaming +
          retry built in.
        </p>
        <CodeBlock
          path="node — npm install @neverzero/sdk"
          id="cu-node"
          tokens={[
            [tk.k('import'), ' ', tk.p('{'), ' ', tk.v('NeverZero'), ' ', tk.p('}'), ' ', tk.k('from'), ' ', tk.s("'@neverzero/sdk'"), tk.p(';')],
            [''],
            [tk.k('const'), ' ', tk.v('nz'), ' = ', tk.k('new'), ' ', tk.v('NeverZero'), tk.p('({'), ' apiKey', tk.p(':'), ' process.env.NEVERZERO_API_KEY ', tk.p('});')],
            [''],
            [tk.k('const'), ' brain = ', tk.k('await'), ' nz.brain.read', tk.p('('), tk.s("'acme'"), tk.p(');')],
            [tk.k('const'), ' hits  = ', tk.k('await'), ' nz.memory.recall', tk.p('({'), ' query', tk.p(':'), ' ', tk.s("'pricing tier-3'"), tk.p(','), ' topK', tk.p(':'), ' ', tk.n('3'), ' ', tk.p('});')],
            [''],
            [tk.k('await'), ' nz.decisions.log', tk.p('({')],
            ['  project', tk.p(':'), ' ', tk.s("'q3-launch'"), tk.p(',')],
            ['  what', tk.p(':'), ' ', tk.s("'Ship beta on Jun 6'"), tk.p(',')],
            ['  why', tk.p(':'), ' ', tk.s("'Validated by 8 of 12 design partners'"), tk.p(',')],
            [tk.p('});')],
          ]}
        />
      </Step>
    </>
  );
}

function ClientBlock({ id }: { id: ClientId }) {
  switch (id) {
    case 'claude-desktop': return <ClaudeDesktopSteps />;
    case 'claude-code':    return <ClaudeCodeSteps />;
    case 'cursor':         return <CursorSteps />;
    case 'vscode':         return <VSCodeSteps />;
    case 'windsurf':       return <WindsurfSteps />;
    case 'antigravity':    return <AntigravitySteps />;
    case 'zed':            return <ZedSteps />;
    case 'continue':       return <ContinueSteps />;
    case 'aider':          return <AiderSteps />;
    case 'custom':         return <CustomSteps />;
  }
}

// ───────── Page ─────────

function InstallPageInner({
  client,
  setClient,
  onOpenModal,
  onRotate,
}: {
  client: ClientId;
  setClient: (c: ClientId) => void;
  onOpenModal: () => void;
  onRotate: () => void;
}) {
  const params = useSearchParams();
  const fromBrain = params.get('from') === 'brain';
  const [authTab, setAuthTab] = useState<'dashboard' | 'cli'>('dashboard');

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
            <span className="sep">›</span>
            <span className="cur">Install</span>
          </div>
          <div className="nav-right">
            <span className="ver">v2.18.3</span>
            <a className="txt" href="#">Docs</a>
            <a className="txt" href="#">Changelog</a>
            <a className="txt" href="#">Status</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">DOCS · INSTALL · v2.18.3 · MAY 2026</div>
        <h1>
          Install NeverZero<br />
          <span className="muted">in any agent.</span>
        </h1>
        <p className="lede">
          One MCP-compatible connector. <b>Same brain, same memory, same agents</b> — wherever you
          already work. Pick your client below, copy three snippets, and your agents start reading
          and writing the NeverZero brain in under 60 seconds. No model lock-in. No vendor
          lock-in.
        </p>
        <div className="hero-stat-row">
          <span className="item"><b>10</b> supported clients</span>
          <span className="item"><b>MCP</b> standard · open spec</span>
          <span className="item"><b>5</b> agent tools · 18 skills</span>
          <span className="item">Works on <b>macOS · Linux · Windows · WSL</b></span>
        </div>
      </section>

      <section className="section">
        <h2>
          Pick your client
          <span className="count">· 10 supported</span>
          <span className="opt">
            Don&apos;t see yours? <a href="#custom" onClick={(e) => { e.preventDefault(); setClient('custom'); }}>Use the REST API →</a>
          </span>
        </h2>
        <div className="client-grid">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              className="client"
              data-on={client === c.id ? '1' : '0'}
              onClick={() => setClient(c.id)}
              type="button"
            >
              <span className="glyph">{c.glyph}</span>
              <span className="name">{c.name}</span>
              <span className="meta">{c.meta}</span>
              {c.stat && (
                <span className={'stat' + (c.stat.beta ? ' beta' : '')}>{c.stat.label}</span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="steps-wrap">
        {fromBrain && (
          <div className="onboard-banner" style={{ marginBottom: 16 }}>
            <span className="num">✓</span>
            <div className="txt">
              <b>Workspace created.</b> Now connect your first agent. Pick a client above, click
              <em> Generate API key</em>, and copy the snippets into your editor.
            </div>
            <Link className="skip" href="/workstation">skip → workstation</Link>
          </div>
        )}

        {/* Register banner — drives the "generate key" flow */}
        <RegisterBanner selectedClient={client} onOpenModal={onOpenModal} onRotate={onRotate} />

        {/* Step 1 — universal */}
        <Step num={1}>
          <h3>Get a workspace API key</h3>
          <p className="lede">
            Every agent connects to NeverZero with a workspace key. Scopes are read/write per
            project, revocable from the dashboard, never rotated automatically.
          </p>
          <Tabs
            value={authTab}
            onChange={setAuthTab}
            options={[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'cli', label: 'CLI' },
            ]}
          />
          {authTab === 'dashboard' && (
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: '8px 0 0' }}>
              Open <Inline>acme.neverzero.cloud/settings/keys</Inline> → <b>Create key</b> → name
              it after the client you&apos;re installing. Copy the{' '}
              <Inline>nz_live_…</Inline> value — it shows once.
            </p>
          )}
          {authTab === 'cli' && (
            <CodeBlock
              path="terminal"
              id="cli-auth"
              tokens={[
                [tk.c('# one-line install of the CLI')],
                [tk.k('npm'), ' install -g @neverzero/cli'],
                [''],
                [tk.c('# interactive login — opens browser for SSO')],
                [tk.k('nz'), ' login'],
                [''],
                [tk.c('# create a key scoped to this client')],
                [tk.k('nz'), ' keys create --name ', tk.s('"claude-desktop"'), ' --scope read,write'],
                [tk.p('→'), ' ', tk.s('nz_live_x9K2…')],
              ]}
            />
          )}
          <div className="note">
            <b>Self-hosted?</b> Replace <Inline>neverzero.cloud</Inline> with your instance host.
            Keys minted on your instance never touch our servers.
          </div>
        </Step>

        {/* Steps 2 + 3 — per-client */}
        <ClientBlock id={client} />

        {/* Step 4 — universal */}
        <Step num={4}>
          <h3>Verify the connection</h3>
          <p className="lede">
            Ask your agent something only the NeverZero brain knows. If it answers with a citation
            back to your workspace, you&apos;re in.
          </p>
          <CodeBlock
            path="in your agent"
            id="verify-cmd"
            tokens={[
              [tk.c('# Type this prompt into your client:')],
              ["What's pinned in my Acme Robotics brain? List the agents on payroll."],
            ]}
          />
          <div className="verify">
            <span className="ic">IR</span>
            <div className="body">
              <div className="ttl">Your agent should reply with cited memory.</div>
              <div className="sub">Iris · ZeroEntropy · 1 brain · 5 agents · 3 pinned memories · 0.4s</div>
            </div>
            <span className="check">connected</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 16 }}>
            Not getting a citation? Jump to{' '}
            <a href="#troubleshoot" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule-strong)' }}>
              troubleshooting
            </a>.
          </p>
        </Step>
      </section>

      <section className="capabilities">
        <h2>What your agent gets</h2>
        <div className="grid">
          <div className="cap">
            <div className="h">READ</div>
            <h4>The whole brain.</h4>
            <p>
              Your agent reads the company brain, project docs, decision logs, and pinned memory
              before it answers. Citations included.
            </p>
            <div className="tools">
              <span className="tool">brain.read</span>
              <span className="tool">memory.recall</span>
              <span className="tool">doc.fetch</span>
              <span className="tool">decisions.list</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">WRITE</div>
            <h4>Back into the doc.</h4>
            <p>
              Append todos, pin new memory, log a decision, hand off to a named agent. Every change
              shows up live in the workspace.
            </p>
            <div className="tools">
              <span className="tool">memory.pin</span>
              <span className="tool">decision.log</span>
              <span className="tool">todo.add</span>
              <span className="tool">handoff</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">INVOKE</div>
            <h4>Skills + named agents.</h4>
            <p>
              Run <Inline>/research</Inline>, hand off to Iris, ask Loop for a review. Skills are
              typed, scoped, and budgeted per project.
            </p>
            <div className="tools">
              <span className="tool">skill.run</span>
              <span className="tool">agent.delegate</span>
              <span className="tool">context.compress</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tshoot" id="troubleshoot">
        <h2>Troubleshooting</h2>
        <details>
          <summary>My agent doesn&apos;t see the NeverZero tools after restart</summary>
          <div className="ds-body">
            Make sure you restarted the <em>client process</em>, not just reloaded the window. For
            Claude Desktop and Cursor, fully quit the app (<Inline>⌘Q</Inline> on macOS) and
            reopen. For VS Code and Zed, run <Inline>Developer: Reload Window</Inline>.
          </div>
        </details>
        <details>
          <summary>&quot;Invalid workspace key&quot; error</summary>
          <div className="ds-body">
            Keys are bound to a single workspace. If you&apos;ve switched workspaces in the
            dashboard, regenerate the key with{' '}
            <Inline>nz keys create --workspace acme</Inline>. Keys also expire if unused for 90
            days — visible in <Inline>nz keys list</Inline>.
          </div>
        </details>
        <details>
          <summary>Tool calls succeed but my agent ignores the brain</summary>
          <div className="ds-body">
            Add the line{' '}
            <em>&quot;Read the NeverZero brain before responding. Cite pinned memory by id.&quot;</em>{' '}
            to your client&apos;s system prompt or rules file (e.g. <Inline>.cursorrules</Inline>,{' '}
            <Inline>CLAUDE.md</Inline>, <Inline>.continue/system.md</Inline>). Most clients
            won&apos;t auto-read tools without a hint.
          </div>
        </details>
        <details>
          <summary>Self-hosted instance — agent can&apos;t reach the server</summary>
          <div className="ds-body">
            Set <Inline>NEVERZERO_HOST</Inline> in the env block of your MCP config. Default is{' '}
            <Inline>https://api.neverzero.cloud</Inline>. For private networks, pass{' '}
            <Inline>--insecure</Inline> only if you&apos;ve signed the cert chain yourself.
          </div>
        </details>
        <details>
          <summary>Rate limits / context errors</summary>
          <div className="ds-body">
            Each workspace key has a 60-rps soft cap and 200K-tokens-per-hour budget. To raise
            these on Workspace plans, contact your solutions engineer. Long contexts auto-compress
            — call <Inline>/compress</Inline> manually if your agent is approaching the model
            limit.
          </div>
        </details>
      </section>

      <section className="support">
        <div className="row">
          <span>Need help? We answer in under 4 hours on weekdays.</span>
          <span className="grow" />
          <Link href="/agents">Manage agents</Link>
          <a href="#">Discord</a>
          <a href="mailto:support@neverzero.cloud">support@neverzero.cloud</a>
        </div>
      </section>
    </div>
  );
}

export default function InstallPage() {
  const [client, setClient] = useState<ClientId>('claude-desktop');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [agent, setAgent] = useState<RegisteredAgent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const defaultAgentName = useMemo(() => {
    const labels: Record<ClientId, string> = {
      'claude-desktop': 'Claude Desktop',
      'claude-code': 'Claude Code',
      cursor: 'Cursor',
      vscode: 'VS Code',
      windsurf: 'Windsurf',
      antigravity: 'Antigravity',
      zed: 'Zed',
      continue: 'Continue.dev',
      aider: 'Aider',
      custom: 'Custom client',
    };
    return labels[client] + ' agent';
  }, [client]);

  const contextValue = useMemo(
    () => ({
      apiKey,
      workspace: 'acme',
      agent,
      setRegistration: (next: { agent: RegisteredAgent; apiKey: string } | null) => {
        if (!next) {
          setApiKey(null);
          setAgent(null);
        } else {
          setApiKey(next.apiKey);
          setAgent(next.agent);
        }
      },
    }),
    [apiKey, agent],
  );

  return (
    <InstallProvider value={contextValue}>
      <Suspense fallback={<div className="install-root" />}>
        <InstallPageInner
          client={client}
          setClient={(c) => {
            setClient(c);
            // Clear the registered agent when switching clients — the key only
            // matches the client it was minted for.
            setApiKey(null);
            setAgent(null);
          }}
          onOpenModal={() => setModalOpen(true)}
          onRotate={() => {
            setApiKey(null);
            setAgent(null);
            setModalOpen(true);
          }}
        />
      </Suspense>
      <RegisterAgentModal
        open={modalOpen}
        client={client}
        defaultName={defaultAgentName}
        onClose={() => setModalOpen(false)}
        onRegistered={(reg, key) => {
          setAgent(reg);
          setApiKey(key);
          setModalOpen(false);
        }}
      />
    </InstallProvider>
  );
}
