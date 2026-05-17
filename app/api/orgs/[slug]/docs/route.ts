import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { ensureBrainRoot, listDocs } from '@/lib/docs';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  // Make sure the brain root exists so callers can always reference it.
  const root = await ensureBrainRoot(org.slug);

  const url = new URL(req.url);
  const parentParam = url.searchParams.get('parent');
  const docs = await listDocs({
    orgSlug: org.slug,
    parentId: parentParam === null ? undefined : parentParam === '' ? null : parentParam,
  });

  return NextResponse.json({ root, docs });
}
