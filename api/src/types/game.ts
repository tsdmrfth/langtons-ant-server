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
  cells: Map<string, Color>
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

export interface GameStateSnapshot {
  cells: Map<string, Color>
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
}

export interface ErrorPayload {
  message: string
}

export interface WelcomeMessagePayload {
  player: Player
  gameState: GameStateSnapshotPayload
}

export interface GameStateSnapshotPayload {
  cells: Record<string, Color>
  ants: Ant[]
}

export type WebSocketMessage =
  | { type: 'WELCOME'; payload: WelcomeMessagePayload }
  | { type: 'GAME_STATE_SNAPSHOT'; payload: GameStateSnapshotPayload }
  | { type: 'PLAYER_JOIN'; payload: PlayerJoinPayload }
  | { type: 'PLAYER_LEAVE'; payload: PlayerLeavePayload }
  | { type: 'PLACE_ANT'; payload: PlaceAntPayload | PlaceAntResponsePayload }
  | { type: 'RULE_CHANGE'; payload: RuleChangePayload | RuleChangeResponsePayload }
  | { type: 'TILE_FLIP'; payload: TileFlipPayload | TileFlipResponsePayload }
  | { type: 'ERROR'; payload: ErrorPayload }