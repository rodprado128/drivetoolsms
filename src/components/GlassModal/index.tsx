import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

interface GlassModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: number
}

export function GlassModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 520,
}: GlassModalProps) {
  // Bloqueia scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.40)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />

          {/* Painel */}
          <motion.div
            key="panel"
            className="glass"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.32 }}
            style={{
              position: 'fixed',
              zIndex: 201,
              width: `min(${maxWidth}px, calc(100vw - 32px))`,
              maxHeight: 'calc(100dvh - 80px)',
              overflowY: 'auto',
              borderRadius: 'var(--radius-card)',
              // Centralizado em desktop, bottom-sheet em mobile via media query
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {title && (
              <div
                className="flex items-center justify-between"
                style={{
                  padding: '20px 24px 0',
                  marginBottom: '16px',
                }}
              >
                <h2
                  className="font-semibold"
                  style={{ fontSize: '18px', color: 'var(--color-sys-label)', margin: 0 }}
                >
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="glass-sm flex items-center justify-center"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-sys-label-secondary)',
                  }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
            <div style={{ padding: title ? '0 24px 24px' : '24px' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
