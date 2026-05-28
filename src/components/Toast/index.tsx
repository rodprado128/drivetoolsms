import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToastContext, type ToastType } from '../../context/ToastContext'

const typeConfig: Record<ToastType, { icon: typeof CheckCircle; color: string }> = {
  success: { icon: CheckCircle, color: '#30D158' },
  error: { icon: XCircle, color: '#FF453A' },
  info: { icon: Info, color: '#0A84FF' },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastContext()

  return (
    <div
      style={{
        position: 'fixed',
        top: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'none',
        width: '100%',
        maxWidth: '480px',
        padding: '0 16px',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map(toast => {
          const config = typeConfig[toast.type]
          const Icon = config.icon

          return (
            <motion.div
              key={toast.id}
              className="glass"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94 }}
              transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
              style={{
                borderRadius: 'var(--radius-pill)',
                padding: '10px 16px 10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                pointerEvents: 'auto',
                cursor: 'default',
                minWidth: '240px',
                maxWidth: '100%',
              }}
            >
              <Icon size={17} strokeWidth={2.5} color={config.color} style={{ flexShrink: 0 }} />
              <span
                className="flex-1 text-sm font-medium"
                style={{ color: 'var(--color-sys-label)', fontSize: '14px' }}
              >
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: 'var(--color-sys-label-secondary)',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
