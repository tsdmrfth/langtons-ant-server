export type Direction = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT'

export type Color = string

export interface Position {
  x: number
  y: number
}

export interface Ant {
  id: string
  position: Position
  direction: Direction
  color: Color
  rules: Rule[]
}

export interface Rule {
  cellColor: Color
  turnDirection: 'LEFT' | 'RIGHT'
}

export interface Grid {
  width: number
  height: number
  cells: Record<string, Color>
}

export interface GameState {
  grid: Grid
  ants: Ant[]
  players: Map<string, Player>
}

export interface Player {
  id: string
  color: Color
  antId: string | null
}

export interface GameConfig {
  gridWidth: number
  gridHeight: number
  tickInterval: number
  maxPlayers: number
  heartbeatInterval: number
}

export interface GameTickUpdate {
  cells: Record<string, Color>
  ants: Ant[]
}

export interface PlayerJoinPayload {
  playerId: string
  color: Color
}

export interface PlayerLeavePayload {
  playerId: string
  cells: Record<string, Color>
}

export interface PlaceAntPayload {
  position: Position
  rules: Rule[]
}

export interface PlaceAntResponsePayload {
  cells: Record<string, Color>
  ant: Ant
  playerId: string
}

export interface RuleChangePayload {
  rules: Rule[]
}

export interface RuleChangeResponsePayload {
  playerId: string
  rules: Rule[]
}

export interface TileFlipPayload {
  position: Position
}

export interface TileFlipResponsePayload {
  cells: Record<string, Color>
  playerId: string
}

export interface ErrorPayload {
  message: string
}

export interface WelcomeMessagePayload {
  player: Player
  state: {
    ants: Ant[]
    players: Record<string, Player>
    grid: {
      width: number
      height: number
      cells: Record<string, Color>
    }
  }
}

export interface GridChunkPayload {
  chunk: number
  total: number
  cells: Record<string, Color>
}

export interface GameTickUpdatePayload {
  cells: Record<string, Color>
  ants: Ant[]
}

export interface UpdateGameConfigPayload {
  gridSize: number
  tickInterval: number
}

export type OutgoingMessage =
  | { type: 'PLACE_ANT'; payload: PlaceAntPayload }
  | { type: 'CHANGE_RULES'; payload: RuleChangePayload }
  | { type: 'FLIP_TILE'; payload: TileFlipPayload }
  | { type: 'UPDATE_GAME_CONFIG'; payload: UpdateGameConfigPayload }

export type IncomingMessage =
  | { type: 'GAME_TICK_UPDATE'; payload: GameTickUpdatePayload }
  | { type: 'WELCOME'; payload: WelcomeMessagePayload }
  | { type: 'PLAYER_JOINED'; payload: PlayerJoinPayload }
  | { type: 'PLAYER_LEFT'; payload: PlayerLeavePayload }
  | { type: 'ANT_PLACED'; payload: PlaceAntResponsePayload }
  | { type: 'RULES_CHANGED'; payload: RuleChangeResponsePayload }
  | { type: 'TILE_FLIPPED'; payload: TileFlipResponsePayload }
  | { type: 'GRID_CHUNK'; payload: GridChunkPayload }
  | { type: 'GAME_CONFIG_UPDATED'; payload: UpdateGameConfigPayload }
  | { type: 'ERROR'; payload: ErrorPayload }

export type WebSocketMessage = OutgoingMessage | IncomingMessage