import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface GlassButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  className?: string
  fullWidth?: boolean
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const

const sizeStyles: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 14px', fontSize: '13px', height: '34px' },
  md: { padding: '0 20px', fontSize: '15px', height: '42px' },
  lg: { padding: '0 26px', fontSize: '16px', height: '50px' },
}

// Botões também são glass: gradiente com alpha + backdrop blur
function getVariantStyle(variant: ButtonVariant): CSSProperties {
  if (variant === 'primary') {
    return {
      background:
        'linear-gradient(135deg, rgba(10,132,255,0.70) 0%, rgba(10,132,255,0.40) 100%)',
      color: '#FFFFFF',
      border: '1px solid rgba(10,132,255,0.50)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(10,132,255,0.30)',
    }
  }
  if (variant === 'destructive') {
    return {
      background:
        'linear-gradient(135deg, rgba(255,69,58,0.70) 0%, rgba(255,69,58,0.40) 100%)',
      color: '#FFFFFF',
      border: '1px solid rgba(255,69,58,0.50)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 16px rgba(255,69,58,0.30)',
    }
  }
  // secondary
  return {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--color-sys-label)',
    border: '1px solid rgba(255,255,255,0.14)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.16), 0 4px 16px rgba(0,0,0,0.25)',
  }
}

function getHoverShadow(variant: ButtonVariant): string {
  if (variant === 'primary') {
    return 'inset 0 1px 0 rgba(255,255,255,0.30), 0 8px 28px rgba(10,132,255,0.45)'
  }
  if (variant === 'destructive') {
    return 'inset 0 1px 0 rgba(255,255,255,0.28), 0 8px 28px rgba(255,69,58,0.45)'
  }
  return 'inset 0 1px 0 rgba(255,255,255,0.20), 0 8px 24px rgba(0,0,0,0.40)'
}

export function GlassButton({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
}: GlassButtonProps) {
  const s = sizeStyles[size]
  const variantStyle = getVariantStyle(variant)
  const isActive = !disabled && !loading

  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center gap-2 font-semibold select-none ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{
        borderRadius: 'var(--radius-button)',
        padding: s.padding,
        fontSize: s.fontSize,
        height: s.height,
        cursor: isActive ? 'pointer' : 'not-allowed',
        opacity: disabled ? 0.45 : 1,
        letterSpacing: '-0.01em',
        ...variantStyle,
      }}
      whileHover={
        isActive
          ? {
              scale: 1.03,
              filter: 'brightness(1.15)',
              boxShadow: getHoverShadow(variant),
              transition: { duration: 0.25, ease: IOS_EASE },
            }
          : undefined
      }
      whileTap={
        isActive
          ? {
              scale: 0.95,
              transition: { duration: 0.1, ease: IOS_EASE },
            }
          : undefined
      }
      transition={{ duration: 0.25, ease: IOS_EASE }}
    >
      {loading && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ animation: 'spin 0.8s linear infinite' }}
        >
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="28"
            strokeDashoffset="10"
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </motion.button>
  )
}
