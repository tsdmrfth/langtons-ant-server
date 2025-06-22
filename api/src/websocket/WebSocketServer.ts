import { Server } from 'http'
import { RawData, WebSocket, WebSocketServer as WSServer } from 'ws'
import { GameEngine } from '../game/GameEngine'
import {
  ErrorPayload,
  GameConfig,
  GameStateSnapshot,
  PlaceAntPayload,
  PlaceAntResponsePayload,
  RuleChangePayload,
  RuleChangeResponsePayload,
  TileFlipPayload,
  TileFlipResponsePayload,
  WebSocketMessage
} from '../types/game'

const RATE_LIMIT_WINDOW_MS = 1000
const MAX_MESSAGES_PER_WINDOW = 30
const VALID_INCOMING_MESSAGE_TYPES = [
  'PLACE_ANT',
  'RULE_CHANGE',
  'TILE_FLIP',
]

export class WebSocketServer {
  private wss: WSServer
  private gameEngine: GameEngine
  private clients: Map<string, WebSocket>
  private gameLoop: NodeJS.Timeout | null
  private rateLimitCounters: Map<string, { count: number, windowStart: number }>
  private allowedOrigins: string[]
  private config: GameConfig

  constructor(server: Server, config: GameConfig, allowedOrigins: string[] = []) {
    this.allowedOrigins = allowedOrigins
    this.wss = new WSServer({
      server,
      perMessageDeflate: true,
      verifyClient: (info, done) => {
        if (this.allowedOrigins.length === 0) return done(true)
        const origin = info.origin || ''
        const isAllowed = this.allowedOrigins.includes(origin)
        return done(isAllowed, isAllowed ? undefined : 403, 'Forbidden origin')
      }
    })

    this.gameEngine = new GameEngine(config)
    this.clients = new Map()
    this.rateLimitCounters = new Map()
    this.gameLoop = null
    this.config = config
    this.initialize()
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      try {
        const player = this.gameEngine.addPlayer()
        const socket = ws as WebSocket & {
          isAlive?: boolean
          playerId?: string
        }
        socket.isAlive = true
        socket.playerId = player.id
        this.clients.set(player.id, socket)
        const fullState = this.gameEngine.getFullState()
        this.sendToClient(socket, {
          type: 'WELCOME',
          payload: {
            player,
            gameState: {
              ants: fullState.ants,
              cells: Object.fromEntries(fullState.cells)
            }
          }
        })

        this.broadcastGameState({
          type: 'PLAYER_JOIN',
          payload: { playerId: player.id, color: player.color }
        })
        socket.on('message', (data: RawData) => {
          if (this.isRateLimited(player.id)) {
            this.handleError(socket, new Error('Rate limit exceeded'))
            return
          }

          const raw = typeof data === 'string' ? data : data.toString()
          const message: WebSocketMessage = JSON.parse(raw)

          try {
            this.validateMessage(message)
          } catch (error) {
            this.handleError(socket, error)
            return
          }

          this.handleMessage(player.id, message)
        })
        socket.on('close', () => {
          this.handleDisconnect(player.id)
        })
        socket.on('error', (error) => {
          this.handleError(socket, error)
        })
        socket.on('pong', () => {
          socket.isAlive = true
        })
      } catch (error) {
        this.handleError(ws, error)
      }
    })

    const heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach(client => {
        const socket = client as WebSocket & {
          isAlive?: boolean
          playerId?: string
        }

        if (socket.isAlive === false) {
          if (socket.playerId) {
            this.handleDisconnect(socket.playerId)
          }
          return socket.terminate()
        }

        socket.isAlive = false
        try {
          socket.ping()
        } catch (error) {
          socket.terminate()
        }
      })
    }, this.config.heartbeatInterval)
    this.wss.on('close', () => clearInterval(heartbeatInterval))
    this.startGameLoop()
  }

  private validateMessage(message: WebSocketMessage): void {
    if (!message.type) {
      throw new Error('Invalid message format: missing type')
    }

    if (!message.payload) {
      throw new Error('Invalid message format: missing payload')
    }

    if (!VALID_INCOMING_MESSAGE_TYPES.includes(message.type)) {
      throw new Error(`Invalid message type: ${message.type}`)
    }
  }

  private handleMessage(playerId: string, incomingMessage: WebSocketMessage): void {
    const client = this.clients.get(playerId)

    if (!client) {
      console.error('No active client for player:', playerId)
      return
    }

    switch (incomingMessage.type) {
      case 'PLACE_ANT':
        this.handlePlaceAntMessage(client, playerId, incomingMessage)
        break
      case 'RULE_CHANGE':
        this.handleRuleChangeMessage(client, playerId, incomingMessage)
        break
      case 'TILE_FLIP':
        this.handleTileFlipMessage(client, playerId, incomingMessage)
        break
      default:
        break
    }
  }

  private handlePlaceAntMessage(client: WebSocket, playerId: string, incomingMessage: WebSocketMessage): void {
    const { position, rules } = incomingMessage.payload as PlaceAntPayload
    try {
      const ant = this.gameEngine.placeAnt(playerId, position, rules)
      const snapshot = this.gameEngine.getGameStateSnapshot()
      const responsePayload: PlaceAntResponsePayload = {
        ant,
        cells: Object.fromEntries(snapshot.cells)
      }
      this.broadcastGameState({
        type: 'PLACE_ANT',
        payload: responsePayload
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleRuleChangeMessage(client: WebSocket, playerId: string, incomingMessage: WebSocketMessage): void {
    const { rules } = incomingMessage.payload as RuleChangePayload
    try {
      this.gameEngine.updateRules(playerId, rules)
      const responsePayload: RuleChangeResponsePayload = {
        playerId,
        rules
      }
      this.broadcastGameState({
        type: 'RULE_CHANGE',
        payload: responsePayload
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleTileFlipMessage(client: WebSocket, playerId: string, incomingMessage: WebSocketMessage): void {
    const { position } = incomingMessage.payload as TileFlipPayload
    try {
      this.gameEngine.flipTile(playerId, position)
      const snapshot = this.gameEngine.getGameStateSnapshot()
      const responsePayload: TileFlipResponsePayload = {
        cells: Object.fromEntries(snapshot.cells)
      }
      this.broadcastGameState({
        type: 'TILE_FLIP',
        payload: responsePayload
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleDisconnect(playerId: string): void {
    try {
      const { clearedCells, antId } = this.gameEngine.removePlayer(playerId)
      this.clients.delete(playerId)

      const message: WebSocketMessage = {
        type: 'PLAYER_LEAVE',
        payload: { playerId, cells: Object.fromEntries(clearedCells) }
      }
      this.broadcastGameState(message)
    } catch (error) {
      if (!(error instanceof Error && error.message === 'Player not found')) {
        console.error('Error handling disconnect:', error)
      }
    }
  }

  private handleError(ws: WebSocket, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorPayload: ErrorPayload = { message: errorMessage }
    this.sendToClient(ws, {
      type: 'ERROR',
      payload: errorPayload
    })
  }

  private startGameLoop(): void {
    this.gameLoop = setInterval(() => {
      try {
        this.gameEngine.tick()
        this.broadcastGameStateSnapshot()
      } catch (error) {
        console.error('Error in game loop:', error)
      }
    }, this.config.tickInterval)
  }

  private broadcastGameStateSnapshot() {
    const snapshot: GameStateSnapshot = this.gameEngine.getGameStateSnapshot()

    if (snapshot.ants.length === 0 && snapshot.cells.size === 0) {
      return
    }

    const message: WebSocketMessage = {
      type: 'GAME_STATE_SNAPSHOT',
      payload: {
        ants: snapshot.ants,
        cells: Object.fromEntries(snapshot.cells),
      },
    }
    this.broadcastGameState(message)
  }

  private broadcastGameState(message: WebSocketMessage): void {
    this.clients.forEach(client => {
      this.sendToClient(client, message)
    })
  }

  private sendToClient(client: WebSocket, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending message to client:', error)
      }
    }
  }

  public stop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop)
      this.gameLoop = null
    }
    this.wss.close()
  }

  private isRateLimited(playerId: string): boolean {
    const now = Date.now()
    const counter = this.rateLimitCounters.get(playerId) || { count: 0, windowStart: now }

    if (now - counter.windowStart > RATE_LIMIT_WINDOW_MS) {
      counter.count = 1
      counter.windowStart = now
      this.rateLimitCounters.set(playerId, counter)
      return false
    }

    counter.count += 1
    this.rateLimitCounters.set(playerId, counter)
    return counter.count > MAX_MESSAGES_PER_WINDOW
  }
} 