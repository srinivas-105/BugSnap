import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SkipForward } from 'lucide-react'

const CAN_SKIP_MS = 900

export default function Intro() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { next?: string } }
  const next = location.state?.next || '/'

  const [canSkip, setCanSkip] = useState(false)
  const [showWordmark, setShowWordmark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setCanSkip(true), CAN_SKIP_MS)
    const wordmarkTimer = window.setTimeout(() => setShowWordmark(true), 500)
    return () => {
      window.clearTimeout(skipTimer)
      window.clearTimeout(wordmarkTimer)
    }
  }, [])

  function finish() {
    navigate(next, { replace: true })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden', zIndex: 100 }}>
      {/* The video itself — slow animated zoom (Ken Burns) instead of a static flat tag */}
      <video
        src="/intro.mp4"
        autoPlay
        muted
        playsInline
        onCanPlay={() => setReady(true)}
        onEnded={finish}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: ready ? 1 : 0,
          transform: ready ? 'scale(1.08)' : 'scale(1)',
          transition: 'opacity 1s ease, transform 9s ease-out',
        }}
      />

      {/* Cinematic vignette so it reads as a "presentation" rather than a raw video element */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 22%, transparent 70%, rgba(0,0,0,0.75) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Animated brand reveal, fades/rises in over the video */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '14%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: 48,
            color: 'white',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.02em',
            textShadow: '0 0 40px rgba(108,92,231,0.75), 0 4px 30px rgba(0,0,0,0.6)',
            opacity: showWordmark ? 1 : 0,
            transform: showWordmark ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
          }}
        >
          BugSnap
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: showWordmark ? 1 : 0,
            transform: showWordmark ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.9s ease 0.15s, transform 0.9s ease 0.15s',
          }}
        >
          Ship with clarity
        </div>
      </div>

      <button
        className="btn btn-secondary"
        disabled={!canSkip}
        onClick={finish}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          background: 'rgba(20,22,29,0.75)',
          backdropFilter: 'blur(8px)',
          opacity: canSkip ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        Skip intro <SkipForward size={15} />
      </button>
    </div>
  )
}