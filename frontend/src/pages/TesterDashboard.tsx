import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Bug as BugIcon } from 'lucide-react'
import { api, apiErrorMessage, BugOut, ProjectOut } from '../lib/api'
import { useAuth } from '../state/auth'
import Layout from '../components/Layout'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import ProjectGraph3D from '../components/ProjectGraph3D'

export default function TesterDashboard() {
  const navigate = useNavigate()
  const { user, organization } = useAuth()
  const [bugs, setBugs] = useState<BugOut[]>([])
  const [projects, setProjects] = useState<ProjectOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const [bugsRes, projectsRes] = await Promise.all([api.get('/bugs'), api.get('/projects')])
      setBugs((bugsRes.data as BugOut[]).filter((b) => b.reported_by_user_id === user?.id))
      setProjects(projectsRes.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return (
    <Layout>
      <div className="container mt-32" style={{ paddingBottom: 60 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26 }}>Your bug reports</h1>
            <p className="mt-8">
              {bugs.length} report{bugs.length !== 1 ? 's' : ''} submitted by you.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/report')}>
            <BugIcon size={16} /> Report a new bug
          </button>
        </div>

        {error && <p className="error-text mt-16">{error}</p>}

        {!loading && projects.length > 0 && (
          <div className="mt-24">
            <ProjectGraph3D projects={projects} orgName={organization?.name} />
          </div>
        )}

        <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
            ))}

          {!loading && bugs.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">
                <Camera size={24} />
              </div>
              <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>No reports yet</h3>
              <p className="text-sm mt-8">Spotted something broken? Report it with a screenshot.</p>
            </div>
          )}

          {!loading &&
            bugs.map((b) => (
              <div key={b.id} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => navigate(`/bugs/${b.id}`)}>
                {b.screenshot_url ? (
                  <img
                    src={`${api.defaults.baseURL}${b.screenshot_url}`}
                    alt="Bug screenshot"
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 140,
                      borderRadius: 10,
                      marginBottom: 12,
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Camera size={20} />
                  </div>
                )}
                <div className="flex items-center gap-8">
                  <PriorityBadge priority={b.priority} />
                  <StatusBadge status={b.status} />
                </div>
                <h3 style={{ fontSize: 15, marginTop: 10 }}>{b.title}</h3>
                <p className="text-sm text-muted mt-8">{b.project_name}</p>
              </div>
            ))}
        </div>
      </div>
    </Layout>
  )
}
