import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    await new Promise(r => setTimeout(r, 300))
    if (login(password)) {
      navigate('/')
    } else {
      setError('Password salah.')
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#F2F2F0' }} className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', letterSpacing: '0.06em' }}
            className="text-4xl uppercase"
          >
            AYAMTENNS
          </div>
          <div style={{ color: '#6B6B6B' }} className="text-xs tracking-widest uppercase mt-1.5">
            Restaurant Management
          </div>
          <div style={{ backgroundColor: '#D91C1C', height: 2 }} className="w-10 mx-auto mt-4" />
        </div>

        {/* Card */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-2 tracking-wider uppercase font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors"
                autoFocus
              />
            </div>

            {error && <p style={{ color: '#DC2626' }} className="text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#D91C1C' }}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-wide hover:bg-[#B51515] active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
