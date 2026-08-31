import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { publicApi } from '../lib/api'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { ArrowLeft, FileText, AlertTriangle, Lightbulb, Award, Share2 } from 'lucide-react'

const roleLabels: Record<string, string> = {
  algorithm: '算法工程师', backend: '后端开发', frontend: '前端开发',
  fullstack: '全栈开发', pm: '产品经理', data: '数据工程师',
  devops: '运维/DevOps', other: '其他',
}

const difficultyLabels: Record<string, string> = {
  easy: '简单', medium: '中等', hard: '困难',
}

export default function ShareReport() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'weakness'>('overview')

  useEffect(() => {
    if (token) loadReport()
  }, [token])

  const loadReport = async () => {
    setLoading(true)
    try {
      const res: any = await publicApi.getSharedReport(token!)
      setReport(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || '分享链接无效或已过期')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">加载报告中...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">无法查看报告</h2>
          <p className="text-slate-500 mb-6">{error || '分享链接无效或已过期'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const dimensionScores = report.dimension_scores || {}
  const radarData = [
    { dimension: '技术深度', score: dimensionScores.tech_depth || 0 },
    { dimension: '表达逻辑', score: dimensionScores.expression || 0 },
    { dimension: '应变能力', score: dimensionScores.adaptability || 0 },
    { dimension: '基础知识', score: dimensionScores.foundation || 0 },
  ]

  const questionReviews = report.question_reviews || []
  const weaknesses = report.weaknesses || []
  const suggestions = report.suggestions || []

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-blue-600'
    if (score >= 4) return 'text-amber-600'
    return 'text-red-600'
  }

  const scoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-50 border-green-200'
    if (score >= 6) return 'bg-blue-50 border-blue-200'
    if (score >= 4) return 'bg-amber-50 border-amber-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">面试报告</h1>
              <p className="text-xs text-slate-500">
                {roleLabels[report.role_category] || report.role_category} · {difficultyLabels[report.difficulty] || report.difficulty} · {report.duration_minutes}分钟
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full">
              <Share2 size={14} />
              分享的报告
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 总评分卡片 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">综合评分</p>
              <p className="text-5xl font-bold">{report.total_score}<span className="text-2xl text-blue-200">/10</span></p>
            </div>
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.3)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'white', fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                  <Radar name="能力" dataKey="score" stroke="white" fill="white" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {report.overall_comment && (
            <p className="mt-4 text-blue-100 text-sm leading-relaxed">{report.overall_comment}</p>
          )}
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'overview', label: '能力总览', icon: Award },
            { key: 'questions', label: '逐题回顾', icon: FileText },
            { key: 'weakness', label: '薄弱点与建议', icon: AlertTriangle },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 能力总览 */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '技术深度', value: dimensionScores.tech_depth || 0 },
              { label: '表达逻辑', value: dimensionScores.expression || 0 },
              { label: '应变能力', value: dimensionScores.adaptability || 0 },
              { label: '基础知识', value: dimensionScores.foundation || 0 },
            ].map((d) => (
              <div key={d.label} className={`p-5 rounded-xl border ${scoreBg(d.value)}`}>
                <p className="text-sm text-slate-600 mb-2">{d.label}</p>
                <p className={`text-3xl font-bold ${scoreColor(d.value)}`}>{d.value}<span className="text-lg text-slate-400">/10</span></p>
              </div>
            ))}
          </div>
        )}

        {/* 逐题回顾 */}
        {activeTab === 'questions' && (
          <div className="space-y-4">
            {questionReviews.map((q: any, i: number) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800">第 {i + 1} 题</h3>
                  <span className={`text-lg font-bold ${scoreColor(q.overall_score)}`}>{q.overall_score}分</span>
                </div>
                {q.question && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                    <p className="text-xs text-blue-700 font-medium mb-1">问题</p>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{q.question}</p>
                  </div>
                )}
                {q.answer && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-slate-600 font-medium mb-1">你的回答</p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{q.answer}</p>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: '技术深度', v: q.tech_depth },
                    { label: '表达逻辑', v: q.expression },
                    { label: '应变能力', v: q.adaptability },
                    { label: '基础知识', v: q.foundation },
                  ].map((d) => (
                    <div key={d.label} className="text-center p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500">{d.label}</p>
                      <p className={`font-semibold ${scoreColor(d.v)}`}>{d.v}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-600 mb-3"><span className="font-medium">点评：</span>{q.comment}</p>
                {q.suggested_answer && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                    <p className="text-xs text-green-700 font-medium mb-1">参考回答</p>
                    <p className="text-sm text-green-800 whitespace-pre-wrap">{q.suggested_answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 薄弱点与建议 */}
        {activeTab === 'weakness' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="font-semibold text-slate-800">高频薄弱点</h3>
              </div>
              {weaknesses.length === 0 ? (
                <p className="text-slate-400 text-sm">暂无明显薄弱点，继续保持！</p>
              ) : (
                <div className="space-y-3">
                  {weaknesses.map((w: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-sm text-slate-700">{w.point || w}</span>
                      {w.frequency && (
                        <span className="text-xs text-amber-600 font-medium">出现 {w.frequency} 次</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl p-6 border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={18} className="text-green-500" />
                <h3 className="font-semibold text-slate-800">改进建议</h3>
              </div>
              {suggestions.length === 0 ? (
                <p className="text-slate-400 text-sm">暂无建议</p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s: string, i: number) => (
                    <div key={i} className="flex gap-3 p-3 bg-green-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <p className="text-sm text-slate-700">{s}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>本报告由 Interview Copilot AI 生成，仅供参考</p>
          <p className="mt-1">生成时间：{report.created_at ? new Date(report.created_at).toLocaleString('zh-CN') : '-'}</p>
        </div>
      </div>
    </div>
  )
}
