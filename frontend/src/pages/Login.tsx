import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bug, LogIn } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { useAuth } from '../state/auth'
import { goAfterAuth } from '../lib/postLogin'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [workspaceCode, setWorkspaceCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notRegistered, setNotRegistered] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNotRegistered(false)
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { workspace_code: workspaceCode, email, password })
      setAuth(res.data.access_token, res.data.user, res.data.organization)
      goAfterAuth(navigate, res.data.user.role, res.data.is_first_login)
    } catch (err) {
      const anyErr = err as any
      if (anyErr?.response?.status === 403) {
        setNotRegistered(true)
      }
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ justifyContent: 'center', padding: '48px 0' }}>
      <div className="container-narrow fade-up">
        <div className="flex items-center gap-8" style={{ justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent-bright), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bug size={18} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>BugSnap</span>
        </div>

        <div className="card card-pad">
          <div className="flex items-center gap-8" style={{ marginBottom: 4 }}>
            <LogIn size={18} color="var(--accent-bright)" />
            <h2 style={{ fontSize: 20 }}>Log in to your workspace</h2>
          </div>
          <p className="text-sm mt-8" style={{ marginBottom: 24 }}>
            Enter the workspace code and the exact email your admin invited you with.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Workspace code</label>
              <input
                className="input"
                value={workspaceCode}
                onChange={(e) => setWorkspaceCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEMOCORP"
                required
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="mt-8" style={{ marginBottom: 12 }}>
                <p className="error-text">{error}</p>
                {notRegistered && (
                  <p className="text-sm mt-8">
                    First time here?{' '}
                    <Link to="/register" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
                      Register with that email
                    </Link>
                  </p>
                )}
              </div>
            )}

            <button className="btn btn-primary btn-block mt-8" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Log in'}
            </button>
          </form>

          <div className="mt-24 card-pad" style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 14 }}>
            <p className="text-sm" style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Demo accounts (workspace: DEMOCORP)
            </p>
            <p className="text-sm">admin@democorp.dev · dev@democorp.dev · tester@democorp.dev</p>
            <p className="text-sm">password for all: Demo123!</p>
          </div>
        </div>

        <p className="text-sm mt-16" style={{ textAlign: 'center' }}>
          Invited to a workspace but haven't set a password yet?{' '}
          <Link to="/register" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
            Register here
          </Link>
        </p>
        <p className="text-sm mt-8" style={{ textAlign: 'center' }}>
          New organization?{' '}
          <Link to="/signup" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
            Create a workspace
          </Link>
        </p>
      </div>
    </div>
  )
}
