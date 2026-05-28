import { motion } from 'framer-motion'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeMode } from '../../context/ThemeContext'

const MODES: ThemeMode[] = ['light', 'dark', 'auto']

const icons: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
}

const labels: Record<ThemeMode, string> = {
  light: 'Claro',
  dark: 'Escuro',
  auto: 'Auto',
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    const idx = MODES.indexOf(theme)
    setTheme(MODES[(idx + 1) % MODES.length])
  }

  const Icon = icons[theme]

  return (
    <motion.button
      type="button"
      onClick={cycle}
      className="glass-sm inline-flex items-center gap-2 px-3"
      style={{
        height: '36px',
        borderRadius: 'var(--radius-pill)',
        cursor: 'pointer',
        color: 'var(--color-sys-label)',
        fontSize: '13px',
        fontWeight: 500,
      }}
      whileHover={{ scale: 1.03, filter: 'brightness(1.15)' }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2, ease: IOS_EASE }}
      title={`Tema: ${labels[theme]}`}
      aria-label={`Alternar tema (atual: ${labels[theme]})`}
    >
      <Icon size={15} strokeWidth={2} />
      <span>{labels[theme]}</span>
    </motion.button>
  )
}
