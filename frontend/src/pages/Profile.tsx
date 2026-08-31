import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { userApi } from '../lib/api'
import { Save, User, Target, GraduationCap, CheckCircle2 } from 'lucide-react'

const roles = [
  { value: 'algorithm', label: '算法工程师' },
  { value: 'backend', label: '后端开发' },
  { value: 'frontend', label: '前端开发' },
  { value: 'fullstack', label: '全栈开发' },
  { value: 'pm', label: '产品经理' },
  { value: 'data', label: '数据工程师' },
  { value: 'devops', label: '运维/DevOps' },
  { value: 'other', label: '其他' },
]

const graduationYears = [2025, 2026, 2027, 2028, 2029, 2030]

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    nickname: '',
    target_role: '',
    graduation_year: 2027,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        nickname: user.nickname || '',
        target_role: user.target_role || '',
        graduation_year: user.graduation_year || 2027,
      })
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res: any = await userApi.updateProfile(form)
      if (res.data) {
        updateUser(res.data)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">个人设置</h1>
      <p className="text-slate-500 mb-8">管理你的个人信息和默认求职意向</p>

      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-500" />
            基本信息
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">用户名</label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">用户名不可修改</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">邮箱</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">昵称</label>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="请输入昵称"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* 求职意向 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target size={18} className="text-blue-500" />
            求职意向
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">目标岗位方向</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setForm({ ...form, target_role: r.value })}
                    className={`p-2.5 rounded-lg border text-sm font-medium transition ${
                      form.target_role === r.value
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">设置后，创建面试时会默认选择该岗位方向</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                <GraduationCap size={16} className="text-slate-500" />
                毕业年份
              </label>
              <select
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: Number(e.target.value) })}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              >
                {graduationYears.map((y) => (
                  <option key={y} value={y}>{y} 届</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                保存中...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={18} />
                已保存
              </>
            ) : (
              <>
                <Save size={18} />
                保存修改
              </>
            )}
          </button>
          {saved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 size={16} />
              个人资料已更新
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
