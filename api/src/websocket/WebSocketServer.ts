import { Server } from 'http'
import { RawData, WebSocket, WebSocketServer as WSServer } from 'ws'
import { GameEngine } from '../game/GameEngine'
import {
  Color,
  ErrorPayload,
  GameConfig,
  GameTickUpdate,
  IncomingMessage,
  OutgoingMessage,
  PlaceAntPayload,
  PlaceAntResponsePayload,
  RuleChangePayload,
  RuleChangeResponsePayload,
  TileFlipPayload,
  TileFlipResponsePayload,
  UpdateGameConfigPayload
} from '../types/game'
import logger from '../utils/logger'

const VALID_INCOMING_MESSAGE_TYPES = [
  'PLACE_ANT',
  'CHANGE_RULES',
  'FLIP_TILE',
  'UPDATE_GAME_CONFIG',
]

export class WebSocketServer {
  private wss: WSServer
  private gameEngine: GameEngine
  private clients: Map<string, WebSocket>
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
        const fullState = this.gameEngine.getState()
        this.sendToClient(socket, {
          type: 'WELCOME',
          payload: {
            player,
            state: {
              ants: fullState.ants,
              grid: {
                width: fullState.grid.width,
                height: fullState.grid.height,
                cells: {},
              },
            },
          },
        })

        if (fullState.grid.cells.size > 0) {
          this.sendGridInChunks(socket, fullState.grid.cells)
        }

