import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { GlassButton } from '../GlassButton'

interface UserPopoverProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: RefObject<HTMLElement | null>
  displayName: string
  email: string
  initials: string
  onLogout: () => void
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const
const POPOVER_WIDTH = 280
const GAP = 8

export function UserPopover({
  isOpen,
  onClose,
  triggerRef,
  displayName,
  email,
  initials,
  onLogout,
}: UserPopoverProps) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)

  // Calcula posição via bounding rect do trigger. createPortal escapa do
  // overflow:hidden do header glass que estava cortando o dropdown anterior.
  useLayoutEffect(() => {
    if (!isOpen) return

    const updatePos = () => {
      const el = triggerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPos({
        top: rect.bottom + GAP,
        right: window.innerWidth - rect.right,
      })
    }

    updatePos()
    window.addEventListener('resize', updatePos)
    return () => window.removeEventListener('resize', updatePos)
  }, [isOpen, triggerRef])

  // ESC fecha
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Click fora (no trigger ou no próprio popover não conta)
  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      const popover = document.getElementById('user-popover-panel')
      if (popover?.contains(target)) return
      onClose()
    }
    // Pequeno delay para não capturar o mesmo clique que abriu
    const t = setTimeout(() => document.addEventListener('mousedown', onMouseDown), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [isOpen, onClose, triggerRef])

  return createPortal(
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          id="user-popover-panel"
          className="glass"
          role="menu"
          initial={{ opacity: 0, scale: 0.92, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: 0.22, ease: IOS_EASE }}
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            width: POPOVER_WIDTH,
            borderRadius: '18px',
            padding: '16px',
            zIndex: 1000,
            transformOrigin: 'top right',
          }}
        >
          {/* Cabeçalho: avatar + nome + email */}
          <div className="flex items-center gap-3" style={{ marginBottom: '14px' }}>
            <div
              className="flex items-center justify-center font-semibold"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(10,132,255,0.20)',
                color: '#0A84FF',
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                className="font-semibold"
                style={{
                  fontSize: '14px',
                  color: 'var(--color-sys-label)',
                  margin: '0 0 2px',
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={displayName}
              >
                {displayName}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--color-sys-label-secondary)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={email}
              >
                {email}
              </p>
            </div>
          </div>

          {/* Separador */}
          <div
            style={{
              height: '1px',
              background: 'var(--color-sys-separator)',
              margin: '0 -16px 14px',
            }}
          />

          {/* Ação de sair */}
          <GlassButton variant="destructive" size="md" fullWidth onClick={onLogout}>
            <LogOut size={15} />
            Sair
          </GlassButton>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
