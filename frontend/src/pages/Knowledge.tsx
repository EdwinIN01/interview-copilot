import { useEffect, useState, useRef } from 'react'
import { knowledgeApi } from '../lib/api'
import { BookOpen, Upload, Trash2, Plus, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function Knowledge() {
  const [kbs, setKbs] = useState<any[]>([])
  const [selectedKb, setSelectedKb] = useState<string | null>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newKb, setNewKb] = useState({ name: '', description: '' })
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadKbs() }, [])
  useEffect(() => { if (selectedKb) loadDocs(selectedKb) }, [selectedKb])

  const loadKbs = async () => {
    setLoading(true)
    try {
      const res: any = await knowledgeApi.list()
      setKbs(res.data || [])
      if (!selectedKb && res.data?.length) setSelectedKb(res.data[0].id)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadDocs = async (kbId: string) => {
    try {
      const res: any = await knowledgeApi.docs(kbId)
      setDocs(res.data || [])
    } catch (e) { console.error(e) }
  }

  const handleCreateKb = async () => {
    if (!newKb.name) return
    await knowledgeApi.create(newKb)
    setNewKb({ name: '', description: '' })
    setShowCreate(false)
    loadKbs()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedKb) return
    setUploading(true)
    try {
      await knowledgeApi.uploadDoc(selectedKb, file)
      loadDocs(selectedKb)
      // 轮询状态
      setTimeout(() => loadDocs(selectedKb), 3000)
    } catch (err: any) {
      alert(err.response?.data?.detail || '上传失败')
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={14} className="text-green-500" />
    if (s === 'processing') return <Loader2 size={14} className="animate-spin text-blue-500" />
    if (s === 'failed') return <AlertCircle size={14} className="text-red-500" />
    return <FileText size={14} className="text-slate-400" />
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">知识库</h1>
          <p className="text-slate-500 mt-1">上传学习资料，AI 面试时将参考知识库内容出题</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm">
          <Plus size={16} /> 新建知识库
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 mb-6">
          <div className="flex gap-3">
            <input type="text" placeholder="知识库名称，如：算法八股文" value={newKb.name}
              onChange={(e) => setNewKb({ ...newKb, name: e.target.value })}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            <input type="text" placeholder="描述（可选）" value={newKb.description}
              onChange={(e) => setNewKb({ ...newKb, description: e.target.value })}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            <button onClick={handleCreateKb} className="px-5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">创建</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* 知识库列表 */}
        <div className="col-span-1 space-y-2">
          {kbs.map((kb) => (
            <div key={kb.id} onClick={() => setSelectedKb(kb.id)}
              className={`p-4 rounded-xl cursor-pointer transition ${
                selectedKb === kb.id ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-slate-200 hover:border-slate-300'
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={16} className={selectedKb === kb.id ? 'text-blue-600' : 'text-slate-500'} />
                <p className={`font-medium text-sm ${selectedKb === kb.id ? 'text-blue-700' : 'text-slate-700'}`}>{kb.name}</p>
              </div>
              <p className="text-xs text-slate-400">{kb.doc_count || 0} 个文档 · {kb.chunk_count || 0} 个片段</p>
            </div>
          ))}
          {kbs.length === 0 && !loading && (
            <p className="text-center text-slate-400 text-sm py-8">还没有知识库</p>
          )}
        </div>

        {/* 文档列表 */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-100">
          {selectedKb && (
            <>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">文档列表</h3>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={handleUpload} className="hidden" />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition disabled:opacity-50">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  上传文档
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {docs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      {statusIcon(doc.status)}
                      <div>
                        <p className="text-sm font-medium text-slate-700">{doc.filename}</p>
                        <p className="text-xs text-slate-400">
                          {doc.status === 'completed' ? `${doc.chunk_count} 个片段` : doc.status === 'processing' ? '处理中...' : doc.status === 'failed' ? doc.error_message : '待处理'}
                        </p>
                      </div>
                    </div>
                    <button onClick={async () => { await knowledgeApi.deleteDoc(selectedKb, doc.id); loadDocs(selectedKb) }}
                      className="text-slate-400 hover:text-red-500 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {docs.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-12">还没有文档，点击上方上传</p>
                )}
              </div>
            </>
          )}
          {!selectedKb && (
            <div className="p-12 text-center text-slate-400">
              <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">选择左侧知识库查看文档</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
