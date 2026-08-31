import { create } from 'zustand'

interface User {
  id: string
  username: string
  nickname?: string
  email: string
  avatar_url?: string
  target_role?: string
  role_detail?: string
  tech_stack?: string
  target_company?: string
  job_description?: string
  graduation_year?: number
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (patch: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  updateUser: (patch) =>
    set((state) => {
      const user = state.user ? { ...state.user, ...patch } : null
      if (user) localStorage.setItem('user', JSON.stringify(user))
      return { user }
    }),
}))
