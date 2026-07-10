import { useRef, useState, ReactNode, CSSProperties } from 'react'

interface TiltCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  glow?: boolean
}

export default function TiltCard({ children, className = '', style, onClick, glow = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)')
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rotateY = (px - 0.5) * 10
    const rotateX = (0.5 - py) * 10
    setTransform(`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`)
    setGlowPos({ x: px * 100, y: py * 100 })
  }

  function handleMouseLeave() {
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)')
  }

  return (
    <div
      ref={ref}
      className={`card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        ...style,
        transform,
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease',
        transformStyle: 'preserve-3d',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {glow && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(108,92,231,0.13), transparent 55%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
