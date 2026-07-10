import { useEffect, useState } from 'react'
import { Plus, Trash2, UserCog, Mail, Clock } from 'lucide-react'
import { api, apiErrorMessage, Role, UserOut } from '../lib/api'
import { useAuth } from '../state/auth'
import Layout from '../components/Layout'
import { RoleBadge } from '../components/Badges'

export default function AdminPanel() {
  const { user: currentUser, organization } = useAuth()
  const [users, setUsers] = useState<UserOut[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAdd, setShowAdd] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('tester')
  const [creating, setCreating] = useState(false)
  const [lastInvited, setLastInvited] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.get('/organizations/users'),
        api.get('/organizations/stats'),
      ])
      setUsers(usersRes.data)
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setLastInvited(null)
    try {
      await api.post('/organizations/users', { email, role })
      setLastInvited(email)
      setShowAdd(false)
      setEmail('')
      setRole('tester')
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this user?')) return
    try {
      await api.delete(`/organizations/users/${id}`)
      load()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const developers = users.filter((u) => u.role === 'developer')
  const testers = users.filter((u) => u.role === 'tester')
  const admins = users.filter((u) => u.role === 'admin')

  return (
    <Layout>
      <div className="container mt-32" style={{ paddingBottom: 60 }}>
        <div className="flex items-center gap-8">
          <UserCog size={22} color="var(--accent-bright)" />
          <h1 style={{ fontSize: 26 }}>Organization Admin</h1>
        </div>
        <p className="mt-8">{organization?.name} — workspace code {organization?.workspace_code}</p>

        {stats && (
          <div className="mt-24" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            <StatCard label="Team members" value={stats.user_count} />
            <StatCard label="Projects" value={stats.project_count} />
            <StatCard label="Total bugs" value={stats.bug_count} />
            <StatCard label="Open bugs" value={stats.open_bugs} color="var(--red)" />
            <StatCard label="Resolved" value={stats.resolved_bugs} color="var(--green)" />
          </div>
        )}

        <div className="flex items-center justify-between mt-32">
          <div>
            <h2 style={{ fontSize: 18 }}>Invite a teammate</h2>
            <p className="text-sm mt-8">
              Add their email + role here. They can only get into this workspace by registering with
              that exact email — anyone else is rejected even if they have the workspace code.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={15} /> Invite user
          </button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="card card-pad mt-16 fade-up">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Role</label>
                <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="tester">Tester</option>
                  <option value="developer">Developer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="error-text mt-16">{error}</p>}
            <div className="flex gap-12 mt-16">
              <button className="btn btn-primary" disabled={creating}>
                {creating ? <span className="spinner" /> : 'Send invite'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {lastInvited && (
          <div className="card card-pad mt-16" style={{ background: 'var(--accent-soft)' }}>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
              <strong>{lastInvited}</strong> has been invited. Share the workspace code{' '}
              <strong>{organization?.workspace_code}</strong> with them and ask them to register at{' '}
              <code>/register</code> using that exact email.
            </p>
          </div>
        )}

        <div className="mt-32">
          <h2 style={{ fontSize: 18, marginBottom: 4 }}>Who's working under you</h2>
          <p className="text-sm" style={{ marginBottom: 16 }}>
            Developers and testers in your workspace, whether they've registered yet, and when they
            last logged in.
          </p>

          {loading && <div className="card-pad skeleton" style={{ height: 200, borderRadius: 14 }} />}

          {!loading && (
            <div className="flex-col gap-24">
              <TeamGroup title="Developers" people={developers} currentUserId={currentUser?.id} onRemove={handleRemove} />
              <TeamGroup title="Testers" people={testers} currentUserId={currentUser?.id} onRemove={handleRemove} />
              <TeamGroup title="Admins" people={admins} currentUserId={currentUser?.id} onRemove={handleRemove} />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

function TeamGroup({
  title,
  people,
  currentUserId,
  onRemove,
}: {
  title: string
  people: UserOut[]
  currentUserId?: string
  onRemove: (id: string) => void
}) {
  if (people.length === 0) return null
  return (
    <div>
      <h3 className="text-sm" style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
        {title.toUpperCase()} ({people.length})
      </h3>
      <div className="card">
        {people.map((u, i) => (
          <div
            key={u.id}
            className="flex items-center justify-between"
            style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}
          >
            <div className="flex items-center gap-12">
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-bright)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                <div className="text-muted text-sm flex items-center gap-6">
                  <Mail size={11} /> {u.email}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-16" style={{ flexWrap: 'wrap' }}>
              <RoleBadge role={u.role} />
              {u.is_active ? (
                <span className="badge" style={{ background: 'var(--green-soft, rgba(34,197,94,.12))', color: 'var(--green)' }}>
                  Active
                </span>
              ) : (
                <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent-bright)' }}>
                  Invited · pending
                </span>
              )}
              <span className="flex items-center gap-6 text-sm text-muted">
                <Clock size={12} />
                {u.last_login_at ? `Last login ${new Date(u.last_login_at).toLocaleString()}` : 'Never logged in'}
              </span>
              {u.id !== currentUserId && (
                <button className="btn btn-ghost btn-sm" onClick={() => onRemove(u.id)}>
                  <Trash2 size={14} color="var(--red)" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="card card-pad">
      <div className="text-sm text-secondary">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)', color: color || 'var(--text-primary)', marginTop: 6 }}>
        {value}
      </div>
    </div>
  )
}
