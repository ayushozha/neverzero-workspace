import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';
import './org-home.css';

export const dynamic = 'force-dynamic';

export default async function OrgHomePage({
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
  };

  return (
    <div className="org-home-root">
      <section className="hero">
        <Link className="brand" href="/">
          <span className="logo" />
          <span className="name">NeverZero<span className="sm">Cloud</span></span>
        </Link>

        <div className="eyebrow">ORG · {org.domain.toUpperCase()}</div>
        <h1>{org.name}.</h1>
        {org.tagline && <p className="tag">{org.tagline}</p>}

        <div className="stat-row">
          <span><b>{counts.total}</b> agents</span>
          <span><b>{counts.connected}</b> connected</span>
          <span><b>{org.people.length}</b> humans</span>
          <span><b>{org.memories.length}</b> pinned memories</span>
        </div>

        <div className="actions">
          <Link className="btn primary" href={`/${org.slug}/install`}>
            Install in your agent →
          </Link>
          <Link className="btn ghost" href={`/${org.slug}/brain`}>Open company brain</Link>
          <Link className="btn ghost" href={`/${org.slug}/agents`}>Manage agents</Link>
        </div>
      </section>
    </div>
  );
}
