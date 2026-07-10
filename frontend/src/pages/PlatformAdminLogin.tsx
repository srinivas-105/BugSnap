import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { usePlatformAuth } from '../state/platformAuth'

export default function PlatformAdminLogin() {
  const navigate = useNavigate()
  const { setAuth } = usePlatformAuth()

  const [email, setEmail] = useState('owner@bugsnap.dev')
  const [password, setPassword] = useState('BugSnapOwner123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/platform-admin/login', { email, password })
      setAuth(res.data.access_token, res.data.admin)
      navigate('/platform-admin')
    } catch (err) {
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
              background: 'linear-gradient(135deg, #ff9d5c, #ff5c72)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>BugSnap Platform</span>
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: 20 }}>Platform Admin</h2>
          <p className="text-sm mt-8" style={{ marginBottom: 24 }}>
            Owner-level access across every organization on BugSnap. Not for regular workspace members.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="error-text mt-8" style={{ marginBottom: 12 }}>{error}</p>}
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Enter platform console'}
            </button>
          </form>

          <p className="text-sm mt-16" style={{ color: 'var(--text-muted)' }}>
            Default credentials come from the backend .env (PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD).
          </p>
        </div>

        <p className="text-sm mt-16" style={{ textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
            ← Back to workspace login
          </Link>
        </p>
      </div>
    </div>
  )
}
