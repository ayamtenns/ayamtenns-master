import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#f5f4f1' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto" style={{ backgroundColor: '#f5f4f1' }}>
        <Outlet />
      </main>
    </div>
  )
}
