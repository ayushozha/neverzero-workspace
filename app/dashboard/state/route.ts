import { NextResponse } from 'next/server'
import { loadDashboardData } from '../_data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json(await loadDashboardData(), {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
