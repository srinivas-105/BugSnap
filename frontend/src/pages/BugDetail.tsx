import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Monitor, Send, User } from 'lucide-react'
import { api, apiErrorMessage, BugOut, BugStatus } from '../lib/api'
import { useAuth } from '../state/auth'
import Layout from '../components/Layout'
import { PriorityBadge, StatusBadge } from '../components/Badges'

const STATUS_FLOW: BugStatus[] = ['open', 'in_progress', 'ready_for_testing', 'resolved', 'closed']

export default function BugDetail() {
  const { bugId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [bug, setBug] = useState<BugOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await api.get(`/bugs/${bugId}`)
      setBug(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugId])

  async function handleStatusChange(status: BugStatus) {
    setUpdatingStatus(true)
    try {
      const res = await api.patch(`/bugs/${bugId}/status`, { status })
      setBug(res.data)
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const res = await api.post(`/bugs/${bugId}/comments`, { body: comment.trim() })
      setBug(res.data)
      setComment('')
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mt-32">
          <div className="skeleton" style={{ height: 260, borderRadius: 14 }} />
        </div>
      </Layout>
    )
  }

  if (!bug) {
    return (
      <Layout>
        <div className="container mt-32">
          <p className="error-text">{error || 'Bug not found'}</p>
        </div>
      </Layout>
    )
  }

  const canChangeStatus = user?.role === 'admin' || user?.role === 'developer'

  return (
    <Layout>
      <div className="container mt-32" style={{ paddingBottom: 60, maxWidth: 900 }}>
        <Link to={`/projects/${bug.project_id}`} className="flex items-center gap-8 text-sm text-secondary" style={{ marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back to {bug.project_name}
        </Link>

        <div className="card card-pad">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="flex items-center gap-12">
              <PriorityBadge priority={bug.priority} />
              <StatusBadge status={bug.status} />
            </div>
            <span className="text-sm text-muted">
              Reported {new Date(bug.created_at).toLocaleString()}
            </span>
          </div>

          <h1 style={{ fontSize: 24, marginTop: 16 }}>{bug.title}</h1>
          <p className="flex items-center gap-8 mt-8 text-sm">
            <User size={13} /> {bug.reporter_name} · {bug.project_name}
          </p>

          {bug.description && (
            <div className="mt-24">
              <h4 className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>
                DESCRIPTION
              </h4>
              <p style={{ color: 'var(--text-primary)' }}>{bug.description}</p>
            </div>
          )}

          {bug.steps_to_reproduce && (
            <div className="mt-24">
              <h4 className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>
                STEPS TO REPRODUCE
              </h4>
              <div className="flex-col gap-8">
                {bug.steps_to_reproduce
                  .split('\n')
                  .filter((s) => s.trim())
                  .map((step, i) => (
                    <div key={i} className="flex items-center gap-12">
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-bright)',
                          fontSize: 11.5,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        {step.replace(/^\d+[.).]?\s*/, '')}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {bug.screenshot_url && (
            <div className="mt-24">
              <h4 className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>
                SCREENSHOT
              </h4>
              <img
                src={`${api.defaults.baseURL}${bug.screenshot_url}`}
                alt="Bug screenshot"
                style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }}
              />
            </div>
          )}

          <div className="mt-24">
            <h4 className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 700 }}>
              ENVIRONMENT
            </h4>
            <div className="flex gap-24" style={{ flexWrap: 'wrap' }}>
              <EnvItem label="Browser" value={bug.browser} />
              <EnvItem label="OS" value={bug.operating_system} />
              <EnvItem label="Device" value={bug.device} />
              <EnvItem label="Resolution" value={bug.screen_resolution} />
            </div>
          </div>

          {canChangeStatus && (
            <div className="mt-24" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <h4 className="text-sm" style={{ color: 'var(--text-secondary)', marginBottom: 10, fontWeight: 700 }}>
                UPDATE STATUS
              </h4>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {STATUS_FLOW.map((s) => (
                  <button
                    key={s}
                    className={`btn btn-sm ${bug.status === s ? 'btn-primary' : 'btn-secondary'}`}
                    disabled={updatingStatus}
                    onClick={() => handleStatusChange(s)}
                  >
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card card-pad mt-24">
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Comments ({bug.comments.length})</h3>
          <div className="flex-col gap-16">
            {bug.comments.map((c) => (
              <div key={c.id} className="flex gap-12">
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-bright)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12.5,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {c.user_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-8">
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{c.user_name}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-8" style={{ color: 'var(--text-primary)' }}>
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
            {bug.comments.length === 0 && <p className="text-sm">No comments yet.</p>}
          </div>

          <form onSubmit={handleComment} className="flex gap-8 mt-24">
            <input
              className="input"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button className="btn btn-primary" disabled={posting || !comment.trim()}>
              {posting ? <span className="spinner" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}

function EnvItem({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-8 text-sm">
      <Monitor size={13} color="var(--text-muted)" />
      <span className="text-muted">{label}:</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
