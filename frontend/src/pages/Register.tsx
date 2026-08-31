import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuthStore } from '../stores/useAuthStore'
import { MessageSquare } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ username: '', email: '', password: '', nickname: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res: any = await authApi.register(form)
      login(res.data.access_token, res.data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MessageSquare size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">注册 Interview Copilot</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-7">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" required minLength={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">邮箱</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">昵称（可选）</label>
              <input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" required minLength={8} />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 text-sm">
              {loading ? '注册中...' : '注册'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-5">
            已有账号？<Link to="/login" className="text-blue-600 hover:underline font-medium">去登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
