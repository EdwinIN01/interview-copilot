import { useState, useEffect, useRef, useCallback } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { go } from '@codemirror/lang-go'
import { rust } from '@codemirror/lang-rust'
import { sql } from '@codemirror/lang-sql'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { ChevronDown, ChevronUp, Save, CheckCircle, Code2 } from 'lucide-react'

interface CodeEditorProps {
  interviewId: string
  initialCode?: string
  initialLanguage?: string
  onSave?: (code: string, language: string) => void
  readOnly?: boolean
}

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
]

const DEFAULT_CODE: Record<string, string> = {
  python: '# 在这里编写你的代码\n# 面试过程中可以随时切换语言\n\ndef solution():\n    pass\n',
  javascript: '// 在这里编写你的代码\n\nfunction solution() {\n    \n}\n',
  typescript: '// 在这里编写你的代码\n\nfunction solution(): void {\n    \n}\n',
  java: '// 在这里编写你的代码\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n',
  cpp: '// 在这里编写你的代码\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  c: '// 在这里编写你的代码\n\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  go: '// 在这里编写你的代码\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello")\n}\n',
  rust: '// 在这里编写你的代码\n\nfn main() {\n    println!("Hello");\n}\n',
  sql: '-- 在这里编写你的 SQL\n\nSELECT * FROM table_name;\n',
  html: '<!DOCTYPE html>\n<html>\n<head>\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n',
  css: '/* 在这里编写你的 CSS */\n\n.container {\n    \n}\n',
  json: '{\n    "key": "value"\n}\n',
}

// 获取语言扩展
const getLanguageExtension = (lang: string) => {
  switch (lang) {
    case 'python': return python()
    case 'javascript': return javascript()
    case 'typescript': return javascript({ typescript: true })
    case 'java': return java()
    case 'cpp': return cpp()
    case 'c': return cpp()
    case 'go': return go()
    case 'rust': return rust()
    case 'sql': return sql()
    case 'html': return html()
    case 'css': return css()
    case 'json': return json()
    default: return python()
  }
}

