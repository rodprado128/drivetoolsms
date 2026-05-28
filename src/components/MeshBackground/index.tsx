import { useEffect, useRef } from 'react'
import { useTheme } from '../../hooks/useTheme'

interface BlobState {
  color: string
  width: number
  top: number
  left: number
  opacity: number
  blur: number
  speedX: number
  speedY: number
  speedS: number
  ox: number
  oy: number
  os: number
  tx: number
  ty: number
  ts: number
  el: HTMLDivElement | null
}

export function MeshBackground() {
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const blobsRef = useRef<BlobState[]>([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const W = window.innerWidth
    const H = window.innerHeight

    const configs = [
      { color: '#0A84FF', width: 600, top: -0.1, left: -0.05, opacity: resolvedTheme === 'light' ? 0.45 : 0.55, blur: 120, speedX: 0.0004, speedY: 0.0005, speedS: 0.0003 },
      { color: '#BF5AF2', width: 500, top: 0.20, left: 0.75,  opacity: resolvedTheme === 'light' ? 0.40 : 0.50, blur: 100, speedX: 0.0003, speedY: 0.0004, speedS: 0.0002 },
      { color: '#64D2FF', width: 400, top: 0.65, left: 0.20,  opacity: resolvedTheme === 'light' ? 0.35 : 0.45, blur: 90,  speedX: 0.0005, speedY: 0.0003, speedS: 0.0004 },
      { color: '#FF375F', width: 350, top: 0.80, left: 0.55,  opacity: resolvedTheme === 'light' ? 0.30 : 0.40, blur: 80,  speedX: 0.0004, speedY: 0.0006, speedS: 0.0003 },
      { color: '#30D158', width: 300, top: 0.50, left: 0.40,  opacity: resolvedTheme === 'light' ? 0.25 : 0.35, blur: 70,  speedX: 0.0006, speedY: 0.0004, speedS: 0.0005 },
    ]

    container.innerHTML = ''
    blobsRef.current = configs.map((c, i) => {
      const el = document.createElement('div')
      el.style.cssText = `
        position:absolute;
        width:${c.width}px;
        height:${c.width}px;
        border-radius:50%;
        background:${c.color};
        opacity:${c.opacity};
        filter:blur(${c.blur}px);
        pointer-events:none;
        will-change:transform;
      `
      container.appendChild(el)
      const offset = i * 1000
      return { ...c, ox: offset, oy: offset + 500, os: offset + 250, tx: 0, ty: 0, ts: 0, el }
    })

    const AMP_X = 40
    const AMP_Y = 50
    const AMP_S = 0.06

    function tick(t: number) {
      blobsRef.current.forEach((b, i) => {
        if (!b.el) return
        const x = (W * configs[i].left) + Math.sin((t + b.ox) * b.speedX) * AMP_X
        const y = (H * configs[i].top)  + Math.sin((t + b.oy) * b.speedY) * AMP_Y
        const s = 1 + Math.sin((t + b.os) * b.speedS) * AMP_S
        b.el.style.transform = `translate(${x}px, ${y}px) scale(${s})`
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [resolvedTheme])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  )
}
