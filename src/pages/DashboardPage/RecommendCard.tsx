import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { GlassButton } from '../../components/GlassButton'
import { useToast } from '../../hooks/useToast'
import { formatBytes } from '../../lib/format'
import type { Recommendation } from '../../graph/types'

interface RecommendCardProps {
  recommendation: Recommendation
  onCleanupDone: () => void
}

export function RecommendCard({ recommendation, onCleanupDone }: RecommendCardProps) {
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const totalWaste = recommendation.trashSize + recommendation.duplicateWaste
  const description = recommendation.trashSize > 0
    ? `Libere ${formatBytes(recommendation.trashSize)} esvaziando a lixeira`
    : `${formatBytes(totalWaste)} podem ser recuperados`

  const handleCleanAll = async () => {
    setLoading(true)
    try {
      // Esvaziar lixeira via Graph requer listar e deletar permanentemente cada item.
      // Funcionalidade completa disponível no módulo Drive Clean (Sessão 2).
      addToast('Use o módulo Drive Clean para esvaziar a lixeira completamente', 'info')
      onCleanupDone()
    } catch {
      addToast('Erro ao executar limpeza', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="glass"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
      style={{
        borderRadius: 'var(--radius-card)',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(10,132,255,0.15) 0%, rgba(191,90,242,0.10) 100%)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '14px',
          background: 'rgba(10,132,255,0.20)',
          flexShrink: 0,
        }}
      >
        <Sparkles size={22} color="#0A84FF" strokeWidth={2} />
      </div>

      <div style={{ flex: 1 }}>
        <h3
          className="font-semibold"
          style={{ fontSize: '15px', color: 'var(--color-sys-label)', margin: '0 0 3px', letterSpacing: '-0.01em' }}
        >
          Recomendado para você
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
          {description}
        </p>
      </div>

      <GlassButton
        variant="primary"
        size="sm"
        loading={loading}
        onClick={handleCleanAll}
      >
        {formatBytes(totalWaste)} a limpar
      </GlassButton>
    </motion.div>
  )
}
