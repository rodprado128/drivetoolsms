import { AnimatePresence, motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import { GlassTopbar } from '../GlassTopbar'
import { Sidebar } from './Sidebar'
import { MeshBackground } from '../MeshBackground'
import { ToastContainer } from '../Toast'

const IOS_EASE = [0.32, 0.72, 0, 1] as const

export function AppShell() {
  const location = useLocation()

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <MeshBackground />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <GlassTopbar />

        <div
          style={{
            display: 'flex',
            gap: '0px',
            // Topbar é fixed (60px), reservamos o offset aqui
            paddingTop: '60px',
            minHeight: '100dvh',
          }}
        >
          <Sidebar />

          <main
            style={{
              flex: 1,
              padding: '20px 24px 28px 12px',
              minWidth: 0,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: IOS_EASE }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
