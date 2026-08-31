import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { resumeApi, interviewApi } from '../lib/api'
import { Play, Loader2 } from 'lucide-react'

const roles = [
  { value: 'algorithm', label: '算法工程师' },
  { value: 'backend', label: '后端开发' },
  { value: 'frontend', label: '前端开发' },
  { value: 'fullstack', label: '全栈开发' },
  { value: 'pm', label: '产品经理' },
]

const difficulties = [
  { value: 'easy', label: '简单', desc: '基础概念题' },
  { value: 'medium', label: '中等', desc: '含追问和场景题' },
  { value: 'hard', label: '困难', desc: '深度技术+系统设计' },
]

const personalities = [
  { value: 'gentle', label: '温和友好' },
  { value: 'strict', label: '严格专业' },
  { value: 'pressure', label: '压力面' },
]

export default function CreateInterview() {
  const navigate = useNavigate()
  const [resumes, setResumes] = useState<any[]>([])
  const [form, setForm] = useState({
    resume_id: '', role_category: 'algorithm', difficulty: 'medium',
    duration_minutes: 30, personality: 'gentle', code_enabled: false,
  })
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => { loadResumes() }, [])

  const loadResumes = async () => {
    try {
      const res: any = await resumeApi.list()
      const list = res.data || []
      setResumes(list)
      const def = list.find((r: any) => r.is_default) || list[0]
      if (def) setForm((f) => ({ ...f, resume_id: def.id }))
    } catch (e) { console.error(e) }
  }

  const handleStart = async () => {
    if (!form.resume_id) { alert('请先上传简历'); return }
    setStarting(true)
    try {
      const res: any = await interviewApi.create(form)
      const interviewId = res.data.id
      const startRes: any = await interviewApi.start(interviewId)
      navigate(`/interviews/${interviewId}`)
    } catch (err: any) {
      alert(err.response?.data?.detail || '创建面试失败')
    } finally { setStarting(false) }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">创建面试</h1>
      <p className="text-slate-500 mb-8">配置面试参数，开始 AI 模拟面试</p>

      <div className="space-y-6">
        {/* 选择简历 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">选择简历</h3>
          {resumes.length === 0 ? (
            <p className="text-slate-400 text-sm">请先到简历管理页面上传简历</p>
          ) : (
            <select value={form.resume_id} onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
              {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
        </div>

        {/* 岗位方向 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">岗位方向</h3>
          <div className="grid grid-cols-3 gap-3">
            {roles.map((r) => (
              <button key={r.value} onClick={() => setForm({ ...form, role_category: r.value })}
                className={`p-3 rounded-lg border text-sm font-medium transition ${
                  form.role_category === r.value ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>{r.label}</button>
            ))}
          </div>
        </div>

        {/* 难度 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4">面试难度</h3>
          <div className="grid grid-cols-3 gap-3">
            {difficulties.map((d) => (
              <button key={d.value} onClick={() => setForm({ ...form, difficulty: d.value })}
                className={`p-4 rounded-lg border text-left transition ${
                  form.difficulty === d.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                <p className={`font-medium ${form.difficulty === d.value ? 'text-blue-600' : 'text-slate-700'}`}>{d.label}</p>
                <p className="text-xs text-slate-400 mt-1">{d.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 其他配置 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-5">
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">面试时长</h3>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((m) => (
                <button key={m} onClick={() => setForm({ ...form, duration_minutes: m })}
                  className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${
                    form.duration_minutes === m ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>{m}分钟</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">面试官风格</h3>
            <div className="flex gap-2">
              {personalities.map((p) => (
                <button key={p.value} onClick={() => setForm({ ...form, personality: p.value })}
                  className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${
                    form.personality === p.value ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="code" checked={form.code_enabled}
              onChange={(e) => setForm({ ...form, code_enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="code" className="text-sm text-slate-700">启用代码面试模式（含在线代码编辑器和 AI 代码评审）</label>
          </div>
        </div>

        {/* 开始按钮 */}
        <button onClick={handleStart} disabled={starting || !form.resume_id}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-lg">
          {starting ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
          开始面试
        </button>
      </div>
    </div>
  )
}
