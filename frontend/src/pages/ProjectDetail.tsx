import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Bug as BugIcon, ExternalLink } from 'lucide-react'
import { api, apiErrorMessage, BugOut, ProjectOut } from '../lib/api'
import { useAuth } from '../state/auth'
import Layout from '../components/Layout'
import TiltCard from '../components/TiltCard'
import { PriorityBadge, StatusBadge } from '../components/Badges'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<ProjectOut | null>(null)
  const [bugs, setBugs] = useState<BugOut[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [projRes, bugsRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/bugs`, { params: statusFilter ? { status_filter: statusFilter } : {} }),
      ])
      setProject(projRes.data)
      setBugs(bugsRes.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, statusFilter])

  return (
    <Layout>
      <div className="container mt-32" style={{ paddingBottom: 60 }}>
        <Link to="/dashboard" className="flex items-center gap-8 text-sm text-secondary" style={{ marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back to projects
        </Link>

        {project && (
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontSize: 26 }}>{project.name}</h1>
              {project.url && (
                <p className="flex items-center gap-4 mt-8" style={{ color: 'var(--blue)' }}>
                  <ExternalLink size={13} /> {project.url}
                </p>
              )}
            </div>
            {user?.role === 'tester' && (
              <button className="btn btn-primary" onClick={() => navigate('/report', { state: { projectId } })}>
                <BugIcon size={16} /> Report a bug here
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-8 mt-24" style={{ flexWrap: 'wrap' }}>
          {['', 'open', 'in_progress', 'ready_for_testing', 'resolved', 'closed'].map((s) => (
            <button
              key={s || 'all'}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === '' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {error && <p className="error-text mt-16">{error}</p>}

        <div className="flex-col gap-12 mt-24">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 84, borderRadius: 14 }} />)}

          {!loading && bugs.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <BugIcon size={24} />
              </div>
              <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>No bugs match this filter</h3>
              <p className="text-sm mt-8">Nice and quiet in here.</p>
            </div>
          )}

          {!loading &&
            bugs.map((b) => (
              <TiltCard key={b.id} className="card-pad" glow={false} onClick={() => navigate(`/bugs/${b.id}`)}>
                <div className="flex items-center justify-between">
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-12">
                      <h3 style={{ fontSize: 15.5 }}>{b.title}</h3>
                      <PriorityBadge priority={b.priority} />
                    </div>
                    <p className="text-sm mt-8">
                      Reported by {b.reporter_name} · {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </TiltCard>
            ))}
        </div>
      </div>
    </Layout>
  )
}
