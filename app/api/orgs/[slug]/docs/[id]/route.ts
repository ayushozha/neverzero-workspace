import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { getDoc } from '@/lib/docs';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const doc = await getDoc(id);
  if (!doc || doc.orgSlug !== org.slug) return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
  return NextResponse.json({ doc });
}
