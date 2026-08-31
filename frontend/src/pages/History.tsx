import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { interviewApi } from '../lib/api'
import { History, ChevronRight, Loader2, Trash2, Eye, Play } from 'lucide-react'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadInterviews() }, [page])

  const loadInterviews = async () => {
    setLoading(true)
    try {
      const res: any = await interviewApi.list({ page, page_size: 20 })
      setInterviews(res.data?.items || [])
      setTotal(res.data?.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('确定要删除这场面试记录吗？删除后无法恢复。')) return
    setDeletingId(id)
    try {
      await interviewApi.delete(id)
      setInterviews((prev) => prev.filter((i) => i.id !== id))
      setTotal((prev) => prev - 1)
    } catch (e) {
      console.error(e)
      alert('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  const handleReview = (e: React.MouseEvent, item: any) => {
    e.stopPropagation()
    if (item.status === 'completed') {
      navigate(`/interviews/${item.id}/report`)
    } else {
      navigate(`/interviews/${item.id}`)
    }
  }

  const handleRowClick = (item: any) => {
    if (item.status === 'completed') {
      navigate(`/interviews/${item.id}/report`)
    } else {
      navigate(`/interviews/${item.id}`)
    }
  }

  const roleLabels: Record<string, string> = {
    algorithm: '算法工程师', backend: '后端开发', frontend: '前端开发',
    fullstack: '全栈开发', pm: '产品经理',
  }

  const statusLabels: Record<string, { text: string; color: string }> = {
    pending: { text: '待开始', color: 'bg-slate-100 text-slate-600' },
    in_progress: { text: '进行中', color: 'bg-blue-100 text-blue-600' },
    completed: { text: '已完成', color: 'bg-green-100 text-green-600' },
    cancelled: { text: '已取消', color: 'bg-red-100 text-red-600' },
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">历史记录</h1>
      <p className="text-slate-500 mb-6">共 {total} 场面试</p>

      {loading ? (
        <div className="text-center py-20"><Loader2 size={32} className="animate-spin mx-auto text-slate-400" /></div>
      ) : interviews.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
          <History size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">还没有面试记录</p>
          <button onClick={() => navigate('/interviews/create')}
            className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
            开始第一场面试
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
          {interviews.map((item) => {
            const status = statusLabels[item.status] || statusLabels.pending
            const isCompleted = item.status === 'completed'
            return (
              <div key={item.id}
                onClick={() => handleRowClick(item)}
                className="p-5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {roleLabels[item.role_category]?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{roleLabels[item.role_category] || item.role_category}</p>
                    <p className="text-sm text-slate-400">
                      {item.difficulty} · {item.duration_minutes}分钟 · {new Date(item.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${status.color}`}>{status.text}</span>
                  {item.total_score && (
                    <span className={`text-xl font-bold ${parseFloat(item.total_score) >= 7 ? 'text-green-600' : 'text-amber-600'}`}>
                      {item.total_score}
                    </span>
                  )}
                  {/* 回看按钮 */}
                  <button
                    onClick={(e) => handleReview(e, item)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition opacity-0 group-hover:opacity-100"
                    title={isCompleted ? '查看报告' : '继续面试'}
                  >
                    {isCompleted ? <Eye size={18} /> : <Play size={18} />}
                  </button>
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-50"
                    title="删除"
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                  <ChevronRight size={18} className="text-slate-300" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
