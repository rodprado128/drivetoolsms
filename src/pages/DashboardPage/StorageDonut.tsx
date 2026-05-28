import { motion } from 'framer-motion'
import { GlassCard } from '../../components/GlassCard'
import type { StorageQuota } from '../../graph/types'
import { formatBytes } from '../../lib/format'

interface StorageDonutProps {
  quota: StorageQuota | null
  loading: boolean
}

interface Segment {
  label: string
  value: number
  color: string
}

function DonutChart({ segments, total }: { segments: Segment[]; total: number }) {
  const SIZE = 160
  const STROKE = 18
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const cx = SIZE / 2
  const cy = SIZE / 2

  let offset = 0
  const svgSegments = segments.map(seg => {
    const frac = total > 0 ? seg.value / total : 0
    const len = frac * CIRC
    const dashoffset = CIRC - offset
    const result = { ...seg, len, dashoffset, frac }
    offset += len
    return result
  })

  const usedBytes = segments.reduce((acc, s) => acc + s.value, 0)
  const freeBytes = Math.max(0, total - usedBytes)
  const pctUsed = total > 0 ? Math.round((usedBytes / total) * 100) : 0

  return (
    <div className="flex items-center gap-8">
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          {/* Trilho */}
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke="rgba(120,120,128,0.12)"
            strokeWidth={STROKE}
          />
          {/* Segmentos */}
          {svgSegments.map((seg, i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${seg.len} ${CIRC - seg.len}`}
              strokeDashoffset={seg.dashoffset}
              initial={{ strokeDasharray: `0 ${CIRC}` }}
              animate={{ strokeDasharray: `${seg.len} ${CIRC - seg.len}` }}
              transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1], delay: i * 0.1 }}
            />
          ))}
        </svg>
        {/* Centro */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            className="font-bold"
            style={{ fontSize: '26px', letterSpacing: '-0.03em', color: 'var(--color-sys-label)', lineHeight: 1 }}
          >
            {pctUsed}%
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-sys-label-secondary)', marginTop: '2px' }}>
            usado
          </span>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-col gap-3" style={{ flex: 1 }}>
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)' }}>{seg.label}</span>
            </div>
            <span className="font-semibold" style={{ fontSize: '13px', color: 'var(--color-sys-label)' }}>
              {formatBytes(seg.value)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(120,120,128,0.22)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)' }}>Livre</span>
          </div>
          <span className="font-semibold" style={{ fontSize: '13px', color: 'var(--color-sys-label)' }}>
            {formatBytes(freeBytes)}
          </span>
        </div>
        <div
          style={{
            marginTop: '4px',
            paddingTop: '10px',
            borderTop: '1px solid var(--color-sys-separator)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-sys-label-tertiary)' }}>
            Total: {formatBytes(total)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function StorageDonut({ quota, loading }: StorageDonutProps) {
  const segments: Segment[] = quota
    ? [
        { label: 'Arquivos', value: Math.max(0, quota.used - quota.deleted), color: '#0A84FF' },
        { label: 'Lixeira', value: quota.deleted, color: '#FF9F0A' },
      ]
    : []

  return (
    <GlassCard style={{ padding: '24px' }}>
      <h2
        className="font-semibold"
        style={{ fontSize: '17px', color: 'var(--color-sys-label)', margin: '0 0 20px', letterSpacing: '-0.02em' }}
      >
        Armazenamento
      </h2>

      {loading ? (
        <div className="flex items-center justify-center" style={{ height: '160px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '3px solid rgba(10,132,255,0.20)',
              borderTopColor: '#0A84FF',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      ) : quota ? (
        <DonutChart segments={segments} total={quota.total} />
      ) : (
        <p style={{ color: 'var(--color-sys-label-secondary)', fontSize: '14px' }}>
          Não foi possível carregar os dados de armazenamento.
        </p>
      )}
    </GlassCard>
  )
}
