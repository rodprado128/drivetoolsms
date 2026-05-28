import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trash2, FolderOpen, Shield, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ModuleCard {
  to: string
  label: string
  description: string
  icon: LucideIcon
  accentColor: string
  glowColor: string
}

const cards: ModuleCard[] = [
  {
    to: '/clean',
    label: 'Drive Clean',
    description: 'Encontre e remova arquivos duplicados',
    icon: Trash2,
    accentColor: '#FF9F0A',
    glowColor: 'rgba(255, 159, 10, 0.20)',
  },
  {
    to: '/organizer',
    label: 'Organizer',
    description: 'Categorize arquivos soltos na raiz',
    icon: FolderOpen,
    accentColor: '#30D158',
    glowColor: 'rgba(48, 209, 88, 0.18)',
  },
  {
    to: '/exposed',
    label: 'Exposed',
    description: 'Audite permissões e links públicos',
    icon: Shield,
    accentColor: '#FF453A',
    glowColor: 'rgba(255, 69, 58, 0.18)',
  },
]

export function ModuleCards() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: '14px',
      }}
    >
      {cards.map(card => {
        const Icon = card.icon
        return (
          <motion.button
            key={card.to}
            type="button"
            className="glass text-left"
            onClick={() => navigate(card.to)}
            style={{
              borderRadius: 'var(--radius-card)',
              padding: '20px',
              cursor: 'pointer',
              background: 'none',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
            whileHover={{
              scale: 1.025,
              boxShadow: `0 16px 48px ${card.glowColor}, 0 4px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.20)`,
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.22 }}
          >
            {/* Glow de fundo no canto superior */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: card.accentColor,
                filter: 'blur(30px)',
                opacity: 0.25,
                pointerEvents: 'none',
              }}
            />

            <div
              className="flex items-center justify-center mb-4"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: `linear-gradient(145deg, ${card.accentColor}30, ${card.accentColor}12)`,
                border: `1px solid ${card.accentColor}25`,
                boxShadow: `inset 0 1px 0 ${card.accentColor}20`,
              }}
            >
              <Icon size={26} color={card.accentColor} strokeWidth={1.8} />
            </div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3
                  className="font-semibold"
                  style={{ fontSize: '15px', color: 'var(--color-sys-label)', margin: '0 0 5px', letterSpacing: '-0.02em' }}
                >
                  {card.label}
                </h3>
                <p
                  style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0, lineHeight: 1.45 }}
                >
                  {card.description}
                </p>
              </div>
              <ArrowRight
                size={14}
                style={{ color: 'var(--color-sys-label-tertiary)', flexShrink: 0, marginTop: '3px' }}
              />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
