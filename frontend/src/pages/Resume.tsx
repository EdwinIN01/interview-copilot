import { useEffect, useState, useRef } from 'react'
import { resumeApi } from '../lib/api'
import { Upload, FileText, Trash2, Star, Loader2 } from 'lucide-react'

export default function Resume() {
  const [resumes, setResumes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadResumes() }, [])

  const loadResumes = async () => {
    setLoading(true)
    try {
      const res: any = await resumeApi.list()
      setResumes(res.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await resumeApi.upload(file, file.name)
      await loadResumes()
    } catch (err: any) {
      alert(err.response?.data?.detail || '上传失败')
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这份简历吗？')) return
    await resumeApi.delete(id)
    loadResumes()
  }

  const handleSetDefault = async (id: string) => {
    await resumeApi.update(id, { is_default: true })
    loadResumes()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">简历管理</h1>
          <p className="text-slate-500 mt-1">上传简历，AI 将基于你的简历进行针对性提问</p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          上传简历
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400"><Loader2 size={32} className="animate-spin mx-auto" /></div>
      ) : resumes.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-2">还没有上传简历</p>
          <p className="text-slate-400 text-sm">支持 PDF、DOCX、TXT 格式</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {resumes.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 flex items-center gap-2">
                      {r.name}
                      {r.is_default && <Star size={14} className="text-amber-500 fill-amber-500" />}
                    </p>
                    <p className="text-xs text-slate-400">{r.file_type?.toUpperCase()} · {new Date(r.created_at).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">{r.content_text?.slice(0, 150)}...</p>
              <div className="flex gap-2">
                {!r.is_default && (
                  <button onClick={() => handleSetDefault(r.id)} className="flex-1 text-sm py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">
                    设为默认
                  </button>
                )}
                <button onClick={() => handleDelete(r.id)} className="px-3 py-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
