import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, RefreshCw, MoveRight, CheckSquare, Square } from 'lucide-react'
import {
  org_loadState,
  org_saveState,
  org_resetState,
  org_scanRoot,
  org_getOrCreateFolder,
  org_moveFiles,
} from '../../graph/organizer'
import type { OrgScanState, OrgItem, OrgCategory } from '../../graph/types'
import { GlassCard } from '../../components/GlassCard'
import { GlassButton } from '../../components/GlassButton'
import { GlassModal } from '../../components/GlassModal'
import { useToast } from '../../hooks/useToast'
import { formatBytes } from '../../lib/format'

type Phase = 'idle' | 'scanning' | 'complete' | 'moving'

const CATEGORIES: OrgCategory[] = ['Imagens', 'Documentos', 'Vídeos', 'Áudio', 'Código', 'Outros']

const CATEGORY_COLORS: Record<OrgCategory, string> = {
  Imagens: '#0A84FF',
  Documentos: '#30D158',
  Vídeos: '#BF5AF2',
  Áudio: '#FF9F0A',
  Código: '#64D2FF',
  Outros: '#8E8E93',
}

export function OrganizerPage() {
  const { addToast: showToast } = useToast()
  // Start em 'idle' para mostrar a welcome card imediatamente. Load do state
  // salvo roda em background e só muda a UI se encontrar scan concluído.
  const [phase, setPhase] = useState<Phase>('idle')
  const [scanState, setScanState] = useState<OrgScanState | null>(null)
  const [activeCategory, setActiveCategory] = useState<OrgCategory | 'Todos'>('Todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [moveProgress, setMoveProgress] = useState<{ done: number; total: number } | null>(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    org_loadState()
      .then(state => {
        if (cancelled || !state) return
        setScanState(state)
        if (state.isComplete) setPhase('complete')
      })
      .catch(err => {
        // Erros no load do state são silenciados: mantém estado idle, só loga.
        if (!cancelled) console.error('[Organizer] falha ao carregar state:', err)
      })
    return () => { cancelled = true }
  }, [])

  async function runScan() {
    scanningRef.current = true
    setPhase('scanning')
    setSelected(new Set())

    let allItems: OrgItem[] = []
    let nextLink: string | undefined

    const freshState: OrgScanState = {
      version: 1,
      scannedAt: new Date().toISOString(),
      items: [],
      isComplete: false,
    }
    setScanState(freshState)

    try {
      do {
        if (!scanningRef.current) break
        const result = await org_scanRoot(nextLink)
        allItems = [...allItems, ...result.items]
        nextLink = result.nextLink

        const partial: OrgScanState = { ...freshState, items: allItems }
        setScanState(partial)
        await org_saveState(partial)
      } while (nextLink)

      if (!scanningRef.current) {
        setPhase('idle')
        return
      }

      const completed: OrgScanState = {
        ...freshState,
        items: allItems,
        isComplete: true,
      }
      setScanState(completed)
      await org_saveState(completed)
      setPhase('complete')
      showToast(`Scan concluído. ${allItems.length} arquivos encontrados na raiz.`, 'success')
    } catch {
      scanningRef.current = false
      setPhase('idle')
      showToast('Erro durante o scan. Tente novamente.', 'error')
    }
  }

  async function handleOrganize() {
    setConfirmOpen(false)
    setPhase('moving')

    const items = scanState?.items ?? []
    const toMove = items.filter(item => selected.has(item.id))

    // Agrupa por categoria
    const byCategory = new Map<OrgCategory, OrgItem[]>()
    for (const item of toMove) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, [])
      byCategory.get(item.category)!.push(item)
    }

    const total = toMove.length
    let done = 0
    setMoveProgress({ done: 0, total })

    try {
      for (const [category, categoryItems] of byCategory) {
        const folderId = await org_getOrCreateFolder(category)
        await org_moveFiles(
          categoryItems.map(i => i.id),
          folderId,
          (batchDone) => {
            done = done + 1
            setMoveProgress({ done, total })
            return batchDone
          }
        )
      }

      await org_resetState()
      setScanState(null)
      setSelected(new Set())
      setMoveProgress(null)
      setPhase('idle')
      showToast(`${total} arquivos organizados com sucesso.`, 'success')
    } catch {
      setMoveProgress(null)
      setPhase('complete')
      showToast('Erro ao mover alguns arquivos.', 'error')
    }
  }

  async function handleReset() {
    scanningRef.current = false
    try { await org_resetState() } catch { /* silencia */ }
    setScanState(null)
    setSelected(new Set())
    setPhase('idle')
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(items: OrgItem[]) {
    const ids = items.map(i => i.id)
    const allSelected = ids.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else ids.forEach(id => next.add(id))
      return next
    })
  }

  const allItems = scanState?.items ?? []
  const visibleItems = activeCategory === 'Todos'
    ? allItems
    : allItems.filter(item => item.category === activeCategory)

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = allItems.filter(i => i.category === cat).length
    return acc
  }, {} as Record<OrgCategory, number>)

  const selectedItems = allItems.filter(i => selected.has(i.id))
  const selectedByCategory = selectedItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1
    return acc
  }, {} as Partial<Record<OrgCategory, number>>)

  // ===== SCANNING =====
  if (phase === 'scanning') {
    return (
      <div>
        <div style={{ marginBottom: '28px' }}>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Drive Organizer
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Escaneando arquivos na raiz do OneDrive...
          </p>
        </div>

        <GlassCard style={{ padding: '40px', maxWidth: '560px' }}>
          <div className="flex flex-col items-center gap-6 text-center">
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '3px solid rgba(48,209,88,0.20)',
              borderTopColor: '#30D158', animation: 'spin 0.9s linear infinite',
            }} />
            <div>
              <p className="font-bold" style={{ fontSize: '32px', color: 'var(--color-sys-label)', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
                {(scanState?.items.length ?? 0).toLocaleString('pt-BR')}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
                arquivos encontrados
              </p>
            </div>
            <GlassButton variant="secondary" size="md" onClick={() => { scanningRef.current = false }}>
              Cancelar
            </GlassButton>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ===== MOVING =====
  if (phase === 'moving') {
    const progress = moveProgress ? (moveProgress.done / moveProgress.total) * 100 : 0
    return (
      <div>
        <div style={{ marginBottom: '28px' }}>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Drive Organizer
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Movendo arquivos para as pastas de destino...
          </p>
        </div>

        <GlassCard style={{ padding: '40px', maxWidth: '560px' }}>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: '14px', color: 'var(--color-sys-label-secondary)' }}>
                {moveProgress?.done ?? 0} de {moveProgress?.total ?? 0} arquivos
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#30D158' }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(120,120,128,0.15)', overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #30D158, #0A84FF)' }}
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
                background: 'linear-gradient(145deg, rgba(48,209,88,0.22), rgba(48,209,88,0.08))',
                border: '1px solid rgba(48,209,88,0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 32px rgba(48,209,88,0.18)',
              }}
            >
              <FolderOpen size={56} color="#30D158" strokeWidth={1.5} />
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
                Drive Organizer
              </h1>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-sys-label-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Categorize e mova arquivos soltos na raiz do seu OneDrive
              </p>
            </div>

            <GlassButton variant="primary" size="lg" fullWidth onClick={runScan}>
              <FolderOpen size={16} />
              Escanear raiz
            </GlassButton>

            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-sys-label-tertiary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Imagens, Documentos, Vídeos, Áudio, Código e Outros
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ===== COMPLETE =====
  const allVisible = visibleItems.every(i => selected.has(i.id))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
            Drive Organizer
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            {allItems.length} arquivos encontrados na raiz
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" onClick={handleReset}>
          <RefreshCw size={14} />
          Novo scan
        </GlassButton>
      </div>

      {/* Tabs de categoria */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap', marginBottom: '20px' }}>
        {(['Todos', ...CATEGORIES] as Array<OrgCategory | 'Todos'>).map(cat => {
          const count = cat === 'Todos' ? allItems.length : categoryCounts[cat]
          const isActive = activeCategory === cat
          const color = cat === 'Todos' ? '#8E8E93' : CATEGORY_COLORS[cat]
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
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
              {cat} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Barra de ações */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: '14px' }}>
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => toggleAll(visibleItems)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-sys-label-secondary)', fontSize: '13px' }}
        >
          {allVisible && visibleItems.length > 0
            ? <CheckSquare size={16} color="#0A84FF" />
            : <Square size={16} />
          }
          {allVisible && visibleItems.length > 0 ? 'Desselecionar todos' : 'Selecionar todos'}
        </button>

        {selected.size > 0 && (
          <GlassButton variant="primary" size="md" onClick={() => setConfirmOpen(true)}>
            <MoveRight size={15} />
            Organizar selecionados ({selected.size})
          </GlassButton>
        )}
      </div>

      {/* Lista de arquivos */}
      {visibleItems.length === 0 ? (
        <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--color-sys-label-secondary)' }}>
            {allItems.length === 0
              ? 'Nenhum arquivo solto encontrado na raiz. Seu OneDrive já está organizado.'
              : 'Nenhum arquivo nesta categoria.'
            }
          </p>
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: '0', overflow: 'hidden' }}>
          {visibleItems.map((item, idx) => {
            const isSelected = selected.has(item.id)
            const color = CATEGORY_COLORS[item.category]
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                onClick={() => toggleSelect(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderBottom: idx < visibleItems.length - 1 ? '1px solid var(--color-sys-separator)' : 'none',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(10,132,255,0.06)' : 'transparent',
                  transition: 'background 150ms ease',
                }}
              >
                {/* Checkbox */}
                <div style={{ flexShrink: 0 }}>
                  {isSelected
                    ? <CheckSquare size={16} color="#0A84FF" />
                    : <Square size={16} color="var(--color-sys-label-tertiary)" />
                  }
                </div>

                {/* Ícone de categoria */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: `${color}18`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '16px' }}>
                    {item.category === 'Imagens' ? '🖼' :
                     item.category === 'Documentos' ? '📄' :
                     item.category === 'Vídeos' ? '🎬' :
                     item.category === 'Áudio' ? '🎵' :
                     item.category === 'Código' ? '💻' : '📁'}
                  </span>
                </div>

                {/* Nome e meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-sys-label)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
                    {formatBytes(item.size)} · {new Date(item.lastModifiedDateTime).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Badge de categoria */}
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)', flexShrink: 0,
                  background: `${color}18`, color,
                }}>
                  {item.category}
                </span>
              </motion.div>
            )
          })}
        </GlassCard>
      )}

      {/* Modal de confirmação */}
      <GlassModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirmar organização">
        <div className="flex flex-col gap-5">
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0, lineHeight: 1.55 }}>
            Os <strong style={{ color: 'var(--color-sys-label)' }}>{selected.size} arquivos</strong> selecionados serão movidos para:
          </p>
          <div className="flex flex-col gap-2">
            {Object.entries(selectedByCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between" style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(120,120,128,0.08)' }}>
                <span style={{ fontSize: '14px', color: 'var(--color-sys-label)', fontWeight: 500 }}>
                  📁 {cat}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)' }}>
                  {count} arquivo{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-sys-label-tertiary)', margin: 0 }}>
            Pastas serão criadas automaticamente se não existirem.
          </p>
          <div className="flex gap-3">
            <GlassButton variant="secondary" size="md" fullWidth onClick={() => setConfirmOpen(false)}>
              Cancelar
            </GlassButton>
            <GlassButton variant="primary" size="md" fullWidth onClick={handleOrganize}>
              <MoveRight size={15} />
              Organizar
            </GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Progress de movimentação inline */}
      <AnimatePresence>
        {moveProgress && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-sm"
            style={{ borderRadius: '12px', padding: '12px 16px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid rgba(48,209,88,0.20)', borderTopColor: '#30D158',
              animation: 'spin 0.8s linear infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)' }}>
              Movendo {moveProgress.done} de {moveProgress.total} arquivos...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
