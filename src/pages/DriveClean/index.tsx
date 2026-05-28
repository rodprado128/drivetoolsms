import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, RefreshCw, Search } from 'lucide-react'
import {
  dc_loadState,
  dc_saveState,
  dc_scanBatch,
  dc_deleteFiles,
  dc_resetState,
  dc_computeGroups,
} from '../../graph/driveClean'
import type { DCScanState, DCDuplicateGroup } from '../../graph/types'
import { GlassCard } from '../../components/GlassCard'
import { GlassButton } from '../../components/GlassButton'
import { GlassModal } from '../../components/GlassModal'
import { useToast } from '../../hooks/useToast'
import { formatBytes } from '../../lib/format'
import { ScanProgress } from './ScanProgress'
import { DuplicateGroup } from './DuplicateGroup'

type Phase = 'idle' | 'scanning' | 'complete' | 'deleting'

const MIN_SIZE_OPTIONS = [
  { label: 'Todos', value: 0 },
  { label: '≥ 1 MB', value: 1 * 1024 * 1024 },
  { label: '≥ 10 MB', value: 10 * 1024 * 1024 },
  { label: '≥ 100 MB', value: 100 * 1024 * 1024 },
  { label: '≥ 1 GB', value: 1024 * 1024 * 1024 },
]

