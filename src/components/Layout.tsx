import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F2F2F0' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#F2F2F0' }}>
        <Outlet />
      </main>
    </div>
  )
}
