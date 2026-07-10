import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Code2, Image as ImageIcon } from 'lucide-react'
import { api, apiErrorMessage, BugOut, BugStatus, ProjectOut } from '../lib/api'
import { useAuth } from '../state/auth'
import Layout from '../components/Layout'
import { PriorityBadge } from '../components/Badges'
import ProjectGraph3D from '../components/ProjectGraph3D'

const COLUMNS: { key: BugStatus; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready_for_testing', label: 'Ready for Testing' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
]

// Highest priority first, so developers always see what matters most at the
// top of every column.
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
function sortByPriority(bugs: BugOut[]): BugOut[] {
  return [...bugs].sort((a, b) => {
    const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    if (diff !== 0) return diff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export default function DeveloperDashboard() {
  const navigate = useNavigate()
  const { organization } = useAuth()
  const [bugs, setBugs] = useState<BugOut[]>([])
  const [projects, setProjects] = useState<ProjectOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [bugsRes, projectsRes] = await Promise.all([api.get('/bugs'), api.get('/projects')])
      setBugs(bugsRes.data)
      setProjects(projectsRes.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function quickStatus(bugId: string, status: BugStatus, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await api.patch(`/bugs/${bugId}/status`, { status })
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <Layout>
      <div className="container mt-32" style={{ paddingBottom: 60 }}>
        <div className="flex items-center gap-8">
          <Code2 size={22} color="var(--accent-bright)" />
          <h1 style={{ fontSize: 26 }}>Bug Queue</h1>
        </div>
        <p className="mt-8">
          Every bug reported across your organization's projects — {bugs.length} total,{' '}
          <span style={{ color: 'var(--red)' }}>{bugs.filter((b) => b.status === 'open').length} open</span>.
        </p>

        {error && <p className="error-text mt-16">{error}</p>}

        {!loading && projects.length > 0 && (
          <div className="mt-24">
            <ProjectGraph3D projects={projects} orgName={organization?.name} />
          </div>
        )}

        {loading && (
          <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 300, borderRadius: 14 }} />
            ))}
          </div>
        )}

        {!loading && (
          <div
            className="mt-24"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, alignItems: 'start' }}
          >
            {COLUMNS.map((col) => {
              const colBugs = sortByPriority(bugs.filter((b) => b.status === col.key))
              return (
                <div key={col.key} className="card" style={{ minHeight: 120 }}>
                  <div
                    className="flex items-center justify-between"
                    style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{col.label}</span>
                    <span className="badge">{colBugs.length}</span>
                  </div>
                  <div className="flex-col gap-10" style={{ padding: 10 }}>
                    {colBugs.length === 0 && (
                      <p className="text-sm text-muted" style={{ padding: '8px 6px' }}>
                        Nothing here.
                      </p>
                    )}
                    {colBugs.map((b) => (
                      <div
                        key={b.id}
                        className="card card-pad"
                        style={{ padding: 12, cursor: 'pointer' }}
                        onClick={() => navigate(`/bugs/${b.id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <PriorityBadge priority={b.priority} />
                          {b.screenshot_url && <ImageIcon size={13} color="var(--text-muted)" />}
                        </div>
                        <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>{b.title}</p>
                        <p className="text-sm text-muted mt-8">
                          {b.project_name} · reported by {b.reporter_name}
                        </p>
                        <div className="flex gap-6 mt-8" style={{ flexWrap: 'wrap' }}>
                          {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                            <button
                              key={c.key}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11, padding: '4px 8px' }}
                              onClick={(e) => quickStatus(b.id, c.key, e)}
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
