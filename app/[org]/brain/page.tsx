import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg, type Org } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';
import './brain.css';

export const dynamic = 'force-dynamic';

const AGENT_LABELS: Record<string, { glyph: string; name: string; role: string; provider: string }> = {
  iris: { glyph: 'IR', name: 'Iris', role: 'research-agent', provider: 'ZeroEntropy' },
  forge: { glyph: 'FG', name: 'Forge', role: 'build-agent', provider: 'GStack' },
  'atlas-agent': { glyph: 'AT', name: 'Atlas', role: 'planning-agent', provider: 'GBrain' },
  loop: { glyph: 'LP', name: 'Loop', role: 'review-agent', provider: 'The Hog' },
  beam: { glyph: 'BM', name: 'Beam', role: 'deploy-agent', provider: 'Lightsprint' },
};

function rewriteMission(org: Org): string | null {
  if (!org.mission && !org.industry && !org.stage && !org.founded && !org.hq) return null;
  let s = '';
  if (org.mission) {
    s += `${org.name} ${org.mission.replace(/^we['’]re\s+/i, 'is ')}`;
  }
  const bits: string[] = [];
  if (org.industry) bits.push(org.industry);
  if (org.stage) bits.push(org.stage);
  if (org.founded) bits.push('founded ' + org.founded);
  if (org.hq) bits.push('based in ' + org.hq);
  if (bits.length) s += (s ? ' · ' : `${org.name} — `) + bits.join(' · ') + '.';
  return s.trim() || null;
}

export default async function OrgBrainPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const registeredAgents = await listAgents({ orgSlug: org.slug });
  const connectedCount = registeredAgents.filter((a) => a.status === 'connected').length;
  const roster = org.agentRoster.map((id) => AGENT_LABELS[id]).filter(Boolean);
  const missionParagraph = rewriteMission(org);

  return (
    <div className="brain-doc-root">
      <div className="top">
        <Link className="brand" href="/">
          <span className="logo" />
          <span className="crumb-name">NeverZero</span>
        </Link>
        <span className="sep">/</span>
        <Link className="crumb" href={`/${org.slug}`} style={{ color: 'var(--ink-soft)' }}>{org.name}</Link>
        <span className="sep">/</span>
        <span className="crumb cur">Company brain</span>
        <span className="domain mono">{org.domain}</span>
        <span className="save">
          <span className="dot" />
          live · {connectedCount} agent{connectedCount === 1 ? '' : 's'} connected
        </span>
      </div>

      <article className="doc">
        <div className="meta">
          {new Date(org.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          {' · '}{org.people.length} collaborator{org.people.length === 1 ? '' : 's'}
          {' · '}{roster.length} agent{roster.length === 1 ? '' : 's'} on payroll
          {registeredAgents.length > 0 && ` · ${registeredAgents.length} client connection${registeredAgents.length === 1 ? '' : 's'}`}
        </div>

        <h1>{org.name}</h1>
        {org.tagline && <p className="sub">{org.tagline}</p>}

        <h2>Mission</h2>
        {missionParagraph ? (
          <p>{missionParagraph}</p>
        ) : (
          <p className="ph">No mission yet — open the brain in /workstation to edit.</p>
        )}

        {org.people.length > 0 && (
          <>
            <h2>Team</h2>
            <div className="people">
              {org.people.map((p, i) => (
                <div key={i} className="person">
                  <span className="av">
                    {p.name.trim()
                      ? p.name.trim().split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase()
                      : '?'}
                  </span>
                  <div className="meta">
                    <div className="nm">{p.name || '(unnamed)'}</div>
                    <div className="rl">{p.role || '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2>Agents on payroll</h2>
        <div className="agent-block-list">
          {roster.map((a) => (
            <div key={a.name} className="agent-line">
              <span className="av">{a.glyph}</span>
              <div className="nm">{a.name}</div>
              <div className="role">
                {a.role} · {a.provider}
              </div>
            </div>
          ))}
        </div>

        <h2>Pinned memory</h2>
        {org.memories.length === 0 ? (
          <p className="ph">No pinned facts yet.</p>
        ) : (
          <div className="memories">
            {org.memories.map((m, i) => (
              <div key={i} className="mem">
                <span className="tag">{m.kind} · PINNED</span>
                <div className="q">{m.text}</div>
                <div className="meta">read by every agent · since {new Date(org.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        <h2>Client connections</h2>
        {registeredAgents.length === 0 ? (
          <p className="ph">
            No client connections yet.{' '}
            <Link href={`/${org.slug}/install`} className="link">Install NeverZero in your agent →</Link>
          </p>
        ) : (
          <div className="connections">
            {registeredAgents.map((a) => (
              <div key={a.id} className={'conn status-' + a.status}>
                <div className="row">
                  <span className="nm">{a.name}</span>
                  <span className="status">{a.status}</span>
                </div>
                <div className="sub">
                  {a.from} · key {a.apiKeyPrefix}…
                  {a.platform.machine && ` · ${a.platform.machine}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="footer-bar">
        <span>{org.domain}</span>
        <span className="grow" />
        <Link href={`/${org.slug}/agents`}>Agents ({registeredAgents.length})</Link>
        <Link href={`/${org.slug}/install`}>+ Add agent</Link>
        <Link href="/workstation">Open workstation →</Link>
      </div>
    </div>
  );
}
