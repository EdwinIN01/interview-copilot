import axios from 'axios'

// 生产环境使用环境变量配置的后端地址，开发环境用相对路径（Vite代理）
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL,
  timeout: 60000,
})

// WebSocket 地址
export const getWSUrl = (interviewId: string) => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return `${import.meta.env.VITE_WS_BASE_URL}/ws/interview/${interviewId}`
  }
  // 开发环境用当前 host
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/interview/${interviewId}`
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data: { username: string; email: string; password: string; nickname?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username_or_email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

export const userApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: {
    nickname?: string
    avatar_url?: string
    target_role?: string
    graduation_year?: number
    role_detail?: string
    tech_stack?: string
    target_company?: string
    job_description?: string
  }) =>
    api.put('/users/profile', data),
  getStats: () => api.get('/users/stats'),
}

export const resumeApi = {
  list: () => api.get('/resumes'),
  upload: (file: File, name: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('name', name)
    return api.post('/resumes/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  get: (id: string) => api.get(`/resumes/${id}`),
  update: (id: string, data: any) => api.put(`/resumes/${id}`, data),
  delete: (id: string) => api.delete(`/resumes/${id}`),
}

export const interviewApi = {
  create: (data: any) => api.post('/interviews', data),
  list: (params?: any) => api.get('/interviews', { params }),
  get: (id: string) => api.get(`/interviews/${id}`),
  start: (id: string) => api.post(`/interviews/${id}/start`),
  end: (id: string) => api.post(`/interviews/${id}/end`),
  messages: (id: string) => api.get(`/interviews/${id}/messages`),
  report: (id: string) => api.get(`/interviews/${id}/report`),
  regenerateReport: (id: string) => api.post(`/interviews/${id}/regenerate-report`),
  share: (id: string) => api.post(`/interviews/${id}/share`),
  saveCode: (id: string, data: any) => api.put(`/interviews/${id}/code`, data),
  delete: (id: string) => api.delete(`/interviews/${id}`),
}

// 公开接口（不需要 token）
export const publicApi = {
  getSharedReport: (token: string) => api.get(`/interviews/share/${token}`),
}

export const knowledgeApi = {
  list: () => api.get('/knowledge-bases'),
  create: (data: { name: string; description?: string; role_category?: string }) =>
    api.post('/knowledge-bases', data),
  delete: (id: string) => api.delete(`/knowledge-bases/${id}`),
  docs: (kbId: string) => api.get(`/knowledge-bases/${kbId}/docs`),
  uploadDoc: (kbId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/knowledge-bases/${kbId}/docs/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  deleteDoc: (kbId: string, docId: string) => api.delete(`/knowledge-bases/${kbId}/docs/${docId}`),
}

export default api
