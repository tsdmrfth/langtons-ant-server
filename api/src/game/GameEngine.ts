import { v4 as uuidv4 } from 'uuid'
import { Ant, Color, Direction, GameConfig, GameState, GameStateSnapshot, Player, Position, Rule } from '../types/game'
import { moveAnt, turnAnt } from '../utils/antHelpers'
import { COLOR_WHITE } from '../config'

export class GameEngine {
  private state: GameState
  private config: GameConfig
  private changedCells: Map<string, Color> = new Map()

  constructor(config: GameConfig) {
    this.config = config
    this.state = {
      grid: {
        width: config.gridWidth,
        height: config.gridHeight,
        cells: new Map()
      },
      ants: [],
      players: new Map()
    }
  }

  public reset(): void {
    this.state = {
      grid: {
        width: this.config.gridWidth,
        height: this.config.gridHeight,
        cells: new Map()
      },
      ants: [],
      players: new Map()
    }
  }

  public getState(): GameState {
    return this.state
  }

  public addPlayer(): Player {
    if (this.state.players.size >= this.config.maxPlayers) {
      throw new Error('Maximum number of players reached')
    }

    const id = uuidv4()
    const color = this.generateUniqueColor()
    const player: Player = { id, color, antId: null }
    this.state.players.set(id, player)
    return player
  }

  public removePlayer(playerId: string): { clearedCells: Map<string, Color>, antId: string | null } {
    const player = this.state.players.get(playerId)

    if (!player) {
      throw new Error('Player not found')
    }

    const { antId } = player

    if (antId) {
      this.removeAnt(antId)
    }

    const clearedCells = new Map<string, Color>()
    for (const [cellKey, cellColor] of this.state.grid.cells.entries()) {
      if (cellColor === player.color) {
        this.state.grid.cells.set(cellKey, COLOR_WHITE)
        clearedCells.set(cellKey, COLOR_WHITE)
      }
    }

    this.state.players.delete(playerId)
    return { clearedCells, antId }
  }

