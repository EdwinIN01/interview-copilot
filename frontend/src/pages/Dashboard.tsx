import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewApi, userApi } from '../lib/api'
import { useAuthStore } from '../stores/useAuthStore'
import { PlayCircle, FileText, TrendingUp, Clock, Award, Target, X, Check, ChevronRight, BarChart3, PieChart as PieIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'

const roleOptions = [
  { value: 'algorithm', label: '算法工程师' },
  { value: 'backend', label: '后端开发' },
  { value: 'frontend', label: '前端开发' },
  { value: 'fullstack', label: '全栈开发' },
  { value: 'pm', label: '产品经理' },
  { value: 'data', label: '数据工程师' },
  { value: 'devops', label: '运维/DevOps' },
  { value: 'other', label: '其他' },
]

// 各岗位的细分方向
const roleDetailMap: Record<string, string[]> = {
  algorithm: ['CV计算机视觉', 'NLP自然语言处理', '推荐系统', '大模型/LLM', '机器学习', '数据挖掘', '语音识别'],
  backend: ['Java后端', 'Go后端', 'Python后端', 'C++后端', '分布式系统', '数据库', '微服务架构'],
  frontend: ['React', 'Vue', '移动端H5', '小程序', '性能优化', '工程化', '低代码'],
  fullstack: ['React+Node', 'Vue+Java', '全栈架构', 'BFF层'],
  pm: ['互联网产品', 'B端产品', 'C端产品', '数据产品', 'AI产品', '产品运营'],
  data: ['数据开发', '数据分析', '数据仓库', '大数据', '商业分析'],
  devops: ['云原生', 'Kubernetes', 'CI/CD', '监控告警', 'SRE'],
  other: ['自定义方向'],
}

// 技术栈选项
const techStackOptions = [
  'Python', 'Java', 'C++', 'Go', 'JavaScript', 'TypeScript',
  'React', 'Vue', 'Node.js', 'Spring Boot', 'Gin', 'FastAPI', 'Django',
  'MySQL', 'PostgreSQL', 'Redis', 'MongoDB', 'Elasticsearch',
  'Docker', 'Kubernetes', 'Kafka', 'RabbitMQ',
  'PyTorch', 'TensorFlow', 'LangChain', 'HuggingFace',
  'Linux', 'Git', 'Nginx',
]

// 目标公司类型
const companyOptions = [
  { value: 'bigtech', label: '互联网大厂' },
  { value: 'startup', label: '中小厂/创业公司' },
  { value: 'soe', label: '国企/央企' },
  { value: 'finance', label: '金融/银行' },
  { value: 'foreign', label: '外企' },
  { value: 'other', label: '其他' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [stats, setStats] = useState({ total: 0, avgScore: 0, bestScore: 0 })
  const [recent, setRecent] = useState<any[]>([])
  const [allInterviews, setAllInterviews] = useState<any[]>([])
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [savingRole, setSavingRole] = useState(false)
  // 表单状态
  const [formRole, setFormRole] = useState('')
  const [formRoleDetail, setFormRoleDetail] = useState('')
  const [formTechStack, setFormTechStack] = useState<string[]>([])
  const [formCompany, setFormCompany] = useState('')
  const [formJobDesc, setFormJobDesc] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // 打开弹窗时初始化表单
  useEffect(() => {
    if (showRolePicker && user) {
      setFormRole(user.target_role || '')
      setFormRoleDetail(user.role_detail || '')
      setFormTechStack(user.tech_stack ? JSON.parse(user.tech_stack) : [])
      setFormCompany(user.target_company || '')
      setFormJobDesc(user.job_description || '')
    }
  }, [showRolePicker, user])

  const loadData = async () => {
    try {
      // 获取最近20条面试记录用于统计
      const res: any = await interviewApi.list({ page: 1, page_size: 20 })
      const items = res.data?.items || []
      setRecent(items.slice(0, 5))
      setAllInterviews(items)

      const completed = items.filter((i: any) => i.total_score)
      if (completed.length) {
        setStats({
          total: res.data?.total || items.length,
          avgScore: completed.reduce((s: number, i: any) => s + parseFloat(i.total_score), 0) / completed.length,
          bestScore: Math.max(...completed.map((i: any) => parseFloat(i.total_score))),
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const roleLabels: Record<string, string> = {
    algorithm: '算法工程师', backend: '后端开发', frontend: '前端开发',
    fullstack: '全栈开发', pm: '产品经理', data: '数据工程师',
    devops: '运维/DevOps', other: '其他',
  }

  const companyLabels: Record<string, string> = {
    bigtech: '互联网大厂', startup: '中小厂/创业公司', soe: '国企/央企',
    finance: '金融/银行', foreign: '外企', other: '其他',
  }

  // 图表数据计算
  const completedInterviews = allInterviews.filter((i: any) => i.total_score)
  const scoreTrendData = [...completedInterviews]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-10)
    .map((i: any, idx: number) => ({
      name: `第${idx + 1}次`,
      score: parseFloat(i.total_score),
      date: new Date(i.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    }))

  const roleDistData = Object.entries(
    allInterviews.reduce((acc: Record<string, number>, i: any) => {
      const role = roleLabels[i.role_category] || i.role_category || '未知'
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const difficultyDistData = Object.entries(
    allInterviews.reduce((acc: Record<string, number>, i: any) => {
      const diff = i.difficulty === 'easy' ? '简单' : i.difficulty === 'medium' ? '中等' : i.difficulty === 'hard' ? '困难' : '未知'
      acc[diff] = (acc[diff] || 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  const toggleTechStack = (tech: string) => {
    setFormTechStack((prev) =>
      prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]
    )
  }

  const handleSave = async () => {
    if (!formRole) {
      alert('请选择目标岗位方向')
      return
    }
    setSavingRole(true)
    try {
      const res: any = await userApi.updateProfile({
        target_role: formRole,
        role_detail: formRoleDetail || undefined,
        tech_stack: JSON.stringify(formTechStack),
        target_company: formCompany || undefined,
        job_description: formJobDesc || undefined,
      })
      if (res.data) {
        updateUser(res.data)
        setShowRolePicker(false)
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || '保存失败')
    } finally {
      setSavingRole(false)
    }
  }

  // 首页卡片显示的岗位摘要
  const displayRole = () => {
    if (!user?.target_role) return '点击设置'
    let text = roleLabels[user.target_role] || user.target_role
    if (user.role_detail) text += ` · ${user.role_detail}`
    return text
  }

  return (
    <div className="p-8 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">你好，{user?.nickname || user?.username} 👋</h1>
        <p className="text-slate-500 mt-1">准备好开始今天的面试练习了吗？</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">累计面试</span>
            <Clock size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">平均分</span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.avgScore ? stats.avgScore.toFixed(1) : '-'}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">最高分</span>
            <Award size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.bestScore || '-'}</p>
        </div>
        {/* 目标岗位卡片 - 可点击设置 */}
        <button
          onClick={() => setShowRolePicker(true)}
          className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-left hover:border-purple-300 hover:shadow-md transition group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">目标岗位</span>
            <Target size={18} className="text-purple-500 group-hover:scale-110 transition" />
          </div>
          <p className={`text-sm font-bold ${user?.target_role ? 'text-slate-800' : 'text-slate-400'} leading-tight`}>
            {displayRole()}
          </p>
          {user?.target_company && (
            <p className="text-xs text-slate-400 mt-1">{companyLabels[user.target_company] || user.target_company}</p>
          )}
          {user?.tech_stack && JSON.parse(user.tech_stack).length > 0 && (
            <p className="text-xs text-purple-500 mt-1 truncate">
              {JSON.parse(user.tech_stack).slice(0, 3).join(' / ')}{JSON.parse(user.tech_stack).length > 3 ? '...' : ''}
            </p>
          )}
          {user?.job_description && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <Check size={12} />
              已配置岗位JD（{user.job_description.length}字）
            </p>
          )}
          <p className="text-xs text-purple-500 mt-1.5 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
            点击修改 <ChevronRight size={12} />
          </p>
        </button>
      </div>

      {/* 数据可视化看板 */}
      {completedInterviews.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500" />
            数据看板
          </h2>

          {/* 第一行：分数趋势 + 岗位分布 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* 分数趋势图 */}
            <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm">面试分数趋势（最近{scoreTrendData.length}次）</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={scoreTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(value: number) => [`${value}/10`, '总分']}
                  />
                  <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 岗位分布饼图 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm flex items-center gap-1.5">
                <PieIcon size={16} className="text-purple-500" />
                岗位分布
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={roleDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {roleDistData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 第二行：难度分布 + 分数段分布 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 难度分布 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm">难度分布</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={difficultyDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 分数段分布 */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-800 mb-4 text-sm">分数段分布</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={[
                    { name: '0-3分', count: completedInterviews.filter((i: any) => parseFloat(i.total_score) < 3).length },
                    { name: '3-5分', count: completedInterviews.filter((i: any) => parseFloat(i.total_score) >= 3 && parseFloat(i.total_score) < 5).length },
                    { name: '5-7分', count: completedInterviews.filter((i: any) => parseFloat(i.total_score) >= 5 && parseFloat(i.total_score) < 7).length },
                    { name: '7-9分', count: completedInterviews.filter((i: any) => parseFloat(i.total_score) >= 7 && parseFloat(i.total_score) < 9).length },
                    { name: '9-10分', count: completedInterviews.filter((i: any) => parseFloat(i.total_score) >= 9).length },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 快捷操作 */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={() => navigate('/interviews/create')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl p-6 text-left hover:shadow-lg transition group">
          <PlayCircle size={32} className="mb-3 group-hover:scale-110 transition" />
          <h3 className="text-lg font-semibold">开始新面试</h3>
          <p className="text-blue-100 text-sm mt-1">选择岗位和难度，开始 AI 模拟面试</p>
        </button>
        <button onClick={() => navigate('/resume')}
          className="bg-white rounded-xl p-6 text-left border border-slate-200 hover:shadow-md transition group">
          <FileText size={32} className="mb-3 text-slate-600 group-hover:scale-110 transition" />
          <h3 className="text-lg font-semibold text-slate-800">管理简历</h3>
          <p className="text-slate-500 text-sm mt-1">上传和管理你的简历，AI 将基于简历提问</p>
        </button>
      </div>

      {/* 最近面试 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">最近面试</h2>
        </div>
        {recent.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <p>还没有面试记录，点击上方"开始新面试"开始练习吧</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(item.status === 'completed' ? `/interviews/${item.id}/report` : `/interviews/${item.id}`)}>
                <div>
                  <p className="font-medium text-slate-700">{roleLabels[item.role_category] || item.role_category}</p>
                  <p className="text-sm text-slate-400">{item.difficulty} · {item.duration_minutes}分钟 · {new Date(item.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div className="text-right">
                  {item.total_score ? (
                    <span className={`text-lg font-bold ${parseFloat(item.total_score) >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                      {item.total_score}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">{item.status === 'in_progress' ? '进行中' : '未完成'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 目标岗位设置弹窗 */}
      {showRolePicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !savingRole && setShowRolePicker(false)}>
          <div className="bg-white rounded-2xl p-6 w-[520px] max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Target size={20} className="text-purple-500" />
                设置目标岗位
              </h3>
              <button
                onClick={() => !savingRole && setShowRolePicker(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* 岗位方向 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">岗位方向 <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-2">
                  {roleOptions.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => { setFormRole(role.value); setFormRoleDetail('') }}
                      className={`p-2 rounded-lg border text-xs font-medium transition ${
                        formRole === role.value
                          ? 'border-purple-500 bg-purple-50 text-purple-600'
                          : 'border-slate-200 text-slate-600 hover:border-purple-300'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 细分方向 */}
              {formRole && roleDetailMap[formRole] && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">细分方向</label>
                  <div className="flex flex-wrap gap-2">
                    {roleDetailMap[formRole].map((detail) => (
                      <button
                        key={detail}
                        onClick={() => setFormRoleDetail(formRoleDetail === detail ? '' : detail)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-medium transition ${
                          formRoleDetail === detail
                            ? 'border-purple-500 bg-purple-50 text-purple-600'
                            : 'border-slate-200 text-slate-600 hover:border-purple-300'
                        }`}
                      >
                        {detail}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 技术栈 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  技术栈 <span className="text-slate-400 font-normal">（多选，已选 {formTechStack.length} 项）</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                  {techStackOptions.map((tech) => (
                    <button
                      key={tech}
                      onClick={() => toggleTechStack(tech)}
                      className={`px-2.5 py-1 rounded border text-xs font-medium transition ${
                        formTechStack.includes(tech)
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* 目标公司 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">目标公司类型</label>
                <div className="grid grid-cols-3 gap-2">
                  {companyOptions.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFormCompany(formCompany === c.value ? '' : c.value)}
                      className={`p-2 rounded-lg border text-xs font-medium transition ${
                        formCompany === c.value
                          ? 'border-amber-500 bg-amber-50 text-amber-600'
                          : 'border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 自定义岗位描述（JD） */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  岗位描述（JD）
                  <span className="text-slate-400 font-normal ml-1">可选，粘贴招聘网站的职位详情，AI 会基于此精准出题</span>
                </label>
                <textarea
                  value={formJobDesc}
                  onChange={(e) => setFormJobDesc(e.target.value)}
                  placeholder="例如：&#10;职位描述：&#10;1、基于大语言模型及多模态大模型的微调、prompts调优...&#10;2、参与LLM及多模态大模型的应用中台搭建...&#10;&#10;任职要求：&#10;1、本科及以上学历，计算机、人工智能相关专业；&#10;2、熟悉LLM基本原理、大模型微调/RLHF等技术..."
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none transition resize-y font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">支持从 BOSS直聘、牛客、拉勾等网站复制粘贴</p>
                  <p className={`text-xs ${formJobDesc.length > 2000 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {formJobDesc.length} 字
                  </p>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">设置后 AI 会基于你的目标岗位精准出题</p>
              <button
                onClick={handleSave}
                disabled={savingRole || !formRole}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {savingRole ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    保存设置
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
