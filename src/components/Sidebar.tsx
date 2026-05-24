import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  LogOut,
} from 'lucide-react'
import { logout } from '../lib/auth'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/purchasing', label: 'Purchasing', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: TrendingUp },
  { to: '/financial', label: 'Financial', icon: DollarSign },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      style={{ backgroundColor: '#0a0908', borderRight: '1px solid #1e1d1a' }}
      className="flex flex-col w-56 min-h-screen flex-shrink-0"
    >
      {/* Logo */}
      <div style={{ borderBottom: '1px solid #1e1d1a' }} className="px-5 py-6">
        <div
          style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e5420d' }}
          className="text-2xl tracking-widest"
        >
          AYAMTENNS
        </div>
        <div style={{ color: '#8a867d' }} className="text-xs mt-0.5 tracking-wider uppercase">
          BSD Restaurant
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
              gap: '10px',
              padding: '9px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              textDecoration: 'none',
              transition: 'all 0.15s',
              backgroundColor: isActive ? '#1a1917' : 'transparent',
              color: isActive ? '#e5420d' : '#8a867d',
              borderLeft: isActive ? '2px solid #e5420d' : '2px solid transparent',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ borderTop: '1px solid #1e1d1a' }} className="px-3 py-4">
        <button
          onClick={handleLogout}
          style={{ color: '#8a867d' }}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded text-sm hover:text-red-400 hover:bg-red-950/20 transition-all"
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  )
}
