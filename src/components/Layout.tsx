import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        style={{ backgroundColor: '#111009' }}
        className="flex-1 overflow-auto"
      >
        <Outlet />
      </main>
    </div>
  )
}
