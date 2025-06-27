import { Direction, Position } from '../types/game'

export function turnAnt(current: Direction, turn: 'LEFT' | 'RIGHT'): Direction {
  const directions: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT']
  const currentIndex = directions.indexOf(current)
  const turnValue = turn === 'LEFT' ? -1 : 1
  const newIndex = (currentIndex + turnValue + directions.length) % directions.length
  return directions[newIndex]
}

export function moveAnt(position: Position, direction: Direction, gridWidth: number, gridHeight: number): Position {
  const next = { ...position }

  switch (direction) {
    case 'UP':
      next.y = (next.y - 1 + gridHeight) % gridHeight
      break
    case 'RIGHT':
      next.x = (next.x + 1) % gridWidth
      break
    case 'DOWN':
      next.y = (next.y + 1) % gridHeight
      break
    case 'LEFT':
      next.x = (next.x - 1 + gridWidth) % gridWidth
      break
  }

  return next
}

export function turnAnt180(current: Direction): Direction {
  const directions: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT']
  const currentIndex = directions.indexOf(current)
  const newIndex = (currentIndex + 2) % directions.length
  return directions[newIndex]
}