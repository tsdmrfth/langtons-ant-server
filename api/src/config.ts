import { GameConfig } from './types/game'

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gridWidth: 1000,
  gridHeight: 1000,
  tickInterval: 250,
  maxPlayers: 10,
  heartbeatInterval: 10000,
  rateLimitWindowMs: 1000,
  maxMessagesPerWindow: 30,
  gridChunkSize: 1000,
}

export const COLOR_WHITE = '#FFFFFF'