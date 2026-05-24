import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, UtensilsCrossed, Package,
  ShoppingCart, TrendingUp, DollarSign, LogOut,
} from 'lucide-react'
import { logout } from '../lib/auth'

const navItems = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/menu',       label: 'Menu',        icon: UtensilsCrossed },
  { to: '/inventory',  label: 'Inventory',   icon: Package },
  { to: '/purchasing', label: 'Purchasing',  icon: ShoppingCart },
  { to: '/sales',      label: 'Sales',       icon: TrendingUp },
  { to: '/financial',  label: 'Financial',   icon: DollarSign },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside
      style={{ backgroundColor: '#0E0E0E', borderRight: '1px solid #1C1C1C', width: 220 }}
      className="flex flex-col flex-shrink-0 min-h-screen"
    >
      {/* Logo */}
      <div style={{ borderBottom: '1px solid #1C1C1C' }} className="px-5 py-6">
        <div style={{ fontFamily: "'Archivo Black', sans-serif", color: '#D91C1C', letterSpacing: '0.08em' }}
          className="text-xl uppercase">
          AYAMTENNS
        </div>
        <div style={{ color: '#4A4A4A' }} className="text-xs mt-0.5 tracking-widest uppercase">
          Management
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.15s',
              backgroundColor: isActive ? '#1C1C1C' : 'transparent',
              color: isActive ? '#FFFFFF' : '#5A5A5A',
              borderLeft: isActive ? '2px solid #D91C1C' : '2px solid transparent',
            })}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ borderTop: '1px solid #1C1C1C' }} className="px-3 py-4">
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{ color: '#4A4A4A' }}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded text-sm hover:text-white hover:bg-white/5 transition-all"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  )
}
