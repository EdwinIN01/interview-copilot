type MessageHandler = (data: any) => void

class WsClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<MessageHandler>>()
  private reconnectAttempts = 0
  private maxReconnect = 5
  private interviewId = ''
  private token = ''
  private manuallyClosed = false
  private connecting = false

  // 获取 WebSocket 基础地址
  private getWSBaseUrl(): string {
    // 优先使用环境变量
    if (import.meta.env.VITE_WS_BASE_URL) {
      return import.meta.env.VITE_WS_BASE_URL
    }
    // 从 API baseURL 推导
    const apiBase = import.meta.env.VITE_API_BASE_URL
    if (apiBase) {
      return apiBase.replace(/^http/, 'ws').replace(/\/api\/v1$/, '')
    }
    // 开发环境用当前 host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}`
  }

  connect(interviewId: string) {
    // 防重复连接：如果已经连接了同一个 interview，直接返回
    if (this.ws && this.interviewId === interviewId && this.ws.readyState === WebSocket.OPEN) {
      console.log('WS already connected, skip')
      return
    }
    if (this.connecting) {
      console.log('WS is connecting, skip')
      return
    }

    this.connecting = true
    this.manuallyClosed = false
    this.interviewId = interviewId
    this.token = localStorage.getItem('token') || ''
    const wsBase = this.getWSBaseUrl()
    const wsUrl = `${wsBase}/ws/interview/${interviewId}?token=${this.token}`
    console.log('WS connecting to:', wsUrl)

    // 关闭旧连接
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      this.connecting = false
      this.reconnectAttempts = 0
      this.emit('connected', {})
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        this.emit(msg.type, msg.data)
      } catch (e) {
        console.error('WS message parse error', e)
      }
    }

    this.ws.onclose = () => {
      this.connecting = false
      if (!this.manuallyClosed && this.reconnectAttempts < this.maxReconnect) {
        setTimeout(() => {
          if (!this.manuallyClosed) {
            this.reconnectAttempts++
            this.connect(this.interviewId)
          }
        }, 2000 * this.reconnectAttempts)
      }
    }

    this.ws.onerror = (e) => {
      console.error('WS error', e)
    }
  }

  send(type: string, data: any = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)
    return () => this.handlers.get(type)?.delete(handler)
  }

  private emit(type: string, data: any) {
    this.handlers.get(type)?.forEach((h) => h(data))
  }

  disconnect() {
    this.manuallyClosed = true
    this.reconnectAttempts = this.maxReconnect // 停止重连
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.handlers.clear()
    this.connecting = false
  }
}

export const wsClient = new WsClient()
