import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { LayoutDashboard, FileText, PlusCircle, History, BookOpen, LogOut, User, Settings } from 'lucide-react'

const navItems = [
  { path: '/', label: '首页', icon: LayoutDashboard },
  { path: '/resume', label: '简历管理', icon: FileText },
  { path: '/interviews/create', label: '开始面试', icon: PlusCircle },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/knowledge', label: '知识库', icon: BookOpen },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 侧边栏 */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-800">Interview Copilot</h1>
          <p className="text-xs text-slate-500 mt-1">AI 面试模拟助手</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-700 truncate">{user?.nickname || user?.username}</p>
              {user?.target_role && (
                <p className="text-xs text-slate-400 truncate">
                  {user.target_role === 'algorithm' ? '算法工程师' :
                   user.target_role === 'backend' ? '后端开发' :
                   user.target_role === 'frontend' ? '前端开发' :
                   user.target_role === 'fullstack' ? '全栈开发' :
                   user.target_role === 'pm' ? '产品经理' : user.target_role}
                </p>
              )}
            </div>
            <Settings size={14} className="text-slate-400" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
