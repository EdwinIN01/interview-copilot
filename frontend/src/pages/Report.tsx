import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { interviewApi } from '../lib/api'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ArrowLeft, Award, Target, TrendingUp, AlertTriangle, CheckCircle, Loader2, Share2, Download, Copy, X } from 'lucide-react'

export default function Report() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'weakness'>('overview')
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { loadReport() }, [id])

  const loadReport = async () => {
    try {
      const res: any = await interviewApi.report(id!)
      setReport(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      await interviewApi.regenerateReport(id!)
      await loadReport()
    } catch (e: any) {
      alert(e?.response?.data?.detail || '生成失败，请重试')
    } finally {
      setRegenerating(false)
    }
  }

  const handleShare = async () => {
    setShareLoading(true)
    setShowShareModal(true)
    try {
      const res: any = await interviewApi.share(id!)
      const token = res.data.share_token
      const link = `${window.location.origin}/share/${token}`
      setShareLink(link)
    } catch (e: any) {
      alert(e?.response?.data?.detail || '生成分享链接失败')
      setShowShareModal(false)
    } finally {
      setShareLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPDF = () => {
    window.print()
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 size={32} className="animate-spin text-slate-400" /></div>
  if (!report) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <AlertTriangle size={48} className="text-amber-500" />
      <p className="text-slate-600 text-lg">报告不存在或尚未生成</p>
      <p className="text-slate-400 text-sm">可能是面试结束时报告生成失败，可以重新生成</p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {regenerating ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          {regenerating ? '生成中...' : '重新生成报告'}
        </button>
        <button
          onClick={() => navigate('/history')}
          className="bg-slate-100 text-slate-600 px-5 py-2 rounded-lg text-sm hover:bg-slate-200 transition"
        >
          返回历史记录
        </button>
      </div>
    </div>
  )

  const dims = report.dimension_scores || {}
  const radarData = [
    { dimension: '技术深度', score: dims.tech_depth || 0 },
    { dimension: '表达逻辑', score: dims.expression || 0 },
    { dimension: '应变能力', score: dims.adaptability || 0 },
    { dimension: '基础知识', score: dims.foundation || 0 },
  ]

  const questionReviews = report.question_reviews || []
  const barData = questionReviews.map((q: any, i: number) => ({
    name: `Q${i + 1}`, score: q.overall_score || 0,
  }))

  const weaknesses = report.weaknesses || []
  const suggestions = report.suggestions || []

  const scoreColor = (s: number) => s >= 8 ? 'text-green-600' : s >= 6 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = (s: number) => s >= 8 ? 'bg-green-50 border-green-200' : s >= 6 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 text-sm">
        <ArrowLeft size={16} /> 返回历史记录
      </button>

      {/* 头部 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">面试报告</h1>
            <p className="text-slate-500 text-sm">{new Date(report.created_at).toLocaleString('zh-CN')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
            >
              <Share2 size={16} />
              分享
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
            >
              <Download size={16} />
              导出PDF
            </button>
            <div className="text-center ml-2">
              <div className={`text-5xl font-bold ${scoreColor(report.total_score)}`}>{report.total_score}</div>
              <p className="text-sm text-slate-400 mt-1">总分 / 10</p>
            </div>
          </div>
        </div>
        <p className="text-slate-600 mt-6 leading-relaxed">{report.overall_comment}</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'overview', label: '能力雷达' },
          { key: 'questions', label: '逐题回顾' },
          { key: 'weakness', label: '薄弱点与建议' },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* 能力雷达 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">能力维度雷达图</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Radar name="得分" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">各题得分趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* 维度详情 */}
          <div className="col-span-2 bg-white rounded-xl p-6 border border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-4">维度详情</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: '技术深度', value: dims.tech_depth, icon: Target },
                { label: '表达逻辑', value: dims.expression, icon: TrendingUp },
                { label: '应变能力', value: dims.adaptability, icon: Award },
                { label: '基础知识', value: dims.foundation, icon: CheckCircle },
              ].map((d) => (
                <div key={d.label} className={`p-4 rounded-xl border ${scoreBg(d.value)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <d.icon size={16} className={scoreColor(d.value)} />
                    <span className="text-sm text-slate-600">{d.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${scoreColor(d.value)}`}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>
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
              {/* 问题 */}
              {q.question && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
                  <p className="text-xs text-blue-700 font-medium mb-1">问题</p>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{q.question}</p>
                </div>
              )}
              {/* 回答 */}
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
                    <span className="text-sm text-slate-700">{w.point}</span>
                    <span className="text-xs text-amber-600 font-medium">出现 {w.frequency} 次</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-blue-500" />
              <h3 className="font-semibold text-slate-800">提升建议</h3>
            </div>
            <div className="space-y-3">
              {suggestions.map((s: string, i: number) => (
                <div key={i} className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                  <p className="text-sm text-slate-700">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 分享链接弹窗 */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !shareLoading && setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Share2 size={20} className="text-blue-500" />
                分享面试报告
              </h3>
              <button
                onClick={() => !shareLoading && setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              生成分享链接后，任何人都可以通过链接查看这份报告（只读，无需登录）。
            </p>

            {shareLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span className="ml-2 text-slate-500">生成分享链接中...</span>
              </div>
            ) : shareLink ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 bg-slate-50"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-700">
                    💡 提示：分享链接永久有效，你可以发给朋友或导师查看你的面试表现。
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
