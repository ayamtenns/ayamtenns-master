import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MenuManagement from './pages/MenuManagement'
import Inventory from './pages/Inventory'
import Purchasing from './pages/Purchasing'
import Sales from './pages/Sales'
import Financial from './pages/Financial'

function RequireAuth({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/menu" element={<MenuManagement />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchasing" element={<Purchasing />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/financial" element={<Financial />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
