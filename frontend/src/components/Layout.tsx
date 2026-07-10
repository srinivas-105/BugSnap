import { ReactNode } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bug, LayoutGrid, LogOut, ShieldCheck, Users, Code2, Camera } from 'lucide-react'
import { useAuth } from '../state/auth'
import { RoleBadge } from './Badges'
import { homeRouteForRole } from '../lib/postLogin'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, organization, clearAuth } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    clearAuth()
    navigate('/login')
  }

  const home = user ? homeRouteForRole(user.role) : '/dashboard'

  return (
    <div className="page">
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(10,11,15,0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="container flex items-center justify-between" style={{ height: 66 }}>
          <Link to={home} className="flex items-center gap-8">
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
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>
                BugSnap
              </div>
              <div className="text-muted" style={{ fontSize: 11 }}>
                {organization?.name}
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-24">
            {user?.role === 'developer' && (
              <Link to="/dev" className="flex items-center gap-8 text-secondary text-sm">
                <Code2 size={15} />
                Bug Queue
              </Link>
            )}
            {user?.role === 'tester' && (
              <Link to="/tester" className="flex items-center gap-8 text-secondary text-sm">
                <Camera size={15} />
                My Reports
              </Link>
            )}
            <Link to="/dashboard" className="flex items-center gap-8 text-secondary text-sm">
              <LayoutGrid size={15} />
              Projects
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-8 text-secondary text-sm">
                <Users size={15} />
                Admin
              </Link>
            )}
            <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
            <div className="flex items-center gap-8">
              <div className="flex-col" style={{ alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{user?.name}</span>
                {user && <RoleBadge role={user.role} />}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Log out">
              <LogOut size={15} />
            </button>
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>{children}</main>
      <footer className="container" style={{ padding: '28px 28px 40px', color: 'var(--text-muted)', fontSize: 12.5 }}>
        <div className="flex items-center gap-8">
          <ShieldCheck size={13} />
          BugSnap — workspace <strong style={{ color: 'var(--text-secondary)' }}>{organization?.workspace_code}</strong>
        </div>
      </footer>
    </div>
  )
}
