import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Trash2, FolderOpen, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clean', label: 'Drive Clean', icon: Trash2 },
  { to: '/organizer', label: 'Organizer', icon: FolderOpen },
  { to: '/exposed', label: 'Exposed', icon: Shield },
]

const IOS_EASE = [0.32, 0.72, 0, 1] as const

interface SidebarItemProps {
  to: string
  label: string
  Icon: LucideIcon
}

function SidebarItem({ to, label, Icon }: SidebarItemProps) {
  return (
    <NavLink to={to} end style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <motion.div
          // Item ativo não anima no hover (já está destacado)
          whileHover={isActive ? undefined : { x: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2, ease: IOS_EASE }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: isActive ? 600 : 500,
            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            cursor: 'pointer',
          }}
        >
          {/* Indicador do item ativo: pill animada via layoutId */}
          {isActive && (
            <motion.div
              layoutId="sidebar-active-pill"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '10px',
                background: 'rgba(10, 132, 255, 0.20)',
                border: '1px solid rgba(10, 132, 255, 0.30)',
                zIndex: 0,
              }}
            />
          )}
          <Icon
            size={17}
            strokeWidth={isActive ? 2.4 : 2}
            style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}
          />
          <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
        </motion.div>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <nav
      className="glass"
      style={{
        width: '220px',
        flexShrink: 0,
        borderRadius: 'var(--radius-sidebar)',
        margin: '12px 0 12px 12px',
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        alignSelf: 'flex-start',
        position: 'sticky',
        top: '72px',
      }}
    >
      {navItems.map(item => (
        <SidebarItem key={item.to} to={item.to} label={item.label} Icon={item.icon} />
      ))}
    </nav>
  )
}
