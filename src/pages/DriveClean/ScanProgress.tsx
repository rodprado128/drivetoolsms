import { motion } from 'framer-motion'
import { GlassCard } from '../../components/GlassCard'
import { GlassButton } from '../../components/GlassButton'

interface ScanProgressProps {
  scannedCount: number
  duplicatesFound: number
  onCancel: () => void
}

export function ScanProgress({ scannedCount, duplicatesFound, onCancel }: ScanProgressProps) {
  return (
    <GlassCard style={{ padding: '32px', maxWidth: '560px', margin: '0 auto' }}>
      <div className="flex flex-col items-center gap-6">
        {/* Ícone animado */}
        <div style={{ position: 'relative', width: '72px', height: '72px' }}>
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '3px solid rgba(10,132,255,0.15)',
              borderTopColor: '#0A84FF',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            style={{
              position: 'absolute',
              inset: '8px',
              borderRadius: '50%',
              border: '2px solid rgba(10,132,255,0.10)',
              borderTopColor: 'rgba(10,132,255,0.50)',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Texto */}
        <div className="text-center">
          <h2
            className="font-bold"
            style={{ fontSize: '22px', color: 'var(--color-sys-label)', margin: '0 0 8px', letterSpacing: '-0.03em' }}
          >
            Escaneando arquivos
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Comparando hashes para detectar duplicatas
          </p>
        </div>

        {/* Métricas */}
        <div
          className="glass-sm flex gap-8 justify-center"
          style={{
            borderRadius: '14px',
            padding: '16px 28px',
            width: '100%',
          }}
        >
          <div className="text-center">
            <p
              className="font-bold"
              style={{ fontSize: '26px', color: 'var(--color-sys-label)', margin: '0 0 2px', letterSpacing: '-0.03em' }}
            >
              {scannedCount.toLocaleString('pt-BR')}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
              arquivos lidos
            </p>
          </div>
          <div style={{ width: '1px', background: 'var(--color-sys-separator)' }} />
          <div className="text-center">
            <p
              className="font-bold"
              style={{ fontSize: '26px', color: '#FF9F0A', margin: '0 0 2px', letterSpacing: '-0.03em' }}
            >
              {duplicatesFound.toLocaleString('pt-BR')}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
              duplicatas encontradas
            </p>
          </div>
        </div>

        <GlassButton variant="secondary" size="sm" onClick={onCancel}>
          Cancelar scan
        </GlassButton>
      </div>
    </GlassCard>
  )
}
