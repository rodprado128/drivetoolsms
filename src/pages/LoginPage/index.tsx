import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MeshBackground } from '../../components/MeshBackground'
import { GlassCard } from '../../components/GlassCard'
import { GlassButton } from '../../components/GlassButton'
import { LOGIN_SCOPES } from '../../graph/client'

function DriveToolsWordmark() {
  return (
    <div className="flex items-center gap-3 mb-2">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="13" fill="#0A84FF" />
        <path
          d="M12 32 C12 32 18 18 24 18 C30 18 36 32 36 32"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M9 40 C9 40 16 28 24 28 C32 28 39 40 39 40"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div>
        <h1
          className="font-bold"
          style={{ fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--color-sys-label)', margin: 0, lineHeight: 1.1 }}
        >
          DriveTools
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-sys-label-secondary)', margin: 0 }}>
          Microsoft 365
        </p>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: LOGIN_SCOPES,
      prompt: 'select_account',
    })
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px',
      }}
    >
      <MeshBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.45 }}
        style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}
      >
        <GlassCard style={{ padding: '40px 36px 36px' }}>
          <DriveToolsWordmark />

          <p
            style={{
              fontSize: '15px',
              color: 'var(--color-sys-label-secondary)',
              marginTop: '12px',
              marginBottom: '32px',
              lineHeight: 1.5,
            }}
          >
            Gerencie seu OneDrive com clareza. Limpe duplicatas, organize arquivos e audite permissões.
          </p>

          <GlassButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleLogin}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <path d="M1 1h9v9H1z" fill="#F25022" />
              <path d="M11 1h9v9h-9z" fill="#7FBA00" />
              <path d="M1 11h9v9H1z" fill="#00A4EF" />
              <path d="M11 11h9v9h-9z" fill="#FFB900" />
            </svg>
            Entrar com Microsoft
          </GlassButton>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-sys-label-tertiary)',
              textAlign: 'center',
              marginTop: '20px',
            }}
          >
            Seus dados ficam no seu OneDrive. Nenhuma informação sai do seu tenant.
          </p>
        </GlassCard>
      </motion.div>
    </div>
  )
}
