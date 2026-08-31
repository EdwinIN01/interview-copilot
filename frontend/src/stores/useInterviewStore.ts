import { create } from 'zustand'

interface Message {
  id: string
  role: 'ai' | 'user' | 'system'
  type: string
  content: string
  questionNum?: number
  timestamp: string
}

interface InterviewState {
  interviewId: string | null
  status: 'idle' | 'connecting' | 'connected' | 'in_progress' | 'ended'
  phase: string
  currentQuestionNum: number
  currentQuestion: string
  messages: Message[]
  inputText: string
  isAITyping: boolean
  remainingSeconds: number
  totalSeconds: number
  reportId: string | null
  totalScore: number | null

  setInterviewId: (id: string) => void
  setStatus: (status: InterviewState['status']) => void
  setPhase: (phase: string) => void
  addMessage: (msg: Omit<Message, 'id' | 'timestamp'>) => void
  appendToLastAIMessage: (delta: string) => void
  removeMessage: (id: string) => void
  setInputText: (text: string) => void
  setIsAITyping: (typing: boolean) => void
  setRemainingSeconds: (seconds: number) => void
  setCurrentQuestion: (num: number, content: string) => void
  setReport: (reportId: string, score: number) => void
  reset: () => void
}

let msgIdCounter = 0

export const useInterviewStore = create<InterviewState>((set) => ({
  interviewId: null,
  status: 'idle',
  phase: '',
  currentQuestionNum: 0,
  currentQuestion: '',
  messages: [],
  inputText: '',
  isAITyping: false,
  remainingSeconds: 0,
  totalSeconds: 0,
  reportId: null,
  totalScore: null,

  setInterviewId: (id) => set({ interviewId: id }),
  setStatus: (status) => set({ status }),
  setPhase: (phase) => set({ phase }),

  addMessage: (msg) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...msg, id: `msg_${++msgIdCounter}`, timestamp: new Date().toISOString() },
      ],
    })),

  appendToLastAIMessage: (delta) =>
    set((state) => {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'ai') {
        msgs[msgs.length - 1] = { ...last, content: last.content + delta }
      }
      return { messages: msgs }
    }),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  setInputText: (text) => set({ inputText: text }),
  setIsAITyping: (typing) => set({ isAITyping: typing }),
  setRemainingSeconds: (seconds) => set({ remainingSeconds: seconds }),
  setCurrentQuestion: (num, content) => set({ currentQuestionNum: num, currentQuestion: content }),
  setReport: (reportId, score) => set({ reportId, totalScore: score }),

  reset: () =>
    set({
      interviewId: null,
      status: 'idle',
      phase: '',
      currentQuestionNum: 0,
      currentQuestion: '',
      messages: [],
      inputText: '',
      isAITyping: false,
      remainingSeconds: 0,
      reportId: null,
      totalScore: null,
    }),
}))
