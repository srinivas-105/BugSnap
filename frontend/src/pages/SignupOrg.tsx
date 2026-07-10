import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bug, Building2 } from 'lucide-react'
import { api, apiErrorMessage } from '../lib/api'
import { useAuth } from '../state/auth'
import { goAfterAuth } from '../lib/postLogin'

export default function SignupOrg() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [organizationName, setOrganizationName] = useState('')
  const [workspaceCode, setWorkspaceCode] = useState('')
  const [orgType, setOrgType] = useState<'company' | 'college' | 'other'>('company')
  const [adminName, setAdminName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/signup-organization', {
        organization_name: organizationName,
        workspace_code: workspaceCode,
        org_type: orgType,
        admin_name: adminName,
        email,
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
        <div className="flex items-center gap-8 mt-16" style={{ justifyContent: 'center', marginBottom: 28 }}>
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
          <div className="flex items-center gap-8 mt-8" style={{ marginBottom: 4 }}>
            <Building2 size={18} color="var(--accent-bright)" />
            <h2 style={{ fontSize: 20 }}>Create your organization's workspace</h2>
          </div>
          <p className="text-sm mt-8" style={{ marginBottom: 24 }}>
            One workspace per company / college. You'll be its first admin — invite developers
            and testers afterwards.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Organization name</label>
              <input
                className="input"
                placeholder="Acme Technologies"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Workspace code (used at login, e.g. company short-name)</label>
              <input
                className="input"
                placeholder="ACME"
                value={workspaceCode}
                onChange={(e) => setWorkspaceCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="field">
              <label>Organization type</label>
              <select className="select" value={orgType} onChange={(e) => setOrgType(e.target.value as any)}>
                <option value="company">Company</option>
                <option value="college">College / University</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field">
              <label>Your name (workspace admin)</label>
              <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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

            {error && <p className="error-text mt-8" style={{ marginBottom: 12 }}>{error}</p>}

            <button className="btn btn-primary btn-block mt-8" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create workspace'}
            </button>
          </form>
        </div>

        <p className="text-sm mt-16" style={{ textAlign: 'center' }}>
          Already have a workspace?{' '}
          <Link to="/login" style={{ color: 'var(--accent-bright)', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
