import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'

// 5 blobs do spec iOS 26 com opacities por tema
interface Blob {
  color: string
  width: number
  top?: string
  bottom?: string
  left?: string
  right?: string
  /** opacidade no tema dark */
  opacityDark: number
  /** opacidade no tema light (mais saturada, blobs ainda precisam "atravessar" o branco) */
  opacityLight: number
  blur: number
  duration: number
}

const blobs: Blob[] = [
  { color: '#0A84FF', width: 600, top: '-10%', left: '-5%', opacityDark: 0.35, opacityLight: 0.45, blur: 120, duration: 10 },
  { color: '#BF5AF2', width: 500, top: '20%', right: '-10%', opacityDark: 0.30, opacityLight: 0.40, blur: 100, duration: 12 },
  { color: '#64D2FF', width: 400, bottom: '10%', left: '20%', opacityDark: 0.25, opacityLight: 0.35, blur: 90, duration: 14 },
  { color: '#FF375F', width: 350, bottom: '-5%', right: '30%', opacityDark: 0.20, opacityLight: 0.30, blur: 80, duration: 9 },
  { color: '#30D158', width: 300, top: '50%', left: '40%', opacityDark: 0.15, opacityLight: 0.25, blur: 70, duration: 8 },
]

export function MeshBackground() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
            width: blob.width,
            height: blob.width,
            borderRadius: '50%',
            background: blob.color,
            opacity: isLight ? blob.opacityLight : blob.opacityDark,
            filter: `blur(${blob.blur}px)`,
            willChange: 'transform',
            transition: 'opacity 300ms ease',
          }}
          animate={{ y: [-30, 30] }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'linear',
          }}
        />
      ))}
    </div>
  )
}
