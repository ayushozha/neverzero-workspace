import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { getDoc, listDocs } from '@/lib/docs';
import SubfileLive from './SubfileLive';
import './subfile.css';

export const dynamic = 'force-dynamic';

function relativeTs(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

export default async function SubfilePage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org: slugParam, id } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();
  const doc = await getDoc(id);
  if (!doc || doc.orgSlug !== org.slug) notFound();

  // Resolve parent for crumb (1 level)
  const parent = doc.parentId ? await getDoc(doc.parentId) : null;
  // Children of this subfile (skills can chain)
  const children = await listDocs({ orgSlug: org.slug, parentId: doc.id });

  return (
    <div className="subfile-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">NeverZero<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-crumb">
            <Link href={`/${org.slug}`} style={{ color: 'var(--ink-soft)' }}>{org.name}</Link>
            <span className="sep">›</span>
            {parent ? (
              <Link href={parent.kind === 'brain' ? `/${org.slug}/brain` : `/${org.slug}/docs/${parent.id}`} style={{ color: 'var(--ink-soft)' }}>
                {parent.title}
              </Link>
            ) : (
              <Link href={`/${org.slug}/brain`} style={{ color: 'var(--ink-soft)' }}>brain</Link>
            )}
            <span className="sep">›</span>
            <span className="cur">{doc.title}</span>
          </div>
          <div className="nav-right">
            <Link className="txt" href={`/${org.slug}/brain`}>Back to brain</Link>
          </div>
        </div>
      </nav>

      <article className="subfile-wrap">
        <div className="meta-row">
          {doc.skillRun && (
            <>
              <span className="cmd-pill">{doc.skillRun.command}</span>
              <span className="sep">·</span>
              <span className="prov">{doc.skillRun.skillId.split('.')[0]}</span>
              <span className="sep">·</span>
            </>
          )}
          <span className="ts">{relativeTs(doc.createdAt)}</span>
          <span className="sep">·</span>
          <span className="by">created by {doc.createdBy}</span>
          {doc.skillRun?.mentionedAgents.length ? (
            <>
              <span className="sep">·</span>
              <span className="mentions">
                {doc.skillRun.mentionedAgents.map((a) => '@' + a.name).join(' ')}
              </span>
            </>
          ) : null}
        </div>

        <h1>{doc.title}</h1>

        <SubfileLive
          docId={doc.id}
          orgSlug={org.slug}
          initialStatus={doc.skillRun?.status ?? 'done'}
          initialContent={doc.content}
        />

        {children.length > 0 && (
          <section className="children">
            <h2>Sub-pages</h2>
            <div className="children-list">
              {children.map((c) => (
                <Link key={c.id} className="child-row" href={`/${org.slug}/docs/${c.id}`}>
                  <span className="child-mark">{c.skillRun?.command || '·'}</span>
                  <span className="child-title">{c.title}</span>
                  <span className="child-meta">{relativeTs(c.createdAt)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <footer className="footer">
          <span className="kbd">doc_id={doc.id}</span>
          <span className="grow" />
          <Link href={`/${org.slug}/brain`}>← brain</Link>
        </footer>
      </article>
    </div>
  );
}
