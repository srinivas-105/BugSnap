import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SkipForward } from 'lucide-react'

const AUTO_ADVANCE_MS = 4800
const CAN_SKIP_MS = 900

type Shard = {
  x: number
  y: number
  z: number
  rot: number
  vrot: number
  size: number
  hue: number
}

// Procedurally generated 3D-ish "shattering glass reassembling into a logo"
// animation, drawn frame-by-frame on a <canvas>. No video file involved.
function useShatterAnimation(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const start = performance.now()
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const SHARD_COUNT = 90
    const shards: Shard[] = Array.from({ length: SHARD_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = 260 + Math.random() * 420
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.6,
        z: Math.random() * 900,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.06,
        size: 10 + Math.random() * 26,
        hue: 250 + Math.random() * 60
      }
    })

    function draw(now: number) {
      const t = Math.min(1, (now - start) / (AUTO_ADVANCE_MS - 600))
      const ease = 1 - Math.pow(1 - t, 3)

      ctx!.clearRect(0, 0, width, height)

      const bg = ctx!.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.7)
      bg.addColorStop(0, 'rgba(108,92,231,0.18)')
      bg.addColorStop(1, 'rgba(10,11,15,0)')
      ctx!.fillStyle = bg
      ctx!.fillRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      const sorted = [...shards].sort((a, b) => b.z - a.z)

      for (const s of sorted) {
        const curX = s.x * (1 - ease)
        const curY = s.y * (1 - ease)
        const curZ = s.z * (1 - ease) + 40

        const scale = 420 / (420 + curZ)
        const px = cx + curX * scale
        const py = cy + curY * scale
        const size = s.size * scale * (0.6 + ease * 0.8)
        const rot = s.rot + s.vrot * now * 0.06 * (1 - ease * 0.7)
        const alpha = 0.15 + 0.55 * scale

        ctx!.save()
        ctx!.translate(px, py)
        ctx!.rotate(rot)
        const grad = ctx!.createLinearGradient(-size, -size, size, size)
        grad.addColorStop(0, `hsla(${s.hue}, 90%, 72%, ${alpha})`)
        grad.addColorStop(1, `hsla(${s.hue + 40}, 90%, 60%, ${alpha * 0.5})`)
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.moveTo(0, -size)
        ctx!.lineTo(size * 0.86, size * 0.5)
        ctx!.lineTo(-size * 0.86, size * 0.5)
        ctx!.closePath()
        ctx!.fill()
        ctx!.restore()
      }

      const coreScale = 0.4 + ease * 0.6
      const coreAlpha = Math.min(1, ease * 1.4)
      ctx!.save()
      ctx!.globalCompositeOperation = 'lighter'
      const core = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 160 * coreScale)
      core.addColorStop(0, `rgba(255,255,255,${0.5 * coreAlpha})`)
      core.addColorStop(0.4, `rgba(108,92,231,${0.5 * coreAlpha})`)
      core.addColorStop(1, 'rgba(108,92,231,0)')
      ctx!.fillStyle = core
      ctx!.beginPath()
      ctx!.arc(cx, cy, 160 * coreScale, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.restore()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [canvasRef])
}

export default function Intro() {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { next?: string } }
  const next = location.state?.next || '/'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [canSkip, setCanSkip] = useState(false)
  const [showWordmark, setShowWordmark] = useState(false)

  useShatterAnimation(canvasRef)

  useEffect(() => {
    const skipTimer = window.setTimeout(() => setCanSkip(true), CAN_SKIP_MS)
    const wordmarkTimer = window.setTimeout(() => setShowWordmark(true), AUTO_ADVANCE_MS - 2000)
    const advanceTimer = window.setTimeout(() => navigate(next, { replace: true }), AUTO_ADVANCE_MS)
    return () => {
      window.clearTimeout(skipTimer)
      window.clearTimeout(wordmarkTimer)
      window.clearTimeout(advanceTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0b0f', overflow: 'hidden', zIndex: 100 }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {showWordmark && (
          <div
            style={{
              fontWeight: 800,
              fontSize: 44,
              color: 'white',
              fontFamily: 'var(--font-display)',
              textShadow: '0 0 40px rgba(108,92,231,0.8), 0 0 90px rgba(59,158,255,0.5)',
              opacity: showWordmark ? 1 : 0,
              transform: showWordmark ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            BugSnap
          </div>
        )}
      </div>

      <button
        className="btn btn-secondary"
        disabled={!canSkip}
        onClick={() => navigate(next, { replace: true })}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          background: 'rgba(20,22,29,0.75)',
          backdropFilter: 'blur(8px)',
        }}
      >
        Skip intro <SkipForward size={15} />
      </button>
    </div>
  )
}
