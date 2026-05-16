import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listAgents, type Agent } from '@/lib/agents';
import { getOrg } from '@/lib/orgs';
import RevokeButton from '@/app/agents/_components/RevokeButton';
import '@/app/agents/agents.css';

export const dynamic = 'force-dynamic';

const CLIENT_LABELS: Record<string, string> = {
  'claude-desktop': 'Claude Desktop',
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  vscode: 'VS Code',
  windsurf: 'Windsurf',
  antigravity: 'Antigravity',
  zed: 'Zed',
  continue: 'Continue.dev',
  aider: 'Aider',
  custom: 'Custom / REST',
};

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

function StatusPill({ status }: { status: Agent['status'] }) {
  return (
    <span className={'pill status-' + status}>
      {status === 'connected' && <span className="dot" />}
      {status}
    </span>
  );
}

export default async function OrgAgentsPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const agents = await listAgents({ orgSlug: org.slug });
  const counts = {
    total: agents.length,
    connected: agents.filter((a) => a.status === 'connected').length,
    pending: agents.filter((a) => a.status === 'pending').length,
    revoked: agents.filter((a) => a.status === 'revoked').length,
  };

  return (
    <div className="agents-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">NeverZero<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-crumb">
            <Link href={`/${org.slug}`} style={{ color: 'var(--ink-soft)' }}>{org.name}</Link>
            <span className="sep">›</span>
            <span className="cur">Agents</span>
          </div>
          <div className="nav-right">
            <Link className="txt" href={`/${org.slug}/install`}>+ Add agent</Link>
            <Link className="txt" href={`/${org.slug}/brain`}>Brain</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">{org.domain.toUpperCase()} · AGENTS</div>
        <h1>
          {org.name} agents.<br />
          <span className="muted">One key per client, per machine.</span>
        </h1>
        <div className="stat-row">
          <span className="item"><b>{counts.total}</b> registered</span>
          <span className="item"><b>{counts.connected}</b> connected</span>
          <span className="item"><b>{counts.pending}</b> pending</span>
          <span className="item"><b>{counts.revoked}</b> revoked</span>
        </div>
      </section>

      <section className="list-wrap">
        {agents.length === 0 ? (
          <div className="empty">
            <h3>No agents yet.</h3>
            <p>
              Register your first one to start syncing the {org.name} brain.{' '}
              <Link className="cta" href={`/${org.slug}/install`}>Open install →</Link>
            </p>
          </div>
        ) : (
          <table className="agent-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>From</th>
                <th>Key</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Created</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} data-status={a.status}>
                  <td>
                    <div className="name">{a.name}</div>
                    <div className="sub">{a.id}</div>
                  </td>
                  <td>
                    <div className="from">{CLIENT_LABELS[a.from] || a.from}</div>
                    {a.platform.machine && (
                      <div className="sub">
                        {a.platform.machine}{a.platform.os ? ` · ${a.platform.os}` : ''}
                      </div>
                    )}
                  </td>
                  <td><code className="key">{a.apiKeyPrefix}…</code></td>
                  <td><StatusPill status={a.status} /></td>
                  <td><span className="owner">{a.ownedBy}</span></td>
                  <td className="ts">{relative(a.createdAt)}</td>
                  <td className="ts">{a.lastSeenAt ? relative(a.lastSeenAt) : '—'}</td>
                  <td className="actions">
                    {a.status !== 'revoked' && <RevokeButton id={a.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
