import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'
import { Lock } from 'lucide-react'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 300))
    if (login(password)) {
      navigate('/')
    } else {
      setError('Password salah.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{ backgroundColor: '#0d0c0a' }}
      className="min-h-screen flex items-center justify-center"
    >
      <div className="w-full max-w-sm px-4">
        {/* Logo block */}
        <div className="text-center mb-10">
          <div
            style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e5420d' }}
            className="text-5xl tracking-widest"
          >
            AYAMTENNS
          </div>
          <div style={{ color: '#8a867d' }} className="text-sm tracking-widest uppercase mt-1">
            BSD Restaurant Management
          </div>
          <div
            style={{ backgroundColor: '#e5420d', height: '2px' }}
            className="w-16 mx-auto mt-4"
          />
        </div>

        {/* Card */}
        <div
          style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }}
          className="rounded-xl p-8"
        >
          <div className="flex items-center gap-2 mb-6" style={{ color: '#8a867d' }}>
            <Lock size={14} />
            <span className="text-xs tracking-wider uppercase">Akses Terbatas</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-2 tracking-wider uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  backgroundColor: '#0d0c0a',
                  border: '1px solid #2a2825',
                  color: '#e8e4dc',
                }}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors"
                autoFocus
              />
            </div>

            {error && (
              <p style={{ color: '#ef4444' }} className="text-xs">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#e5420d' }}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold tracking-wide hover:bg-[#ff5520] active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
