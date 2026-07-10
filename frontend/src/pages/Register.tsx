import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Bug, UserPlus } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { useAuth } from '../state/auth'
import { goAfterAuth } from '../lib/postLogin'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [params] = useSearchParams()

  const [workspaceCode, setWorkspaceCode] = useState(params.get('code') || '')
  const [email, setEmail] = useState(params.get('email') || '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        workspace_code: workspaceCode,
        email,
        name,
        password,
      })
      setAuth(res.data.access_token, res.data.user, res.data.organization)
      goAfterAuth(navigate, res.data.user.role, res.data.is_first_login)
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
            <UserPlus size={18} color="var(--accent-bright)" />
            <h2 style={{ fontSize: 20 }}>Register your account</h2>
          </div>
          <p className="text-sm mt-8" style={{ marginBottom: 24 }}>
            Your admin must have already added your email to the workspace. Enter the exact same
            email, the workspace code, and choose your name & password.
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
              <label>Email (must match what your admin gave you)</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Your name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                className="input"
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="error-text mt-8" style={{ marginBottom: 12 }}>{error}</p>}

            <button className="btn btn-primary btn-block mt-8" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create my account'}
            </button>
          </form>
        </div>

        <p className="text-sm mt-16" style={{ textAlign: 'center' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