export default function CodeEditor({
  interviewId,
  initialCode = '',
  initialLanguage = 'python',
  onSave,
  readOnly = false,
}: CodeEditorProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [language, setLanguage] = useState(initialLanguage)
  const [code, setCode] = useState(initialCode || DEFAULT_CODE[initialLanguage] || '')
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem('codeEditorHeight')
    return saved ? parseInt(saved, 10) : 320
  })
  const [isDragging, setIsDragging] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeRef = useRef(code)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  const MIN_HEIGHT = 200
  const MAX_HEIGHT = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 500

  // 保持 codeRef 同步
  useEffect(() => {
    codeRef.current = code
  }, [code])

  // 初始化代码
  useEffect(() => {
    const initCode = initialCode || DEFAULT_CODE[initialLanguage] || ''
    setCode(initCode)
    setLanguage(initialLanguage)
  }, [initialCode, initialLanguage])

  // 保存代码
  const saveCode = useCallback(async (codeToSave: string, lang: string) => {
    if (readOnly) return
    setSaving(true)
    try {
      const { interviewApi } = await import('../lib/api')
      await interviewApi.saveCode(interviewId, {
        code_content: codeToSave,
        code_language: lang,
      })
      setSaved(true)
      onSave?.(codeToSave, lang)
    } catch (e) {
      console.error('保存代码失败', e)
    } finally {
      setSaving(false)
    }
  }, [interviewId, onSave, readOnly])

  // 防抖保存
  const triggerSave = useCallback((newCode: string, lang: string) => {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveCode(newCode, lang)
    }, 1500)
  }, [saveCode])

  // 初始化编辑器
  useEffect(() => {
    if (!editorRef.current || collapsed) return

    const startState = EditorState.create({
      doc: codeRef.current,
      extensions: [
        basicSetup,
        getLanguageExtension(language),
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.theme({
          '&': {
            fontSize: '20px',
            backgroundColor: '#ffffff',
          },
          '.cm-content': {
            fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            lineHeight: '1.7',
            padding: '12px 0',
            color: '#1e293b',
          },
          '.cm-gutters': {
            fontSize: '14px',
            backgroundColor: '#f8fafc',
            color: '#94a3b8',
            border: 'none',
            borderRight: '1px solid #e2e8f0',
          },
          '.cm-lineNumbers .cm-gutterElement': {
            padding: '0 12px 0 10px',
          },
          '.cm-activeLine': {
            backgroundColor: '#f1f5f9',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#e2e8f0',
            color: '#64748b',
          },
          '.cm-selectionBackground': {
            backgroundColor: '#bfdbfe !important',
          },
          '.cm-cursor': {
            borderLeftColor: '#3b82f6',
            borderLeftWidth: '2px',
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString()
            setCode(newCode)
            triggerSave(newCode, language)
          }
        }),
      ],
    })

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    })
    viewRef.current = view

    // 聚焦编辑器
    view.focus()

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [collapsed, language, readOnly, triggerSave])

  // 语言切换
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value
    setLanguage(newLang)

    // 如果当前代码是默认模板，切换到新语言的默认模板
    const isDefault = Object.values(DEFAULT_CODE).some((t) => t.trim() === code.trim())
    if (!code.trim() || isDefault) {
      const newCode = DEFAULT_CODE[newLang] || ''
      setCode(newCode)
      // 更新编辑器内容
      if (viewRef.current) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: viewRef.current.state.doc.length,
            insert: newCode,
          },
        })
      }
      triggerSave(newCode, newLang)
    } else {
      triggerSave(code, newLang)
    }
  }

  // 手动保存
  const handleManualSave = () => {
    saveCode(code, language)
  }

  // 拖拽调整高度
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    const startY = e.clientY
    const startHeight = height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault()
      const deltaY = startY - moveEvent.clientY
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY))
      setHeight(newHeight)
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault()
      setIsDragging(false)
      const deltaY = startY - upEvent.clientY
      const finalHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY))
      localStorage.setItem('codeEditorHeight', finalHeight.toString())
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      // 拖拽结束后重新布局编辑器
      setTimeout(() => {
        if (viewRef.current) {
          viewRef.current.requestMeasure()
        }
      }, 50)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // 高度变化时重新布局编辑器
  useEffect(() => {
    if (viewRef.current && !isDragging) {
      setTimeout(() => {
        viewRef.current?.requestMeasure()
      }, 50)
    }
  }, [height, isDragging])

  if (collapsed) {
    return (
      <div className="bg-white rounded-t-xl border border-slate-200 border-b-0 shadow-sm">
        <button
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition rounded-t-xl"
        >
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-green-600" />
            <span className="text-sm font-medium">代码编辑器</span>
            <span className="text-xs text-slate-400">({LANGUAGES.find(l => l.value === language)?.label})</span>
            {saved ? (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={12} /> 已保存
              </span>
            ) : (
              <span className="text-xs text-amber-600">未保存</span>
            )}
          </div>
          <ChevronUp size={16} />
        </button>
      </div>
    )
  }

  return (
    <>
      {/* 拖拽时的全屏遮罩，防止其他元素干扰 */}
      {isDragging && (
        <div
          className="fixed inset-0 z-[9999] cursor-row-resize"
          style={{ userSelect: 'none' }}
        />
      )}

      <div className={`bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm ${isDragging ? 'select-none' : ''}`}>
      {/* 拖拽手柄 */}
      <div
        onMouseDown={handleDragStart}
        className={`h-3 bg-slate-100 hover:bg-blue-100 cursor-row-resize transition-colors flex items-center justify-center group relative ${isDragging ? 'bg-blue-100' : ''}`}
        title="上下拖拽调整高度"
      >
        <div className="flex flex-col gap-0.5">
          <div className="w-10 h-0.5 bg-slate-400 group-hover:bg-blue-500 rounded-full transition-colors" />
          <div className="w-10 h-0.5 bg-slate-400 group-hover:bg-blue-500 rounded-full transition-colors" />
        </div>
        {isDragging && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            高度: {height}px
          </div>
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Code2 size={16} className="text-green-600" />
            <span className="text-sm font-medium text-slate-700">代码编辑器</span>
          </div>
          <select
            value={language}
            onChange={handleLanguageChange}
            disabled={readOnly}
            className="bg-white text-slate-700 text-xs rounded px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
          {saving ? (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              保存中...
            </span>
          ) : saved ? (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle size={12} /> 已保存
            </span>
          ) : (
            <span className="text-xs text-amber-600">未保存</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={handleManualSave}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition"
            >
              <Save size={12} />
              保存
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* 编辑器主体 */}
      <div
        ref={editorRef}
        className="overflow-auto"
        style={{ height: `${height}px`, minHeight: `${MIN_HEIGHT}px` }}
      />

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        <span>{LANGUAGES.find(l => l.value === language)?.label}</span>
        <span>UTF-8 · 空格: 4</span>
      </div>
    </div>
    </>
  )
}
