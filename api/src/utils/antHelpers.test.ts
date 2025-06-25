import { turnAnt, moveAnt } from './antHelpers'
import { Direction, Position } from '../types/game'

describe('antHelpers', () => {
    describe('turnAnt', () => {
        const directions: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT']
        it('turns left correctly', () => {
            expect(turnAnt('UP', 'LEFT')).toBe('LEFT')
            expect(turnAnt('LEFT', 'LEFT')).toBe('DOWN')
        })

        it('turns right correctly', () => {
            expect(turnAnt('UP', 'RIGHT')).toBe('RIGHT')
            expect(turnAnt('LEFT', 'RIGHT')).toBe('UP')
        })

        it('cycles through all directions', () => {
            let dir: Direction = 'UP'
            for (let i = 0; i < 4; i++) {
                dir = turnAnt(dir, 'RIGHT')
                expect(directions).toContain(dir)
            }
        })
    })

    describe('moveAnt', () => {
        const gridWidth = 10
        const gridHeight = 10

        it('moves up with wrapping', () => {
            const pos: Position = { x: 5, y: 0 }
            expect(moveAnt(pos, 'UP', gridWidth, gridHeight)).toEqual({ x: 5, y: 9 })
        })

        it('moves right with wrapping', () => {
            const pos: Position = { x: 9, y: 5 }
            expect(moveAnt(pos, 'RIGHT', gridWidth, gridHeight)).toEqual({ x: 0, y: 5 })
        })

        it('moves down with wrapping', () => {
            const pos: Position = { x: 5, y: 9 }
            expect(moveAnt(pos, 'DOWN', gridWidth, gridHeight)).toEqual({ x: 5, y: 0 })
        })

        it('moves left with wrapping', () => {
            const pos: Position = { x: 0, y: 5 }
            expect(moveAnt(pos, 'LEFT', gridWidth, gridHeight)).toEqual({ x: 9, y: 5 })
        })

        it('handles normal movement without wrapping', () => {
            const pos: Position = { x: 5, y: 5 }
            expect(moveAnt(pos, 'UP', gridWidth, gridHeight)).toEqual({ x: 5, y: 4 })
            expect(moveAnt(pos, 'RIGHT', gridWidth, gridHeight)).toEqual({ x: 6, y: 5 })
            expect(moveAnt(pos, 'DOWN', gridWidth, gridHeight)).toEqual({ x: 5, y: 6 })
            expect(moveAnt(pos, 'LEFT', gridWidth, gridHeight)).toEqual({ x: 4, y: 5 })
        })
    })
})