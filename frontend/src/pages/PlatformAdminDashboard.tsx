import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { api, apiErrorMessage, OrganizationWithStats } from '../lib/api'
import { usePlatformAuth } from '../state/platformAuth'
import TiltCard from '../components/TiltCard'

export default function PlatformAdminDashboard() {
  const { admin, clearAuth } = usePlatformAuth()
  const navigate = useNavigate()

  const [orgs, setOrgs] = useState<OrganizationWithStats[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [orgsRes, statsRes] = await Promise.all([api.get('/platform/organizations'), api.get('/platform/stats')])
      setOrgs(orgsRes.data)
      setStats(statsRes.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete organization "${name}"? This removes all its users, projects and bugs.`)) return
    try {
      await api.delete(`/platform/organizations/${id}`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  function handleLogout() {
    clearAuth()
    navigate('/platform-admin/login')
  }

  return (
    <div className="page">
      <header style={{ borderBottom: '1px solid var(--border)', background: 'rgba(10,11,15,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="container flex items-center justify-between" style={{ height: 66 }}>
          <div className="flex items-center gap-8">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #ff9d5c, #ff5c72)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>BugSnap Platform Console</span>
          </div>
          <div className="flex items-center gap-16">
            <span className="text-sm text-secondary">{admin?.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="container mt-32" style={{ paddingBottom: 60 }}>
        <h1 style={{ fontSize: 26 }}>All organizations</h1>
        <p className="mt-8">Every company / college workspace running on BugSnap.</p>

        {stats && (
          <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <StatCard label="Organizations" value={stats.organization_count} />
            <StatCard label="Total users" value={stats.user_count} />
            <StatCard label="Total projects" value={stats.project_count} />
            <StatCard label="Total bugs" value={stats.bug_count} />
            <StatCard label="Open bugs" value={stats.open_bugs} color="var(--red)" />
            <StatCard label="Resolved" value={stats.resolved_bugs} color="var(--green)" />
          </div>
        )}

        {error && <p className="error-text mt-16">{error}</p>}

        <div className="mt-32" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {loading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}

          {!loading &&
            orgs.map((org) => (
              <TiltCard key={org.id} className="card-pad">
                <div className="flex items-center justify-between">
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-bright)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={18} />
                  </div>
                  <span className="badge" style={{ background: 'var(--slate-soft)', color: 'var(--slate)' }}>
                    {org.org_type}
                  </span>
                </div>
                <h3 style={{ fontSize: 17, marginTop: 14 }}>{org.name}</h3>
                <p className="text-sm mt-8">
                  Code: <strong style={{ color: 'var(--text-primary)' }}>{org.workspace_code}</strong>
                </p>
                <div className="flex gap-16 mt-16" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <span className="text-sm">{org.user_count} users</span>
                  <span className="text-sm">{org.project_count} projects</span>
                  <span className="text-sm">{org.bug_count} bugs</span>
                </div>
                <button
                  className="btn btn-danger btn-sm mt-16 w-full"
                  onClick={() => handleDelete(org.id, org.name)}
                >
                  <Trash2 size={13} /> Delete organization
                </button>
              </TiltCard>
            ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card card-pad">
      <div className="text-sm text-secondary">{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-display)', color: color || 'var(--text-primary)', marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}
