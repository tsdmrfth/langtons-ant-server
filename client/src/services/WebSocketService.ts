import { MAX_RECONNECT_ATTEMPTS, RECONNECT_DELAY } from '@/config/constants'
import { toast } from '@/hooks/use-toast'
import { IncomingMessage, OutgoingMessage, WebSocketMessage } from '@/types/game'

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketCallbacks {
  onMessage?: (message: IncomingMessage) => void
  onConnectionChange?: (state: ConnectionState, error?: string) => void
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS
  private reconnectDelay = RECONNECT_DELAY
  private url: string
  private callbacks: WebSocketCallbacks = {}
  private connectionState: ConnectionState = 'disconnected'
  private messageQueue: OutgoingMessage[] = []

  constructor(url: string) {
    this.url = url
  }

  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks
  }

  connect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState('error', 'Max reconnection attempts reached')
      return
    }

    this.updateConnectionState('connecting')

    try {
      this.ws = new WebSocket(this.url)
      this.ws.onopen = () => {
        this.updateConnectionState('connected')
        this.reconnectAttempts = 0

        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }

        this.flushMessageQueue()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: IncomingMessage = JSON.parse(event.data)
          this.validateMessage(message)
          this.callbacks.onMessage?.(message)
        } catch (error) {
          this.handleError('Invalid message format received')
        }
      }

      this.ws.onclose = (event) => {
        const error = this.getCloseError(event)
        this.updateConnectionState('disconnected', error)

        if (event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {
        this.updateConnectionState('error', 'Connection error occurred')
        this.handleError('Connection error occurred')
      }
    } catch (error) {
      this.updateConnectionState('error', 'Failed to establish connection')
      this.handleError('Failed to establish connection')
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.reconnectAttempts = 0
    this.messageQueue = []
    this.updateConnectionState('disconnected')
  }

  sendMessage(message: OutgoingMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
      } catch (error) {
        this.handleError('Failed to send message')
      }
    } else {
      this.messageQueue.push(message)
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState('error', 'Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    this.reconnectTimeout = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()

      if (message) {
        this.sendMessage(message)
      }
    }
  }

  private getCloseError(event: CloseEvent): string | undefined {
    if (event.code === 1000) return undefined

    const errorMessages: Record<number, string> = {
      1001: 'Server going away',
      1002: 'Protocol error',
      1003: 'Unsupported data type',
      1005: 'No status received',
      1006: 'Abnormal closure',
      1007: 'Invalid frame payload data',
      1008: 'Policy violation',
      1009: 'Message too big',
      1010: 'Client terminating',
      1011: 'Server error',
      1012: 'Service restart',
      1013: 'Try again later',
      1014: 'Bad gateway',
      1015: 'TLS handshake failed'
    }
    return errorMessages[event.code] || `Connection closed with code ${event.code}`
  }

  private handleError(message: string) {
    this.updateConnectionState('error', message)
    toast({
      title: 'Connection Error',
      description: message,
      variant: 'destructive'
    })
  }

  private updateConnectionState(state: ConnectionState, error?: string) {
    this.connectionState = state
    this.callbacks.onConnectionChange?.(state, error)
  }

  private validateMessage(message: WebSocketMessage) {
    if (!message || typeof message !== 'object') {
      throw new Error('Invalid message structure')
    }
    
    if (!message.type || typeof message.type !== 'string') {
      throw new Error('Message missing type field')
    }
    
    if (!message.payload && message.type !== 'ERROR') {
      throw new Error('Message missing payload field')
    }
    
    return true
  }
}

export default WebSocketService 