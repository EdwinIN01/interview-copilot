import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useInterviewStore } from '../stores/useInterviewStore'
import { wsClient } from '../lib/wsClient'
import { interviewApi } from '../lib/api'
import { Send, LogOut, Clock, Bot, User, Loader2, Code2 } from 'lucide-react'
import CodeEditor from '../components/CodeEditor'

export default function InterviewRoom() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalSecondsRef = useRef(30 * 60) // 默认30分钟
  const timerStartedRef = useRef(false)

  const {
    status, phase, currentQuestionNum, currentQuestion, messages,
    inputText, isAITyping, remainingSeconds, reportId, totalScore,
    setStatus, setPhase, addMessage, appendToLastAIMessage, removeMessage, setInputText,
    setIsAITyping, setRemainingSeconds, setCurrentQuestion, setReport, setInterviewId,
  } = useInterviewStore()

  const [connected, setConnected] = useState(false)
  const [showCodeEditor, setShowCodeEditor] = useState(false)
  const [interviewDetail, setInterviewDetail] = useState<any>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    if (!id) return
    setInterviewId(id)
    // 先获取面试详情，设置时长
    interviewApi.get(id).then((res: any) => {
      const data = res.data
      const duration = data?.duration_minutes || 30
      totalSecondsRef.current = duration * 60
      setRemainingSeconds(duration * 60)
      setInterviewDetail(data)
      // 如果开启了代码模式，默认显示代码编辑器
      if (data?.code_enabled) {
        setShowCodeEditor(true)
      }
      console.log(`[Timer] 面试时长: ${duration}分钟, 总秒数: ${duration * 60}`)
    }).catch((e) => {
      console.error('获取面试详情失败:', e)
    })
    connectWS(id)
    return () => {
      wsClient.disconnect()
      if (timerRef.current) clearInterval(timerRef.current)
      timerStartedRef.current = false
    }
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startTimer = () => {
    if (timerStartedRef.current) {
      console.log('[Timer] 计时器已启动，跳过')
      return
    }
    if (timerRef.current) clearInterval(timerRef.current)
    timerStartedRef.current = true
    let elapsed = 0
    console.log(`[Timer] 启动计时器, 总秒数: ${totalSecondsRef.current}`)
    timerRef.current = setInterval(() => {
      elapsed++
      const remaining = Math.max(0, totalSecondsRef.current - elapsed)
      setRemainingSeconds(remaining)
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current)
        console.log('[Timer] 时间到')
      }
    }, 1000)
  }

  const connectWS = (interviewId: string) => {
    wsClient.connect(interviewId)

    wsClient.on('server:connected', () => {
      setConnected(true)
      setStatus('connected')
      startTimer()
    })

    // 开场
    wsClient.on('server:opening', (data) => {
      if (useInterviewStore.getState().messages.length === 0 ||
          useInterviewStore.getState().messages[useInterviewStore.getState().messages.length - 1]?.type !== 'opening') {
        addMessage({ role: 'ai', type: 'opening', content: data.delta || '' })
      } else {
        appendToLastAIMessage(data.delta || '')
      }
      setIsAITyping(true)
    })
    wsClient.on('server:opening_end', () => {
      setIsAITyping(false)
      startTimer() // 备用：开场结束时启动计时器
    })

    // 问题
    wsClient.on('server:question_chunk', (data) => {
      const last = useInterviewStore.getState().messages[useInterviewStore.getState().messages.length - 1]
      if (last && last.type === 'question') {
        appendToLastAIMessage(data.delta || '')
      } else {
        addMessage({ role: 'ai', type: 'question', content: data.delta || '' })
      }
      setIsAITyping(true)
    })
    wsClient.on('server:question_end', (data) => {
      // 去重：检查所有 question 消息，如果有内容完全相同的，删除后面的重复项
      const msgs = useInterviewStore.getState().messages
      const seen = new Set<string>()
      const toRemove: string[] = []
      for (const m of msgs) {
        if (m.type === 'question') {
          if (seen.has(m.content)) {
            toRemove.push(m.id)
          } else {
            seen.add(m.content)
          }
        }
      }
      toRemove.forEach((id) => removeMessage(id))
      setCurrentQuestion(data.question_num, data.content)
      setPhase('technical')
      setIsAITyping(false)
    })

    // 追问
    wsClient.on('server:followup_chunk', (data) => {
      const last = useInterviewStore.getState().messages[useInterviewStore.getState().messages.length - 1]
      if (last && last.type === 'followup') {
        appendToLastAIMessage(data.delta || '')
      } else {
        addMessage({ role: 'ai', type: 'followup', content: data.delta || '' })
      }
      setIsAITyping(true)
    })
    wsClient.on('server:followup_end', () => setIsAITyping(false))

    // 评估结果
    wsClient.on('server:evaluation', (data) => {
      const scoreColor = data.overall_score >= 7 ? 'text-green-600' : data.overall_score >= 5 ? 'text-amber-600' : 'text-red-600'
      addMessage({
        role: 'ai',
        type: 'evaluation',
        content: `【评分】${data.overall_score}/10\n技术深度: ${data.tech_depth} | 表达逻辑: ${data.expression} | 应变能力: ${data.adaptability} | 基础知识: ${data.foundation}\n\n点评：${data.comment}${data.weak_points?.length ? '\n薄弱点：' + data.weak_points.join('、') : ''}`,
      })
    })

    // 反问
    wsClient.on('server:reverse_question', (data) => {
      addMessage({ role: 'ai', type: 'reverse', content: data.content })
      setPhase('reverse')
    })
    wsClient.on('server:reverse_answer', (data) => {
      addMessage({ role: 'ai', type: 'reverse_answer', content: data.content })
    })

    // 结束
    wsClient.on('server:interview_ended', (data) => {
      setStatus('ended')
      setReport(data.report_id, 0)
      if (timerRef.current) clearInterval(timerRef.current)
    })
    wsClient.on('server:report_ready', (data) => {
      setReport(data.report_id, data.total_score)
      if (timerRef.current) clearInterval(timerRef.current)
      setTimeout(() => navigate(`/interviews/${id}/report`), 1500)
    })

    wsClient.on('pong', () => {})
  }

  const handleSend = () => {
    if (!inputText.trim() || isAITyping || sendingRef.current) return
    sendingRef.current = true
    const content = inputText.trim()
    addMessage({ role: 'user', type: phase === 'followup' ? 'followup_answer' : 'answer', content })
    wsClient.send(phase === 'followup' ? 'client:followup_answer' : 'client:answer', { content })
    setInputText('')
    setIsAITyping(true)
    // 2秒后允许再次发送（防止重复点击）
    setTimeout(() => { sendingRef.current = false }, 2000)
  }

  const handleEnd = () => {
    if (confirm('确定要结束面试吗？结束后将生成面试报告。')) {
      wsClient.send('client:end_interview')
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-slate-800">AI 模拟面试</h1>
          {currentQuestionNum > 0 && (
            <span className="text-sm text-slate-500">第 {currentQuestionNum} 题</span>
          )}
          <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500">
            {phase === 'opening' ? '开场' : phase === 'followup' ? '追问' : phase === 'reverse' ? '反问环节' : phase === 'summary' ? '总结中' : '技术面试'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1.5 text-sm ${remainingSeconds < 180 ? 'text-red-500' : 'text-slate-600'}`}>
            <Clock size={16} />
            {formatTime(remainingSeconds)}
          </div>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-300'}`} />
          <button
            onClick={() => setShowCodeEditor(!showCodeEditor)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition ${
              showCodeEditor ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Code2 size={16} /> 代码
          </button>
          <button onClick={handleEnd}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition">
            <LogOut size={16} /> 结束面试
          </button>
        </div>
      </div>

      {/* 当前问题卡片 */}
      {currentQuestion && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
          <p className="text-sm text-blue-600 font-medium mb-0.5">当前问题</p>
          <p className="text-slate-800">{currentQuestion}</p>
        </div>
      )}

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {!connected && (
            <div className="text-center py-20">
              <Loader2 size={32} className="animate-spin mx-auto text-slate-400 mb-3" />
              <p className="text-slate-500">正在连接面试房间...</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'ai' ? 'bg-blue-100' : 'bg-slate-200'
              }`}>
                {msg.role === 'ai' ? <Bot size={18} className="text-blue-600" /> : <User size={18} className="text-slate-600" />}
              </div>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.type === 'evaluation'
                    ? 'bg-green-50 text-green-800 border border-green-200 rounded-tl-sm'
                    : msg.role === 'ai'
                    ? 'bg-white text-slate-800 rounded-tl-sm shadow-sm'
                    : 'bg-blue-600 text-white rounded-tr-sm'
                } ${msg.type === 'question' ? 'border-l-4 border-blue-500' : ''} ${msg.type === 'followup' ? 'border-l-4 border-amber-500' : ''}`}>
                  {msg.content}
                  {isAITyping && msg.id === messages[messages.length - 1]?.id && msg.role === 'ai' && (
                    <span className="typing-cursor" />
                  )}
                </div>
                {msg.type === 'followup' && (
                  <p className="text-xs text-amber-600 mt-1 ml-1">追问</p>
                )}
                {msg.type === 'evaluation' && (
                  <p className="text-xs text-green-600 mt-1 ml-1">AI 评分</p>
                )}
              </div>
            </div>
          ))}
          {isAITyping && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-blue-600" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区 */}
      <div className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={phase === 'reverse' ? '向面试官提问...' : isAITyping ? 'AI 正在思考，请稍候...' : '输入你的回答...'}
            disabled={isAITyping || status === 'ended'}
            rows={2}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button onClick={handleSend} disabled={!inputText.trim() || isAITyping || status === 'ended'}
            className="px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <Send size={18} />
            发送
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-2">Enter 发送，Shift+Enter 换行</p>
      </div>

      {/* 代码编辑器 */}
      {showCodeEditor && interviewDetail && (
        <div className="border-t border-slate-700">
          <CodeEditor
            interviewId={id!}
            initialCode={interviewDetail.code_content}
            initialLanguage={interviewDetail.code_language || 'python'}
            readOnly={status === 'ended'}
          />
        </div>
      )}
    </div>
  )
}
