import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, RefreshCw, Trash2, CheckSquare, Square } from 'lucide-react'
import {
  exp_saveState,
  exp_resetState,
  exp_scanBatch,
  exp_revokePermissionsBatch,
} from '../../graph/exposed'
import type { ExpScanState, ExpItem, ExpExposureType, ExpPermission } from '../../graph/types'
import { GlassCard } from '../../components/GlassCard'
import { GlassButton } from '../../components/GlassButton'
import { GlassModal } from '../../components/GlassModal'
import { useToast } from '../../hooks/useToast'

type Phase = 'idle' | 'scanning' | 'complete' | 'revoking'
type FilterType = 'Todos' | 'Anônimos' | 'Externos' | 'Internos'

const FILTER_MAP: Record<FilterType, ExpExposureType | null> = {
  Todos: null,
  Anônimos: 'anonymous',
  Externos: 'external',
  Internos: 'internal',
}

const RISK_COLORS: Record<ExpExposureType, string> = {
  anonymous: '#FF453A',
  external: '#FF9F0A',
  internal: '#0A84FF',
}

const RISK_LABELS: Record<ExpExposureType, string> = {
  anonymous: 'Anônimo',
  external: 'Externo',
  internal: 'Interno',
}

export function ExposedPage() {
  const { addToast: showToast } = useToast()
  // Sem chamadas Graph no mount: a página começa SEMPRE em 'idle' com a
  // welcome card visível. O scan e o load do state remoto só rodam após o
  // usuário clicar em "Iniciar auditoria" (ou em handleReset / runScan).
  const [phase, setPhase] = useState<Phase>('idle')
  const [scanState, setScanState] = useState<ExpScanState | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('Todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revokeProgress, setRevokeProgress] = useState<{ done: number; total: number } | null>(null)
  const scanningRef = useRef(false)

  async function runScan() {
    scanningRef.current = true
    setPhase('scanning')
    setSelected(new Set())

    let folderQueue = ['root']
    let nextLinks: Record<string, string> = {}
    let allItems: ExpItem[] = []
    let scannedFolders = 0

    const freshState: ExpScanState = {
      version: 1,
      scannedAt: new Date().toISOString(),
      items: [],
      folderQueue,
      nextLinks,
      isComplete: false,
    }
    setScanState(freshState)

    try {
      while (folderQueue.length > 0 && scanningRef.current) {
        const result = await exp_scanBatch(folderQueue, nextLinks)

        allItems = mergeItems(allItems, result.items)
        folderQueue = result.folderQueue
        nextLinks = result.nextLinks
        scannedFolders += result.scannedFolders

        const partial: ExpScanState = {
          ...freshState,
          items: allItems,
          folderQueue,
          nextLinks,
        }
        setScanState(partial)

        // Salva a cada 10 pastas para não sobrecarregar a API
        if (scannedFolders % 10 === 0) {
          await exp_saveState(partial)
        }
      }

      if (!scanningRef.current) {
        setPhase('idle')
        return
      }

      const completed: ExpScanState = {
        ...freshState,
        items: allItems,
        folderQueue: [],
        nextLinks: {},
        isComplete: true,
      }
      setScanState(completed)
      await exp_saveState(completed)
      setPhase('complete')

      const anonCount = allItems.filter(i => i.maxRisk === 3).length
      if (anonCount > 0) setActiveFilter('Anônimos')

      showToast(
        `Varredura concluída. ${allItems.length} arquivo${allItems.length !== 1 ? 's' : ''} com permissões expostas.`,
        'success'
      )
    } catch {
      scanningRef.current = false
      setPhase('idle')
      showToast('Erro durante a varredura. Tente novamente.', 'error')
    }
  }

  function mergeItems(existing: ExpItem[], incoming: ExpItem[]): ExpItem[] {
    const map = new Map(existing.map(i => [i.id, i]))
    for (const item of incoming) {
      map.set(item.id, item)
    }
    return Array.from(map.values()).sort((a, b) => b.maxRisk - a.maxRisk)
  }

  async function handleRevoke() {
    setConfirmOpen(false)
    setPhase('revoking')

    const items = scanState?.items ?? []
    const toRevoke: Array<{ itemId: string; permId: string }> = []

    for (const item of items) {
      for (const perm of item.permissions) {
        const key = `${item.id}::${perm.id}`
        if (selected.has(key)) {
          toRevoke.push({ itemId: item.id, permId: perm.id })
        }
      }
    }

    setRevokeProgress({ done: 0, total: toRevoke.length })

    try {
      await exp_revokePermissionsBatch(toRevoke, (done, total) => {
        setRevokeProgress({ done, total })
      })

      // Remove permissões revogadas da lista local
      const revokedKeys = new Set(toRevoke.map(r => `${r.itemId}::${r.permId}`))
      const updatedItems = (scanState?.items ?? [])
        .map(item => ({
          ...item,
          permissions: item.permissions.filter(p => !revokedKeys.has(`${item.id}::${p.id}`)),
        }))
        .filter(item => item.permissions.length > 0)
        .map(item => ({
          ...item,
          maxRisk: item.permissions.reduce(
            (max, p) => (p.riskScore > max ? p.riskScore : max),
            1 as 3 | 2 | 1
          ),
        }))

      const updatedState: ExpScanState = { ...scanState!, items: updatedItems }
      setScanState(updatedState)
      await exp_saveState(updatedState)

      setSelected(new Set())
      setRevokeProgress(null)
      setPhase('complete')
      showToast(`${toRevoke.length} permissão${toRevoke.length !== 1 ? 'ões' : ''} revogada${toRevoke.length !== 1 ? 's' : ''}.`, 'success')
    } catch {
      setRevokeProgress(null)
      setPhase('complete')
      showToast('Erro ao revogar algumas permissões.', 'error')
    }
  }

  async function handleReset() {
    scanningRef.current = false
    try { await exp_resetState() } catch { /* silencia */ }
    setScanState(null)
    setSelected(new Set())
    setActiveFilter('Todos')
    setPhase('idle')
  }

  function toggleSelectPerm(itemId: string, permId: string) {
    const key = `${itemId}::${permId}`
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allItems = scanState?.items ?? []
  const filterType = FILTER_MAP[activeFilter]
  const visibleItems = filterType === null
    ? allItems
    : allItems.filter(item => item.permissions.some(p => p.type === filterType))

  const anonCount = allItems.filter(i => i.maxRisk === 3).length
  const extCount = allItems.filter(i => i.maxRisk === 2).length
  const intCount = allItems.filter(i => i.maxRisk === 1).length

  const statCards = [
    { label: 'Total exposto', value: allItems.length.toString(), color: '#FF453A' },
    { label: 'Anônimos', value: anonCount.toString(), color: '#FF453A' },
    { label: 'Externos', value: extCount.toString(), color: '#FF9F0A' },
    { label: 'Internos', value: intCount.toString(), color: '#0A84FF' },
  ]

  // ===== SCANNING =====
  if (phase === 'scanning') {
    return (
      <div>
        <div style={{ marginBottom: '28px' }}>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Drive Exposed
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Varrendo todo o OneDrive em busca de permissões expostas...
          </p>
        </div>

        <GlassCard style={{ padding: '40px', maxWidth: '560px' }}>
          <div className="flex flex-col items-center gap-6 text-center">
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '3px solid rgba(255,69,58,0.20)', borderTopColor: '#FF453A',
              animation: 'spin 0.9s linear infinite',
            }} />
            <div className="flex gap-6">
              <div>
                <p className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 2px', letterSpacing: '-0.03em' }}>
                  {(scanState?.folderQueue.length ?? 0).toLocaleString('pt-BR')}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>pastas na fila</p>
              </div>
              <div>
                <p className="font-bold" style={{ fontSize: '28px', color: '#FF453A', margin: '0 0 2px', letterSpacing: '-0.03em' }}>
                  {(scanState?.items.length ?? 0).toLocaleString('pt-BR')}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>expostos</p>
              </div>
            </div>
            <GlassButton variant="secondary" size="md" onClick={() => { scanningRef.current = false }}>
              Cancelar
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ===== REVOKING =====
  if (phase === 'revoking') {
    const progress = revokeProgress ? (revokeProgress.done / revokeProgress.total) * 100 : 0
    return (
      <div>
        <div style={{ marginBottom: '28px' }}>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Drive Exposed
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Revogando permissões...
          </p>
        </div>

        <GlassCard style={{ padding: '40px', maxWidth: '560px' }}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '14px', color: 'var(--color-sys-label-secondary)' }}>
                {revokeProgress?.done ?? 0} de {revokeProgress?.total ?? 0} permissões
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#FF453A' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(120,120,128,0.15)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #FF453A, #FF9F0A)' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ===== IDLE =====
  if (phase === 'idle') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <GlassCard style={{ padding: '48px 40px', maxWidth: '520px', width: '100%' }}>
          <div className="flex flex-col items-center gap-5 text-center">
            <div
              className="flex items-center justify-center"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '28px',
                background: 'linear-gradient(145deg, rgba(255,159,10,0.22), rgba(255,159,10,0.08))',
                border: '1px solid rgba(255,159,10,0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 32px rgba(255,159,10,0.18)',
              }}
            >
              <Shield size={56} color="#FF9F0A" strokeWidth={1.5} />
            </div>

            <div>
              <h1
                className="font-bold"
                style={{
                  fontSize: '30px',
                  color: 'var(--color-sys-label)',
                  margin: '0 0 8px',
                  letterSpacing: '-0.03em',
                }}
              >
                Drive Exposed
              </h1>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-sys-label-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Audite permissões públicas e links de compartilhamento do seu OneDrive
              </p>
            </div>

            <GlassButton variant="primary" size="lg" fullWidth onClick={runScan}>
              <Shield size={16} />
              Iniciar auditoria
            </GlassButton>

            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-sys-label-tertiary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              A varredura recursiva pode demorar em drives grandes
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ===== COMPLETE =====
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
            Drive Exposed
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Varredura em {new Date(scanState!.scannedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" onClick={handleReset}>
          <RefreshCw size={14} />
          Nova varredura
        </GlassButton>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        {statCards.map(stat => (
          <GlassCard key={stat.label} style={{ padding: '18px 20px', borderRadius: '18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.color + 'D9', marginBottom: '8px' }} />
            <p className="font-bold" style={{ fontSize: '22px', color: '#FFFFFF', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
              {stat.value}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
              {stat.label}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', marginBottom: '14px' }}>
        {(['Todos', 'Anônimos', 'Externos', 'Internos'] as FilterType[]).map(filter => {
          const isActive = activeFilter === filter
          const type = FILTER_MAP[filter]
          const color = type ? RISK_COLORS[type] : '#8E8E93'
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className="glass-sm"
              style={{
                borderRadius: 'var(--radius-pill)',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? color : 'var(--color-sys-label-secondary)',
                border: isActive ? `1px solid ${color}66` : undefined,
                background: isActive ? `${color}18` : undefined,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              {filter}
            </button>
          )
        })}

        {selected.size > 0 && (
          <div style={{ marginLeft: 'auto' }}>
            <GlassButton
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 size={14} />
              Revogar selecionados ({selected.size})
            </GlassButton>
          </div>
        )}
      </div>

      {/* Lista de arquivos expostos */}
      {visibleItems.length === 0 ? (
        <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--color-sys-label-secondary)' }}>
            {allItems.length === 0
              ? 'Nenhum arquivo com permissões expostas encontrado.'
              : 'Nenhum arquivo neste filtro.'
            }
          </p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visibleItems.map(item => (
            <ExposedItemCard
              key={item.id}
              item={item}
              filterType={filterType}
              selected={selected}
              onToggle={toggleSelectPerm}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmação */}
      <GlassModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar revogação">
        <div className="flex flex-col gap-5">
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0, lineHeight: 1.55 }}>
            Você está prestes a revogar <strong style={{ color: 'var(--color-sys-label)' }}>{selected.size} permissão{selected.size !== 1 ? 'ões' : ''}</strong>.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-sys-label-tertiary)', margin: 0 }}>
            Esta ação é irreversível. As pessoas afetadas perderão acesso imediatamente.
          </p>
          <div className="flex gap-3">
            <GlassButton variant="secondary" size="md" fullWidth onClick={() => setConfirmOpen(false)}>
              Cancelar
            </GlassButton>
            <GlassButton variant="destructive" size="md" fullWidth onClick={handleRevoke}>
              <Trash2 size={15} />
              Revogar
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Progress inline */}
      <AnimatePresence>
        {revokeProgress && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-sm"
            style={{ borderRadius: '12px', padding: '12px 16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid rgba(255,69,58,0.20)', borderTopColor: '#FF453A',
              animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)' }}>
              Revogando {revokeProgress.done} de {revokeProgress.total} permissões...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Sub-componente para cada arquivo exposto
interface ExposedItemCardProps {
  item: ExpItem
  filterType: ExpExposureType | null
  selected: Set<string>
  onToggle: (itemId: string, permId: string) => void
}

function ExposedItemCard({ item, filterType, selected, onToggle }: ExposedItemCardProps) {
  const [expanded, setExpanded] = useState(false)

  const visiblePerms: ExpPermission[] = filterType === null
    ? item.permissions
    : item.permissions.filter(p => p.type === filterType)

  const maxColor = RISK_COLORS[item.permissions[0]?.type ?? 'internal']

  return (
    <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
      {/* Header do arquivo */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
          textAlign: 'left',
        }}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: `${maxColor}18`, border: `1px solid ${maxColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={16} color={maxColor} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-sys-label)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.name}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.path || '/'} · {item.permissions.length} permiss{item.permissions.length !== 1 ? 'ões' : 'ão'}
          </p>
        </div>

        {/* Badges de tipo */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          {item.maxRisk === 3 && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,69,58,0.18)', color: '#FF453A' }}>
              Anônimo
            </span>
          )}
          {item.permissions.some(p => p.type === 'external') && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(255,159,10,0.18)', color: '#FF9F0A' }}>
              Externo
            </span>
          )}
        </div>

        <span style={{ fontSize: '12px', color: 'var(--color-sys-label-tertiary)', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Permissões expandidas */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            {visiblePerms.map((perm) => {
              const key = `${item.id}::${perm.id}`
              const isSelected = selected.has(key)
              const color = RISK_COLORS[perm.type]

              return (
                <div
                  key={perm.id}
                  onClick={() => onToggle(item.id, perm.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 18px 10px 54px',
                    borderTop: '1px solid var(--color-sys-separator)',
                    background: isSelected ? 'rgba(255,69,58,0.06)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 150ms ease',
                  }}
                >
                  {isSelected
                    ? <CheckSquare size={15} color="#FF453A" style={{ flexShrink: 0 }} />
                    : <Square size={15} color="var(--color-sys-label-tertiary)" style={{ flexShrink: 0 }} />
                  }

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-sys-label)', margin: '0 0 1px' }}>
                      {perm.displayName ?? perm.link?.scope ?? 'Link público'}
                    </p>
                    {perm.email && (
                      <p style={{ fontSize: '11px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
                        {perm.email}
                      </p>
                    )}
                    {perm.link && (
                      <p style={{ fontSize: '11px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
                        Link · scope: {perm.link.scope}
                      </p>
                    )}
                  </div>

                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)', flexShrink: 0,
                    background: `${color}18`, color,
                  }}>
                    {RISK_LABELS[perm.type]}
                  </span>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
