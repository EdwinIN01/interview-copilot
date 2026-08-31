import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../lib/api'
import { useAuthStore } from '../stores/useAuthStore'
import { MessageSquare } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ username_or_email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res: any = await authApi.login(form)
      login(res.data.access_token, res.data.user)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Interview Copilot</h1>
          <p className="text-slate-500 mt-1">AI 面试模拟助手</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">登录</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名或邮箱</label>
              <input
                type="text"
                value={form.username_or_email}
                onChange={(e) => setForm({ ...form, username_or_email: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="请输入用户名或邮箱"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="请输入密码"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            还没有账号？{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
