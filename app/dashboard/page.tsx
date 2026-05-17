import Dashboard from './_client/Dashboard'
import { loadDashboardData } from './_data'
import './dashboard.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const data = await loadDashboardData()
  return <Dashboard initial={data} />
}