export function DriveCleanPage() {
  const { addToast: showToast } = useToast()
  // Renderiza a welcome card imediatamente. Se houver state salvo, o useEffect
  // atualiza a UI sem passar por uma tela em branco intermediária.
  const [phase, setPhase] = useState<Phase>('idle')
  const [scanState, setScanState] = useState<DCScanState | null>(null)
  const [groups, setGroups] = useState<DCDuplicateGroup[]>([])
  const [minSize, setMinSize] = useState(0)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(null)
  const scanningRef = useRef(false)

  // Ao montar, tenta carregar state existente em background sem bloquear a UI.
  // Erros aqui são silenciados (apenas log): o app mantém estado idle e usuário
  // pode iniciar um novo scan normalmente.
  useEffect(() => {
    let cancelled = false
    dc_loadState()
      .then(state => {
        if (cancelled || !state) return
        setScanState(state)
        if (state.phase === 'complete') {
          setGroups(dc_computeGroups(state))
          setPhase('complete')
        }
      })
      .catch(err => {
        if (!cancelled) console.error('[DriveClean] falha ao carregar state:', err)
      })
    return () => { cancelled = true }
  }, [])

  // Executa um batch do scan em loop até completar ou cancelar
  async function runScan(initialNextLink?: string) {
    scanningRef.current = true
    setPhase('scanning')

    let state: DCScanState = scanState ?? {
      version: 1,
      phase: 'scanning',
      nextLink: initialNextLink,
      scannedCount: 0,
      hashEntries: [],
      startedAt: new Date().toISOString(),
    }

    // Se reiniciando do zero, limpa entradas anteriores
    if (!initialNextLink) {
      state = {
        ...state,
        hashEntries: [],
        scannedCount: 0,
        startedAt: new Date().toISOString(),
        nextLink: undefined,
        phase: 'scanning',
      }
    }

    setScanState(state)

    try {
      while (scanningRef.current) {
        const { entries, nextLink, scannedRaw } = await dc_scanBatch(state.nextLink)

        state = {
          ...state,
          scannedCount: state.scannedCount + scannedRaw,
          hashEntries: [...state.hashEntries, ...entries],
          nextLink,
          phase: nextLink ? 'scanning' : 'complete',
          completedAt: !nextLink ? new Date().toISOString() : undefined,
        }

        setScanState({ ...state })

        // Salva após cada batch para permitir retomada
        await dc_saveState(state)

        if (!nextLink) {
          // Scan completo
          const computedGroups = dc_computeGroups(state)
          setGroups(computedGroups)
          setPhase('complete')
          scanningRef.current = false
          showToast(`Scan completo. ${computedGroups.length} grupos de duplicatas encontrados.`, 'success')
          return
        }
      }
      // Scan cancelado: mantém estado parcial
      setPhase('idle')
    } catch (err) {
      console.error('[DriveClean] erro durante o scan:', err)
      scanningRef.current = false
      setPhase('idle')
      showToast('Erro durante o scan. Tente novamente.', 'error')
    }
  }

  function handleStartScan() {
    setScanState(null)
    runScan()
  }

  function handleResumeScan() {
    runScan(scanState?.nextLink)
  }

  function handleCancelScan() {
    scanningRef.current = false
  }

  async function handleReset() {
    scanningRef.current = false
    try {
      await dc_resetState()
    } catch (err) {
      // 404 já é tratado dentro de dc_resetState. Loga o resto para inspeção,
      // sem bloquear o usuário de iniciar um novo scan local.
      console.error('[DriveClean] falha ao limpar state remoto:', err)
    }
    setScanState(null)
    setGroups([])
    setPhase('idle')
  }

  function handleToggleDelete(groupHash: string, fileId: string) {
    setGroups(prev =>
      prev.map(g => {
        if (g.hash !== groupHash) return g
        const isDeleting = g.toDelete.includes(fileId)
        // Impede que todos os arquivos do grupo sejam marcados para deletar
        if (isDeleting) {
          return { ...g, toDelete: g.toDelete.filter(id => id !== fileId) }
        }
        // Garante que pelo menos 1 arquivo fica marcado como "manter"
        const wouldDelete = [...g.toDelete, fileId]
        if (wouldDelete.length >= g.files.length) return g
        return { ...g, toDelete: wouldDelete }
      })
    )
  }

  async function handleConfirmDelete() {
    const toDeleteIds = groups.flatMap(g => g.toDelete)
    if (toDeleteIds.length === 0) return

    setDeleteModalOpen(false)
    setPhase('deleting')
    setDeleteProgress({ done: 0, total: toDeleteIds.length })

    try {
      await dc_deleteFiles(toDeleteIds, (done, total) => {
        setDeleteProgress({ done, total })
      })

      // Remove arquivos deletados do state e recalcula grupos
      const deletedSet = new Set(toDeleteIds)
      const newState: DCScanState = {
        ...scanState!,
        hashEntries: scanState!.hashEntries.filter(e => !deletedSet.has(e.id)),
      }
      await dc_saveState(newState)
      setScanState(newState)

      const newGroups = dc_computeGroups(newState)
      setGroups(newGroups)
      setPhase('complete')
      setDeleteProgress(null)
      showToast(`${toDeleteIds.length} arquivos deletados com sucesso.`, 'success')
    } catch (err) {
      console.error('[DriveClean] erro ao deletar arquivos:', err)
      setPhase('complete')
      setDeleteProgress(null)
      showToast('Erro ao deletar alguns arquivos.', 'error')
    }
  }

  // Filtra grupos pelo tamanho mínimo selecionado
  const filteredGroups = groups.filter(g => g.files[0].size >= minSize)
  const totalWasted = filteredGroups.reduce((acc, g) => acc + g.wastedBytes, 0)
  const totalToDelete = filteredGroups.flatMap(g => g.toDelete).length
  const totalToFree = filteredGroups.reduce((acc, g) => {
    const deletingSize = g.toDelete.reduce((s, id) => {
      const f = g.files.find(f => f.id === id)
      return s + (f?.size ?? 0)
    }, 0)
    return acc + deletingSize
  }, 0)

  const hasIncompleteState = scanState?.phase === 'scanning'

  // ===== FASE: SCANNING =====
  if (phase === 'scanning') {
    const dupeCount = (() => {
      const byHash = new Map<string, number>()
      for (const e of (scanState?.hashEntries ?? [])) {
        byHash.set(e.hash, (byHash.get(e.hash) ?? 0) + 1)
      }
      return [...byHash.values()].filter(c => c >= 2).length
    })()

    return (
      <div>
        <div style={{ marginBottom: '28px' }}>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
            Drive Clean
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            Detecta duplicatas usando quickXorHash
          </p>
        </div>
        <ScanProgress
          scannedCount={scanState?.scannedCount ?? 0}
          duplicatesFound={dupeCount}
          onCancel={handleCancelScan}
        />
      </div>
    )
  }

  // ===== FASE: IDLE =====
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
                background: 'linear-gradient(145deg, rgba(10,132,255,0.22), rgba(10,132,255,0.08))',
                border: '1px solid rgba(10,132,255,0.28)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 32px rgba(10,132,255,0.18)',
              }}
            >
              <Trash2 size={56} color="#0A84FF" strokeWidth={1.5} />
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
                Drive Clean
              </h1>
              <p
                style={{
                  fontSize: '15px',
                  color: 'var(--color-sys-label-secondary)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Encontre e remova arquivos duplicados usando quickXorHash
              </p>
            </div>

            {hasIncompleteState && (
              <div
                className="glass-sm"
                style={{
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  color: 'var(--color-sys-label-secondary)',
                }}
              >
                Scan anterior pausado em{' '}
                <strong style={{ color: 'var(--color-sys-label)' }}>
                  {scanState!.scannedCount.toLocaleString('pt-BR')}
                </strong>{' '}
                arquivos lidos
              </div>
            )}

            <div className="flex gap-3 w-full" style={{ marginTop: '8px' }}>
              {hasIncompleteState ? (
                <>
                  <GlassButton variant="primary" size="lg" fullWidth onClick={handleResumeScan}>
                    <RefreshCw size={16} />
                    Retomar scan
                  </GlassButton>
                  <GlassButton variant="secondary" size="lg" onClick={handleStartScan}>
                    <Search size={16} />
                    Novo scan
                  </GlassButton>
                </>
              ) : (
                <GlassButton variant="primary" size="lg" fullWidth onClick={handleStartScan}>
                  <Search size={16} />
                  Iniciar scan
                </GlassButton>
              )}
            </div>

            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-sys-label-tertiary)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Tempo estimado depende do tamanho do seu OneDrive
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ===== FASE: COMPLETE ou DELETING =====
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="font-bold" style={{ fontSize: '28px', color: 'var(--color-sys-label)', margin: '0 0 4px', letterSpacing: '-0.03em' }}>
            Drive Clean
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            {scanState?.completedAt
              ? `Scan em ${new Date(scanState.completedAt).toLocaleDateString('pt-BR')}`
              : 'Scan completo'
            }
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" onClick={handleReset}>
          <RefreshCw size={14} />
          Novo scan
        </GlassButton>
      </div>

      {/* Resumo — stat cards limpos no estilo iOS: número branco grande, label cinza */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'Grupos de duplicatas', value: filteredGroups.length.toLocaleString('pt-BR') },
          { label: 'Espaço desperdiçado', value: formatBytes(totalWasted) },
          { label: 'Arquivos escaneados', value: (scanState?.scannedCount ?? 0).toLocaleString('pt-BR') },
        ].map(stat => (
          <GlassCard key={stat.label} style={{ padding: '20px 22px' }}>
            <p
              style={{
                fontSize: '32px',
                color: '#FFFFFF',
                fontWeight: 700,
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {stat.value}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {stat.label}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: '16px' }}>
        {/* Filtro de tamanho — pill ativa desliza entre opções via layoutId */}
        <div className="flex items-center gap-1" style={{ flexWrap: 'wrap' }}>
          {MIN_SIZE_OPTIONS.map(opt => {
            const isActive = minSize === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMinSize(opt.value)}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-pill)',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer',
                  transition: 'color 200ms ease',
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="dc-filter-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'var(--radius-pill)',
                      background: 'rgba(10,132,255,0.20)',
                      border: '1px solid rgba(10,132,255,0.35)',
                      zIndex: 0,
                    }}
                  />
                )}
                <span style={{ position: 'relative', zIndex: 1 }}>{opt.label}</span>
              </button>
            )
          })}
        </div>

        {/* Botão de deletar */}
        {totalToDelete > 0 && (
          <GlassButton
            variant="destructive"
            size="md"
            onClick={() => setDeleteModalOpen(true)}
            disabled={phase === 'deleting'}
            loading={phase === 'deleting'}
          >
            <Trash2 size={15} />
            Deletar {totalToDelete} arquivos ({formatBytes(totalToFree)})
          </GlassButton>
        )}
      </div>

      {/* Progress de deleção */}
      <AnimatePresence>
        {deleteProgress && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-sm"
            style={{ borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                border: '2px solid rgba(10,132,255,0.20)',
                borderTopColor: '#0A84FF',
                animation: 'spin 0.8s linear infinite',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)' }}>
              Deletando {deleteProgress.done} de {deleteProgress.total} arquivos...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de grupos */}
      {filteredGroups.length === 0 ? (
        <GlassCard style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--color-sys-label-secondary)' }}>
            {groups.length === 0
              ? 'Nenhuma duplicata encontrada. Seu OneDrive está limpo.'
              : 'Nenhum grupo atende ao filtro de tamanho selecionado.'
            }
          </p>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredGroups.map(group => (
            <DuplicateGroup
              key={group.hash}
              group={group}
              onToggleDelete={handleToggleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal de confirmação de deleção */}
      <GlassModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirmar exclusão"
      >
        <div className="flex flex-col gap-5">
          <p style={{ fontSize: '15px', color: 'var(--color-sys-label-secondary)', margin: 0, lineHeight: 1.55 }}>
            Você está prestes a deletar <strong style={{ color: 'var(--color-sys-label)' }}>{totalToDelete} arquivos</strong> e liberar{' '}
            <strong style={{ color: '#30D158' }}>{formatBytes(totalToFree)}</strong> de espaço.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-sys-label-tertiary)', margin: 0 }}>
            Os arquivos vão para a lixeira do OneDrive e podem ser recuperados.
          </p>
          <div className="flex gap-3">
            <GlassButton variant="secondary" size="md" fullWidth onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </GlassButton>
            <GlassButton variant="destructive" size="md" fullWidth onClick={handleConfirmDelete}>
              <Trash2 size={15} />
              Deletar
            </GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  )
}
