import { NextResponse } from 'next/server'
import { zeEnabled, topSnippets } from '../_zeroentropy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  if (!zeEnabled()) {
    return NextResponse.json(
      { enabled: false, results: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const k = Math.max(1, Math.min(12, parseInt(url.searchParams.get('k') ?? '6', 10) || 6))

  if (q.length < 2) {
    return NextResponse.json(
      { enabled: true, results: [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const results = await topSnippets(q, k)
    return NextResponse.json(
      { enabled: true, results },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return NextResponse.json(
      { enabled: true, results: [], error: String(e).slice(0, 200) },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