  public placeAnt(playerId: string, position: Position, rules?: Rule[], direction: Direction = 'UP',): Ant {
    const player = this.state.players.get(playerId)

    if (!player) {
      throw new Error('Player not found')
    }

    if (player.antId) {
      throw new Error('Player already has an ant')
    }

    if (!['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(direction)) {
      throw new Error('Invalid direction')
    }

    if (!this.isPositionInBounds(position)) {
      throw new Error('Position out of bounds')
    }

    const existingAnt = this.state.ants.find(ant =>
      ant.position.x === position.x && ant.position.y === position.y
    )

    if (existingAnt) {
      throw new Error('An ant already exists at this position')
    }

    if (rules && rules.length > 0) {
      this.validateRules(rules)

      if (!this.doesIncludeMandatoryRules(rules, player.color)) {
        if (!rules.find(rule => rule.cellColor === COLOR_WHITE)) {
          rules.push({ cellColor: COLOR_WHITE, turnDirection: 'LEFT' })
        }

        if (!rules.find(rule => rule.cellColor === player.color)) {
          rules.push({ cellColor: player.color, turnDirection: 'RIGHT' })
        }
      }
    } else {
      rules = [
        { cellColor: COLOR_WHITE, turnDirection: 'LEFT' },
        { cellColor: player.color, turnDirection: 'RIGHT' }
      ]
    }

    const ant: Ant = {
      id: uuidv4(),
      position,
      direction,
      color: player.color,
      rules
    }
    this.state.ants.push(ant)
    player.antId = ant.id
    return ant
  }

  public updateRules(playerId: string, rules?: Rule[]) {
    const player = this.state.players.get(playerId)

    if (!player?.antId) {
      throw new Error('Player has no ant')
    }

    const ant = this.state.ants.find(ant => ant.id === player.antId)

    if (!ant) {
      throw new Error('Ant not found')
    }

    if (!rules || rules.length === 0) {
      throw new Error('Rules cannot be empty')
    }

    this.validateRules(rules)

    if (this.doesIncludeMandatoryRules(rules, ant.color)) {
      ant.rules = rules
    } else {
      ant.rules = ant.rules.concat(rules)
    }
  }

  private validateRules(rules: Rule[]): void {
    for (const rule of rules) {
      if (!rule.cellColor || !rule.turnDirection) {
        throw new Error('Invalid rule format: cellColor and turnDirection are required')
      }

      if (!['LEFT', 'RIGHT'].includes(rule.turnDirection)) {
        throw new Error('Invalid turn direction: turnDirection must be LEFT or RIGHT')
      }

      if (!this.isValidColor(rule.cellColor)) {
        throw new Error('Invalid cell color: cellColor must be a valid hex color')
      }
    }

    const ruleColors = new Set(rules.map(rule => rule.cellColor))

    if (ruleColors.size !== rules.length) {
      throw new Error('Rules cannot have the same current color')
    }
  }

  private doesIncludeMandatoryRules(rules: Rule[], antColor: Color): boolean {
    return rules.filter(rule => rule.cellColor === antColor || rule.cellColor === COLOR_WHITE).length === 2
  }

  public tick(): void {
    this.changedCells.clear()
    const newAnts: Ant[] = []
    const occupiedPositions = new Map<string, Ant>()

    for (const ant of this.state.ants) {
      const result = this.processAnt(ant, occupiedPositions)
      newAnts.push(result)
    }

    this.state.ants = newAnts
  }

  private processAnt(ant: Ant, occupiedPositions: Map<string, Ant>): Ant {
    const cellColor = this.getCellColor(ant.position)
    const ruleColor = cellColor === ant.color ? cellColor : COLOR_WHITE
    const newColor = cellColor === ant.color ? COLOR_WHITE : ant.color
    const rule = ant.rules.find(rule => rule.cellColor === ruleColor)

    if (!rule) {
      return ant
    }

    const newDirection = turnAnt(ant.direction, rule.turnDirection)
    const newPosition = moveAnt(ant.position, newDirection, this.config.gridWidth, this.config.gridHeight)
    const newPositionCellKey = this.getCellKey(newPosition)

    if (occupiedPositions.has(newPositionCellKey)) {
      return ant
    }

    this.updateCell(ant.position, newColor)
    this.changedCells.set(this.getCellKey(ant.position), newColor)
    occupiedPositions.set(newPositionCellKey, ant)
    return { ...ant, direction: newDirection, position: newPosition }
  }

  private updateCell(position: Position, color: Color): void {
    const cellKey = this.getCellKey(position)
    this.state.grid.cells.set(cellKey, color)
  }

  private removeAnt(antId: string): void {
    this.state.ants = this.state.ants.filter(ant => ant.id !== antId)
  }

  private getCellKey(position: Position): string {
    return `${position.x},${position.y}`
  }

  private generateRandomColor(): Color {
    let color: Color
    do {
      color = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase()
    } while (color === COLOR_WHITE)
    return color
  }

  private generateUniqueColor(): Color {
    let color: Color
    const usedColors = new Set(Array.from(this.state.players.values()).map(player => player.color))
    do {
      color = this.generateRandomColor()
    } while (usedColors.has(color))
    return color
  }

  private isPositionInBounds(position: Position): boolean {
    return position.x >= 0 && position.x < this.config.gridWidth && position.y >= 0 && position.y < this.config.gridHeight
  }

  private isValidColor(color: Color): boolean {
    return /^#([0-9a-fA-F]{6})$/.test(color)
  }

  public getCellColor(position: Position): Color {
    const cellKey = this.getCellKey(position)
    return this.state.grid.cells.get(cellKey) || COLOR_WHITE
  }

  public flipTile(playerId: string, position: Position) {
    const player = this.state.players.get(playerId)

    if (!player) {
      throw new Error('Player not found')
    }

    const currentColor = this.getCellColor(position)

    if (currentColor === COLOR_WHITE) {
      this.updateCell(position, player.color)
      this.changedCells.set(this.getCellKey(position), player.color)
      return
    }

    if (currentColor === player.color) {
      this.updateCell(position, COLOR_WHITE)
      this.changedCells.set(this.getCellKey(position), COLOR_WHITE)
      return
    }

    throw new Error('Tile is colored by another player')
  }

  public getFullState(): GameStateSnapshot {
    return {
      cells: this.state.grid.cells,
      ants: this.state.ants
    }
  }

  public getGameStateSnapshot(): GameStateSnapshot {
    return {
      cells: this.changedCells,
      ants: this.state.ants
    }
  }
}