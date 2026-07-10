import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Bug, Camera, MessageSquareText, Sparkles, Workflow, ShieldCheck } from 'lucide-react'
import TiltCard from '../components/TiltCard'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="page">
      <header className="container flex items-center justify-between" style={{ height: 80 }}>
        <div className="flex items-center gap-8">
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
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>BugSnap</span>
        </div>
        <div className="flex items-center gap-16">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/platform-admin/login')}>
            Platform Admin
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>
            Log in
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>
            Create workspace
          </button>
        </div>
      </header>

      <section className="container fade-up" style={{ paddingTop: 72, paddingBottom: 48, textAlign: 'center' }}>
        <div
          className="badge"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-bright)', margin: '0 auto 24px' }}
        >
          <Sparkles size={13} />
          Now with an AI report assistant
        </div>
        <h1 style={{ fontSize: 56, lineHeight: 1.06, maxWidth: 820, margin: '0 auto' }}>
          Capture bugs. <span style={{ color: 'var(--accent-bright)' }}>Faster reports.</span> Faster fixes.
        </h1>
        <p style={{ fontSize: 18, maxWidth: 560, margin: '22px auto 0' }}>
          BugSnap gives every organization — companies, colleges, agencies — its own private
          workspace where testers report bugs and developers fix them, with an AI assistant
          that asks the right questions before the report even hits your dashboard.
        </p>
        <div className="flex items-center gap-16" style={{ justifyContent: 'center', marginTop: 34 }}>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>
            Create your workspace <ArrowRight size={16} />
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/intro')}>
            Watch the intro
          </button>
        </div>
        <p className="text-muted text-sm mt-16">
          Demo workspace ready to explore — code <strong style={{ color: 'var(--text-secondary)' }}>DEMOCORP</strong>,
          any of the seeded logins on the Login page.
        </p>
      </section>

      <section className="container mt-32" style={{ paddingBottom: 100 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          <FeatureCard
            icon={<MessageSquareText size={20} />}
            title="AI report assistant"
            desc="Instead of a blank form, a short guided conversation figures out which website the bug is on and asks the follow-ups a developer would."
          />
          <FeatureCard
            icon={<Camera size={20} />}
            title="Auto-captured context"
            desc="Browser, OS, device and screen resolution are captured automatically — no more 'which browser were you using?' threads."
          />
          <FeatureCard
            icon={<Workflow size={20} />}
            title="Full lifecycle tracking"
            desc="Open → In Progress → Ready for Testing → Resolved → Closed, with comments and history on every bug."
          />
          <FeatureCard
            icon={<ShieldCheck size={20} />}
            title="Multi-tenant by design"
            desc="Every organization gets an isolated workspace with its own admin, developers, testers and projects."
          />
        </div>
      </section>

      <footer className="container" style={{ padding: '28px 0 48px', color: 'var(--text-muted)', fontSize: 13 }}>
        BugSnap — built for teams who are tired of asking "can you send a screenshot?"
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <TiltCard className="card-pad">
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: 'var(--accent-soft)',
          color: 'var(--accent-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 16.5, marginBottom: 8 }}>{title}</h3>
      <p className="text-sm">{desc}</p>
    </TiltCard>
  )
}
