import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMsal } from '@azure/msal-react'
import { ChevronDown } from 'lucide-react'
import { ThemeToggle } from '../ThemeToggle'
import { UserPopover } from '../UserPopover'
import { resetGraphClient } from '../../graph/client'

function DriveToolsLogo() {
  return <img src="/logo.svg" width="28" height="28" alt="DriveTools" />
}

const IOS_EASE = [0.32, 0.72, 0, 1] as const

export function GlassTopbar() {
  const { instance, accounts } = useMsal()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const account = accounts[0]
  const displayName = account?.name ?? account?.username ?? 'Usuário'
  const email = account?.username ?? ''
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase()

  const handleLogout = () => {
    resetGraphClient()
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin })
  }

  return (
    <header
      className="glass glass-no-highlight"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid var(--glass-border)',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      <div className="flex items-center gap-3">
        <DriveToolsLogo />
        <span
          className="font-semibold"
          style={{
            fontSize: '17px',
            color: 'var(--color-sys-label)',
            letterSpacing: '-0.02em',
          }}
        >
          DriveTools
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />

        <motion.button
          ref={triggerRef}
          type="button"
          className="glass-sm flex items-center gap-2 px-3"
          style={{
            height: '36px',
            borderRadius: 'var(--radius-pill)',
            cursor: 'pointer',
            color: 'var(--color-sys-label)',
          }}
          whileHover={{ scale: 1.03, filter: 'brightness(1.15)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2, ease: IOS_EASE }}
          onClick={() => setPopoverOpen(prev => !prev)}
          aria-haspopup="menu"
          aria-expanded={popoverOpen}
        >
          <div
            className="flex items-center justify-center font-semibold"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(10,132,255,0.20)',
              color: '#0A84FF',
              fontSize: '11px',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              maxWidth: '140px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName.split(' ')[0]}
          </span>
          <ChevronDown
            size={13}
            strokeWidth={2.5}
            style={{
              color: 'var(--color-sys-label-secondary)',
              transform: popoverOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms ease',
            }}
          />
        </motion.button>

        <UserPopover
          isOpen={popoverOpen}
          onClose={() => setPopoverOpen(false)}
          triggerRef={triggerRef}
          displayName={displayName}
          email={email}
          initials={initials}
          onLogout={handleLogout}
        />
      </div>
    </header>
  )
}
