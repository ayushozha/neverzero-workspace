import { NextResponse } from 'next/server';
import { markVerified } from '@/lib/agents';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = await markVerified(id);
  if (!updated) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  return NextResponse.json({ agent: updated });
}
