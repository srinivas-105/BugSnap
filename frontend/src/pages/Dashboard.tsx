import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, Plus, Bug as BugIcon, ExternalLink } from 'lucide-react'
import { api, apiErrorMessage, ProjectOut } from '../lib/api'
import { useAuth } from '../state/auth'
import Layout from '../components/Layout'
import TiltCard from '../components/TiltCard'
import ProjectGraph3D from '../components/ProjectGraph3D'

export default function Dashboard() {
  const { user, organization } = useAuth()
  const navigate = useNavigate()

  const [projects, setProjects] = useState<ProjectOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/projects')
      setProjects(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/projects', { name, url: url || null, description: description || null })
      setShowCreate(false)
      setName('')
      setUrl('')
      setDescription('')
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const totalOpen = projects.reduce((sum, p) => sum + p.bug_counts.open, 0)
  const totalBugs = projects.reduce(
    (sum, p) =>
      sum + p.bug_counts.open + p.bug_counts.in_progress + p.bug_counts.ready_for_testing + p.bug_counts.resolved + p.bug_counts.closed,
    0
  )

  return (
    <Layout>
      <div className="container mt-32">
        <div className="flex items-center justify-between mt-16">
          <div>
            <h1 style={{ fontSize: 28 }}>Websites & Projects</h1>
            <p className="mt-8">
              {projects.length} project{projects.length !== 1 ? 's' : ''} · {totalBugs} total bugs ·{' '}
              <span style={{ color: 'var(--red)' }}>{totalOpen} open</span>
            </p>
          </div>
          <div className="flex gap-12">
            {user?.role !== 'tester' ? null : (
              <button className="btn btn-primary" onClick={() => navigate('/report')}>
                <BugIcon size={16} /> Report a bug
              </button>
            )}
            {user?.role === 'admin' && (
              <button className="btn btn-secondary" onClick={() => setShowCreate((v) => !v)}>
                <Plus size={16} /> New project
              </button>
            )}
          </div>
        </div>

        {!loading && projects.length > 0 && (
          <div className="mt-24">
            <ProjectGraph3D projects={projects} orgName={organization?.name} />
          </div>
        )}

        {showCreate && (
          <div className="card card-pad mt-24 fade-up">
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Register a new website / app</h3>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field">
                <label>URL (optional)</label>
                <input className="input" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
              </div>
              <div className="field">
                <label>Description (optional — helps the AI assistant route bugs correctly)</label>
                <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex gap-12">
                <button className="btn btn-primary" disabled={creating}>
                  {creating ? <span className="spinner" /> : 'Create project'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <p className="error-text mt-16">{error}</p>}

        <div
          className="mt-24"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, paddingBottom: 60 }}
        >
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
            ))}

          {!loading && projects.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-state-icon">
                <Folder size={24} />
              </div>
              <h3 style={{ fontSize: 16, color: 'var(--text-primary)' }}>No projects yet</h3>
              <p className="text-sm mt-8">
                {user?.role === 'admin'
                  ? 'Create your first website/app so testers know where to report bugs.'
                  : 'Ask your workspace admin to register a website/app.'}
              </p>
            </div>
          )}

          {!loading &&
            projects.map((p) => {
              const totalForProject =
                p.bug_counts.open + p.bug_counts.in_progress + p.bug_counts.ready_for_testing + p.bug_counts.resolved + p.bug_counts.closed
              return (
                <TiltCard key={p.id} className="card-pad" onClick={() => navigate(`/projects/${p.id}`)}>
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
                      <Folder size={18} />
                    </div>
                    {p.bug_counts.open > 0 && (
                      <span className="badge badge-open">{p.bug_counts.open} open</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 17, marginTop: 14 }}>{p.name}</h3>
                  {p.url && (
                    <p className="text-sm flex items-center gap-4 mt-8" style={{ color: 'var(--blue)' }}>
                      <ExternalLink size={12} /> {p.url.replace(/^https?:\/\//, '')}
                    </p>
                  )}
                  {p.description && <p className="text-sm mt-8">{p.description}</p>}
                  <div className="flex items-center gap-16 mt-16" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <span className="text-sm">
                      <strong style={{ color: 'var(--text-primary)' }}>{totalForProject}</strong> bugs
                    </span>
                    <span className="text-sm" style={{ color: 'var(--green)' }}>
                      {p.bug_counts.resolved + p.bug_counts.closed} resolved
                    </span>
                  </div>
                </TiltCard>
              )
            })}
        </div>
      </div>
    </Layout>
  )
}
