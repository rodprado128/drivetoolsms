import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  /** Força modo interativo. Por padrão, ativa automaticamente se houver onClick. */
  interactive?: boolean
  className?: string
}

// Easing Apple
const IOS_EASE = [0.32, 0.72, 0, 1] as const

export function GlassCard({
  children,
  interactive,
  className = '',
  style,
  onClick,
  ...rest
}: GlassCardProps) {
  // Auto-interativo quando recebe onClick
  const isInteractive = interactive ?? typeof onClick === 'function'

  return (
    <motion.div
      className={`glass ${className}`}
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-card)',
        cursor: isInteractive ? 'pointer' : undefined,
        ...style,
      }}
      whileHover={
        isInteractive
          ? {
              scale: 1.02,
              backgroundColor: 'rgba(255,255,255,0.09)',
              borderColor: 'rgba(255,255,255,0.20)',
              boxShadow:
                '0 16px 48px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.22)',
              transition: { duration: 0.3, ease: IOS_EASE },
            }
          : undefined
      }
      whileTap={
        isInteractive
          ? {
              scale: 0.97,
              filter: 'brightness(0.92)',
              transition: { duration: 0.12, ease: IOS_EASE },
            }
          : undefined
      }
      transition={{ duration: 0.3, ease: IOS_EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
