import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder } from 'lucide-react'
import { ProjectOut } from '../lib/api'

/**
 * A coded (no video/image assets) 3D-style rotating graph of every
 * project/website an organization holds, orbiting a central workspace hub.
 * Pure CSS 3D transforms — a slow auto-rotating ring, each node
 * counter-rotated so it always faces the viewer ("billboarding").
 */
export default function ProjectGraph3D({ projects, orgName }: { projects: ProjectOut[]; orgName?: string }) {
  const navigate = useNavigate()
  const [angle, setAngle] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragState = useRef({ startX: 0, startAngle: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    let last = performance.now()
    function tick(now: number) {
      const dt = now - last
      last = now
      if (!dragging) {
        setAngle((a) => a + dt * 0.012)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [dragging])

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true)
    dragState.current = { startX: e.clientX, startAngle: angle }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragState.current.startX
    setAngle(dragState.current.startAngle + dx * 0.4)
  }
  function onPointerUp() {
    setDragging(false)
  }

  const radius = projects.length <= 3 ? 150 : projects.length <= 6 ? 190 : 230
  const nodes = useMemo(
    () =>
      projects.map((p, i) => {
        const theta = (360 / Math.max(projects.length, 1)) * i
        const rad = (theta * Math.PI) / 180
        const x = Math.sin(rad) * radius
        const z = Math.cos(rad) * radius
        const totalBugs =
          p.bug_counts.open + p.bug_counts.in_progress + p.bug_counts.ready_for_testing + p.bug_counts.resolved + p.bug_counts.closed
        return { project: p, x, z, totalBugs }
      }),
    [projects, radius]
  )

  if (projects.length === 0) return null

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 40%, rgba(108,92,231,0.10), transparent 65%), var(--bg-card)',
      }}
    >
      <div className="flex items-center justify-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <h3 style={{ fontSize: 15 }}>Workspace map</h3>
          <p className="text-sm text-muted mt-4">Every project this organization holds — drag to rotate.</p>
        </div>
        <span className="badge">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          position: 'relative',
          height: 320,
          perspective: 1100,
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateX(-14deg) rotateY(${angle}deg)`,
          }}
        >
          {/* central hub */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) rotateY(${-angle}deg)`,
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-bright), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 50px rgba(108,92,231,0.55), 0 0 0 1px rgba(255,255,255,0.08)',
              color: 'white',
              fontWeight: 700,
              fontSize: 12,
              textAlign: 'center',
              padding: 6,
            }}
          >
            {orgName ? orgName.slice(0, 14) : 'Workspace'}
          </div>

          {/* orbit ring guide */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: radius * 2,
              height: radius * 2,
              marginLeft: -radius,
              marginTop: -radius,
              borderRadius: '50%',
              border: '1px dashed rgba(108,92,231,0.25)',
              transform: 'rotateX(90deg)',
            }}
          />

          {nodes.map(({ project, x, z, totalBugs }) => {
            const depthScale = 0.72 + ((z + radius) / (radius * 2)) * 0.5
            const openCount = project.bug_counts.open
            return (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate3d(${x}px, 0, ${z}px) translate(-50%, -50%) rotateY(${-angle}deg) scale(${depthScale})`,
                  width: 128,
                  padding: '12px 12px',
                  borderRadius: 14,
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${openCount > 0 ? 'rgba(255,92,114,0.4)' : 'var(--border-hover)'}`,
                  boxShadow: openCount > 0 ? '0 0 24px rgba(255,92,114,0.18)' : '0 8px 24px rgba(0,0,0,0.35)',
                  cursor: 'pointer',
                  zIndex: Math.round(z + radius),
                }}
              >
                <div className="flex items-center gap-6">
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 7,
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-bright)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Folder size={12} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.name}
                  </span>
                </div>
                <div className="flex items-center gap-6 mt-8" style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{totalBugs} bugs</span>
                  {openCount > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}>· {openCount} open</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