        this.broadcastGameState({
          type: 'PLAYER_JOINED',
          payload: { playerId: player.id, color: player.color }
        })
        socket.on('message', (data: RawData) => {
          if (this.isRateLimited(player.id)) {
            this.handleError(socket, new Error('Rate limit exceeded'))
            return
          }

          const raw = typeof data === 'string' ? data : data.toString()
          let message: IncomingMessage

          try {
            message = JSON.parse(raw)
          } catch (error) {
            this.handleError(socket, new Error('Invalid JSON format'))
            return
          }

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
    this.gameEngine.startGameLoop(({ tickUpdate }) => {
      this.broadcastGameTickUpdate(tickUpdate)
    })
  }

  private validateMessage(message: IncomingMessage): void {
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

  private handleMessage(playerId: string, incomingMessage: IncomingMessage): void {
    const client = this.clients.get(playerId)

    if (!client) {
      return
    }

    switch (incomingMessage.type) {
      case 'PLACE_ANT':
        this.handlePlaceAntMessage(client, playerId, incomingMessage)
        break
      case 'CHANGE_RULES':
        this.handleRuleChangeMessage(client, playerId, incomingMessage)
        break
      case 'FLIP_TILE':
        this.handleTileFlipMessage(client, playerId, incomingMessage)
        break
      case 'UPDATE_GAME_CONFIG': {
        this.handleUpdateGameConfigMessage(client, playerId, incomingMessage)
        break
      }
      default:
        break
    }
  }

  private handlePlaceAntMessage(client: WebSocket, playerId: string, incomingMessage: IncomingMessage): void {
    const { position, rules } = incomingMessage.payload as PlaceAntPayload
    try {
      const ant = this.gameEngine.placeAnt(playerId, position, rules)
      const tickUpdate = this.gameEngine.getTickUpdate()
      const responsePayload: PlaceAntResponsePayload = {
        ant,
        playerId,
        cells: Object.fromEntries(tickUpdate.cells)
      }
      this.broadcastGameState({
        type: 'ANT_PLACED',
        payload: responsePayload
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleRuleChangeMessage(client: WebSocket, playerId: string, incomingMessage: IncomingMessage): void {
    const { rules } = incomingMessage.payload as RuleChangePayload
    try {
      this.gameEngine.updateRules(playerId, rules)
      const responsePayload: RuleChangeResponsePayload = {
        playerId,
        rules
      }
      this.broadcastGameState({
        type: 'RULES_CHANGED',
        payload: responsePayload
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleTileFlipMessage(client: WebSocket, playerId: string, incomingMessage: IncomingMessage): void {
    const { position } = incomingMessage.payload as TileFlipPayload
    try {
      const changedCells = this.gameEngine.flipTile(playerId, position)
      const responsePayload: TileFlipResponsePayload = {
        cells: Object.fromEntries(changedCells),
        playerId,
      }
      this.broadcastGameState({
        type: 'TILE_FLIPPED',
        payload: responsePayload
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleUpdateGameConfigMessage(client: WebSocket, playerId: string, incomingMessage: IncomingMessage): void {
    const { gridSize, tickInterval } = incomingMessage.payload as UpdateGameConfigPayload
    try {
      this.gameEngine.updateConfig(gridSize, tickInterval)
      this.broadcastGameState({
        type: 'GAME_CONFIG_UPDATED',
        payload: { gridSize, tickInterval }
      })
    } catch (error) {
      this.handleError(client, error)
    }
  }

  private handleDisconnect(playerId: string): void {
    let clearedCells: Map<string, Color> = new Map()
    try {
      clearedCells = this.gameEngine.removePlayer(playerId).clearedCells
    } catch (error) {
      // No player found, ignore
      return
    }

    this.clients.delete(playerId)
    this.rateLimitCounters.delete(playerId)
    try {
      const message: OutgoingMessage = {
        type: 'PLAYER_LEFT',
        payload: { playerId, cells: Object.fromEntries(clearedCells) }
      }
      this.broadcastGameState(message)
    } catch (error) {
      logger.error({ error }, 'Error broadcasting player left message')
    }
  }

  private handleError(ws: WebSocket, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const errorPayload: ErrorPayload = { message: errorMessage }

    if (ws.readyState === WebSocket.OPEN) {
      try {
        this.sendToClient(ws, {
          type: 'ERROR',
          payload: errorPayload
        })
      } catch (sendError) {
        logger.error({ error: sendError }, 'Failed to send error message to client')
      }
    }
  }

  private broadcastGameTickUpdate(tickUpdate: GameTickUpdate) {
    if (tickUpdate.ants.length === 0 && tickUpdate.cells.size === 0) {
      return
    }

    const message: OutgoingMessage = {
      type: 'GAME_TICK_UPDATE',
      payload: {
        ants: tickUpdate.ants,
        cells: Object.fromEntries(tickUpdate.cells),
      },
    }
    this.broadcastGameState(message)
  }

  private broadcastGameState(message: OutgoingMessage): void {
    const data = JSON.stringify(message)
    this.wss.clients.forEach(client => {
      if (client.readyState !== WebSocket.OPEN) return

      setImmediate(() => {
        try {
          client.send(data)
        } catch (error) {
          logger.error({ error }, 'Failed to send message to client')
        }
      })
    })
  }

  private sendToClient(client: WebSocket, message: OutgoingMessage): void {
    if (client.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      client.send(JSON.stringify(message))
    } catch (error) {
      logger.error({ error }, 'Failed to send message to client')
    }
  }

  public stop(reason: string = 'Server is shutting down'): void {
    this.gameEngine.stop()
    this.broadcastMessage(reason)
    this.wss.clients.forEach(client => {
      client.close(1000, reason)
    })
    this.wss.close()
  }

  public getGameState() {
    return this.gameEngine.getState()
  }

  private isRateLimited(playerId: string): boolean {
    const now = Date.now()
    const counter = this.rateLimitCounters.get(playerId) || { count: 0, windowStart: now }

    if (now - counter.windowStart > this.config.rateLimitWindowMs) {
      counter.count = 0
      counter.windowStart = now
      this.rateLimitCounters.set(playerId, counter)
    }

    counter.count += 1
    this.rateLimitCounters.set(playerId, counter)
    return counter.count > this.config.maxMessagesPerWindow
  }

  private sendGridInChunks(client: WebSocket, cells: Map<string, Color>): void {
    const chunkSize = this.config.gridChunkSize
    const entries = Array.from(cells.entries())
    const total = Math.ceil(entries.length / chunkSize)

    for (let i = 0; i < total; i += 1) {
      const slice = entries.slice(i * chunkSize, (i + 1) * chunkSize)
      const payload = {
        chunk: i + 1,
        total,
        cells: Object.fromEntries(slice) as Record<string, Color>
      }
      const message: OutgoingMessage = { type: 'GRID_CHUNK', payload }
      this.sendToClient(client, message)
    }
  }

  private broadcastMessage(message: string): void {
    const data = JSON.stringify({ type: 'INFO', payload: { message } })
    this.wss.clients.forEach(client => {
      if (client.readyState !== WebSocket.OPEN) {
        return
      }

      setImmediate(() => {
        try {
          client.send(data)
        } catch (error) {
          logger.error({ error }, 'Failed to send message to client')
        }
      })
    })
  }
} 