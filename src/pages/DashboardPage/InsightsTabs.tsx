import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, ExternalLink, FileText, Image, Film, Music, Archive } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GlassCard } from '../../components/GlassCard'
import { dash_trashFiles } from '../../graph/dashboard'
import { useToast } from '../../hooks/useToast'
import { formatBytes, formatDate } from '../../lib/format'
import type { InsightFile } from '../../graph/types'

type TabKey = 'heavy' | 'old' | 'inactive'

interface Tab {
  key: TabKey
  label: string
}

const tabs: Tab[] = [
  { key: 'heavy', label: 'Mais pesados' },
  { key: 'old', label: 'Antigos e pesados' },
  { key: 'inactive', label: 'Não acessados' },
]

function getMimeIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return Archive
  return FileText
}

interface FileItemProps {
  file: InsightFile
  onRemove: (id: string) => void
}

function FileItem({ file, onRemove }: FileItemProps) {
  const [hovered, setHovered] = useState(false)
  const [trashing, setTrashing] = useState(false)
  const { addToast } = useToast()
  const Icon = getMimeIcon(file.mimeType)

  const handleTrash = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setTrashing(true)
    try {
      await dash_trashFiles([file.id])
      addToast(`"${file.name}" movido para a lixeira`, 'success')
      onRemove(file.id)
    } catch {
      addToast('Não foi possível mover o arquivo', 'error')
      setTrashing(false)
    }
  }

  return (
    <motion.div
      layout
      exit={{ opacity: 0, height: 0, scale: 0.96, x: 16, marginBottom: 0 }}
      transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--color-sys-separator)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'rgba(120,120,128,0.10)',
          flexShrink: 0,
        }}
      >
        <Icon size={17} style={{ color: 'var(--color-sys-label-secondary)' }} strokeWidth={1.8} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          className="font-medium"
          style={{
            fontSize: '13px',
            color: 'var(--color-sys-label)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {file.name}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-sys-label-secondary)', margin: '2px 0 0' }}>
          {formatBytes(file.size)} &middot; {formatDate(file.lastModifiedDateTime)}
        </p>
      </div>

      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        <a
          href={file.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir no OneDrive"
          style={{ color: 'var(--color-sys-label-tertiary)', display: 'flex' }}
        >
          <ExternalLink size={14} />
        </a>

        <AnimatePresence>
          {hovered && (
            <motion.button
              type="button"
              className="glass-sm flex items-center gap-1"
              initial={{ opacity: 0, scale: 0.85, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85, x: 8 }}
              transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.18 }}
              onClick={handleTrash}
              disabled={trashing}
              style={{
                borderRadius: 'var(--radius-pill)',
                padding: '4px 10px',
                border: 'none',
                cursor: trashing ? 'not-allowed' : 'pointer',
                color: '#FF453A',
                fontSize: '12px',
                fontWeight: '600',
                background: 'rgba(255,69,58,0.12)',
              }}
            >
              <Trash2 size={12} />
              Lixeira
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

interface InsightsTabsProps {
  heavyFiles: InsightFile[]
  oldFiles: InsightFile[]
  inactiveFiles: InsightFile[]
  loading: boolean
}

export function InsightsTabs({ heavyFiles, oldFiles, inactiveFiles, loading }: InsightsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('heavy')
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const handleRemove = useCallback((id: string) => {
    setRemoved(prev => new Set([...prev, id]))
  }, [])

  const filesByTab: Record<TabKey, InsightFile[]> = {
    heavy: heavyFiles.filter(f => !removed.has(f.id)),
    old: oldFiles.filter(f => !removed.has(f.id)),
    inactive: inactiveFiles.filter(f => !removed.has(f.id)),
  }

  const currentFiles = filesByTab[activeTab]

  return (
    <GlassCard style={{ padding: '24px' }}>
      <h2
        className="font-semibold"
        style={{ fontSize: '17px', color: 'var(--color-sys-label)', margin: '0 0 16px', letterSpacing: '-0.02em' }}
      >
        Insights
      </h2>

      {/* Tabs — pill desliza entre opções via layoutId */}
      <div
        className="flex gap-1"
        style={{
          marginBottom: '16px',
          padding: '4px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          width: 'fit-content',
        }}
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: 'relative',
                padding: '6px 14px',
                borderRadius: '9px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-sys-label)' : 'var(--color-sys-label-secondary)',
                transition: 'color 200ms ease',
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="insights-tab-pill"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9px',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    zIndex: 0,
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center" style={{ height: '120px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '3px solid rgba(10,132,255,0.20)',
              borderTopColor: '#0A84FF',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      ) : currentFiles.length === 0 ? (
        <p style={{ color: 'var(--color-sys-label-secondary)', fontSize: '14px', padding: '16px 0' }}>
          Nenhum arquivo encontrado nesta categoria.
        </p>
      ) : (
        <AnimatePresence initial={false}>
          {currentFiles.map(file => (
            <FileItem key={file.id} file={file} onRemove={handleRemove} />
          ))}
        </AnimatePresence>
      )}
    </GlassCard>
  )
}
