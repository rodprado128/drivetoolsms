import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Trash2, ExternalLink } from 'lucide-react'
import type { DCDuplicateGroup, DCHashEntry } from '../../graph/types'
import { formatBytes, formatDate } from '../../lib/format'

interface DuplicateGroupProps {
  group: DCDuplicateGroup
  onToggleDelete: (groupHash: string, fileId: string) => void
}

function FileRow({
  file,
  isMarkedForDeletion,
  onToggle,
}: {
  file: DCHashEntry
  isMarkedForDeletion: boolean
  onToggle: () => void
}) {
  // Extrai o caminho da pasta (remove o prefixo "/drives/.../root:")
  const parentDisplay = file.parentPath
    ? file.parentPath.replace(/^\/drives\/[^/]+\/root:/, '') || '/'
    : '/'

  return (
    <div
      className="flex items-center gap-3"
      style={{
        padding: '10px 0',
        borderBottom: '1px solid var(--color-sys-separator)',
        opacity: isMarkedForDeletion ? 0.55 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Checkbox customizado */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '6px',
          border: isMarkedForDeletion
            ? '2px solid #FF453A'
            : '2px solid rgba(255,255,255,0.20)',
          background: isMarkedForDeletion ? 'rgba(255,69,58,0.15)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 200ms ease',
        }}
      >
        {isMarkedForDeletion && <Trash2 size={11} color="#FF453A" />}
        {!isMarkedForDeletion && <Check size={11} color="#30D158" strokeWidth={2.5} />}
      </button>

      {/* Info do arquivo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          className="font-medium"
          style={{
            fontSize: '13px',
            color: 'var(--color-sys-label)',
            margin: '0 0 2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textDecoration: isMarkedForDeletion ? 'line-through' : 'none',
          }}
        >
          {file.name}
        </p>
        <p
          style={{
            fontSize: '11px',
            color: 'var(--color-sys-label-tertiary)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {parentDisplay} — {formatDate(file.createdDateTime)}
        </p>
      </div>

      {/* Tamanho */}
      <span
        className="font-semibold"
        style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', flexShrink: 0 }}
      >
        {formatBytes(file.size)}
      </span>

      {/* Link externo */}
      <a
        href={file.webUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ color: 'var(--color-sys-label-tertiary)', flexShrink: 0 }}
      >
        <ExternalLink size={13} />
      </a>
    </div>
  )
}

export function DuplicateGroup({ group, onToggleDelete }: DuplicateGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const deleteCount = group.toDelete.length
  const keepCount = group.files.length - deleteCount

  return (
    <div
      className="glass"
      style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden' }}
    >
      {/* Header clicável */}
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-4"
        style={{
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {/* Ícone contador */}
        <div
          className="flex items-center justify-center font-bold flex-shrink-0"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255,159,10,0.15)',
            color: '#FF9F0A',
            fontSize: '14px',
          }}
        >
          {group.files.length}
        </div>

        {/* Info do grupo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="font-semibold"
            style={{ fontSize: '14px', color: 'var(--color-sys-label)', margin: '0 0 2px', letterSpacing: '-0.01em' }}
          >
            {group.files[0].name}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
            {group.files.length} cópias — <span style={{ color: '#FF9F0A', fontWeight: 600 }}>{formatBytes(group.wastedBytes)} desperdiçados</span>
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="font-medium"
            style={{ fontSize: '12px', color: 'var(--color-sys-label-tertiary)' }}
          >
            {keepCount} manter, {deleteCount} deletar
          </span>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          >
            <ChevronDown size={16} style={{ color: 'var(--color-sys-label-tertiary)' }} />
          </motion.div>
        </div>
      </button>

      {/* Lista de arquivos expansível */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 20px 16px',
                borderTop: '1px solid var(--color-sys-separator)',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  color: 'var(--color-sys-label-tertiary)',
                  margin: '12px 0 8px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Clique no ícone para alternar manter / deletar
              </p>
              {group.files.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  isMarkedForDeletion={group.toDelete.includes(file.id)}
                  onToggle={() => onToggleDelete(group.hash, file.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
