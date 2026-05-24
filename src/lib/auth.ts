const AUTH_KEY = 'ayamtenns_auth'
const PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'ayamtenns2024'

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === 'true'
}

export function login(password: string): boolean {
  if (password === PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, 'true')
    return true
  }
  return false
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY)
}
