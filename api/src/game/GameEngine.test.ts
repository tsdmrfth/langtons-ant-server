import { Color, GameConfig, Rule } from '../types/game'
import { GameEngine } from './GameEngine'

const COLOR_WHITE = '#FFFFFF'
const RULE_R: Rule = { cellColor: COLOR_WHITE, turnDirection: 'RIGHT' }
const RULE_L: Rule = { cellColor: COLOR_WHITE, turnDirection: 'LEFT' }

describe('GameEngine', () => {
    let gameEngine: GameEngine
    let gameConfig: GameConfig

    beforeEach(() => {
        gameConfig = {
            gridWidth: 20,
            gridHeight: 20,
            tickInterval: 100,
            maxPlayers: 2,
            heartbeatInterval: 1000,
            rateLimitWindowMs: 1000,
            maxMessagesPerWindow: 10,
            gridChunkSize: 100
        }
        gameEngine = new GameEngine(gameConfig)
    })

    afterEach(() => {
        gameEngine.reset()
    })

    describe('Player Management', () => {
        describe('addPlayer', () => {
            it('should add a new player with a unique ID and color', () => {
                const player1 = gameEngine.addPlayer()
                const player2 = gameEngine.addPlayer()
                expect(player1.id).not.toBe(player2.id)
                expect(player1.color).not.toBe(player2.color)
                expect(player1.color).not.toBe(COLOR_WHITE)
                expect(gameEngine.getState().players.size).toBe(2)
            })

            it('should throw an error when maxPlayers is reached', () => {
                gameConfig.maxPlayers = 1
                gameEngine = new GameEngine(gameConfig)
                gameEngine.addPlayer()
                expect(() => gameEngine.addPlayer()).toThrow('Maximum number of players reached')
            })
        })

        describe('removePlayer', () => {
            it('should remove a player and their ant from the game', () => {
                const player = gameEngine.addPlayer()
                gameEngine.placeAnt(player.id, { x: 10, y: 10 })
                expect(gameEngine.getState().ants.length).toBe(1)
                gameEngine.removePlayer(player.id)
                expect(gameEngine.getState().players.has(player.id)).toBe(false)
                expect(gameEngine.getState().ants.length).toBe(0)
            })

            it('should clear the player tiles from the grid on removal', () => {
                const player = gameEngine.addPlayer()
                gameEngine.flipTile(player.id, { x: 5, y: 5 })
                gameEngine.flipTile(player.id, { x: 6, y: 6 })
                expect(gameEngine.getCellColor({ x: 5, y: 5 })).toBe(player.color)
                const { clearedCells } = gameEngine.removePlayer(player.id)
                expect(gameEngine.getCellColor({ x: 5, y: 5 })).toBe(COLOR_WHITE)
                expect(clearedCells.get('5,5')).toBe(COLOR_WHITE)
                expect(clearedCells.size).toBe(2)
            })

            it('should remove a player without an ant', () => {
                const player = gameEngine.addPlayer()
                gameEngine.removePlayer(player.id)
                expect(gameEngine.getState().players.has(player.id)).toBe(false)
            })

            it('should throw an error if the player does not exist', () => {
                expect(() => gameEngine.removePlayer('non-existent-id')).toThrow('Player not found')
            })
        })
    })

    describe('Ant Placement and Rules', () => {
        let playerId: string

        beforeEach(() => {
            gameEngine = new GameEngine(gameConfig)
            playerId = gameEngine.addPlayer().id
        })

        describe('placeAnt', () => {
            const rules: Rule[] = [{ cellColor: COLOR_WHITE, turnDirection: 'LEFT' }]

            it('should successfully place an ant', () => {
                const ant = gameEngine.placeAnt(playerId, { x: 10, y: 10 }, rules)
                const state = gameEngine.getState()
                expect(state.ants.length).toBe(1)
                expect(state.ants[0]).toEqual(ant)
                expect(state.players.get(playerId)?.antId).toBe(ant.id)
            })

            it('should apply default rules if none are provided', () => {
                const ant = gameEngine.placeAnt(playerId, { x: 10, y: 10 }, [])
                expect(ant.rules.length).toBe(2)
                expect(ant.rules[0]).toEqual({ cellColor: COLOR_WHITE, turnDirection: 'LEFT' })
                expect(ant.rules[1]).toEqual({ cellColor: ant.color, turnDirection: 'RIGHT' })
            })

            it('should throw an error if player does not exist', () => {
                expect(() => gameEngine.placeAnt('fake-player', { x: 0, y: 0 }, rules)).toThrow('Player not found')
            })

            it('should throw an error if player already has an ant', () => {
                gameEngine.placeAnt(playerId, { x: 1, y: 1 }, rules)
                expect(() => gameEngine.placeAnt(playerId, { x: 2, y: 2 }, rules)).toThrow('Player already has an ant')
            })

            it('should throw an error if position is out of bounds', () => {
                expect(() => gameEngine.placeAnt(playerId, { x: -1, y: 0 }, rules)).toThrow('Position out of bounds')
            })

            it('should throw an error if position is occupied', () => {
                gameEngine.placeAnt(playerId, { x: 1, y: 1 }, rules)
                const player2Id = gameEngine.addPlayer().id
                expect(() => gameEngine.placeAnt(player2Id, { x: 1, y: 1 }, rules)).toThrow('An ant already exists at this position')
            })
        })

        describe('updateRules', () => {
            const rules: Rule[] = [{ cellColor: COLOR_WHITE, turnDirection: 'LEFT' }]

            it('should successfully update rules for an existing ant', () => {
                const ant = gameEngine.placeAnt(playerId, { x: 1, y: 1 }, rules)
                const newRules: Rule[] = [{ cellColor: '#282C34', turnDirection: 'RIGHT' }]
                gameEngine.updateRules(playerId, newRules)
                expect(ant.rules.find(rule => rule.cellColor === '#282C34')).toBeDefined()
            })

            it('should throw an error if rules are empty', () => {
                const ant = gameEngine.placeAnt(playerId, { x: 1, y: 1 }, rules)
                expect(() => gameEngine.updateRules(playerId, [])).toThrow('Rules cannot be empty')
            })

            it('should throw an error if player has no ant', () => {
                expect(() => gameEngine.updateRules(playerId, rules)).toThrow('Player has no ant')
            })

            it('should not override mandatory rules', () => {
                const gameEngine = new GameEngine(gameConfig)
                const player = gameEngine.addPlayer()
                const playerId = player.id
                gameEngine.placeAnt(playerId, { x: 1, y: 1 })
                const newRules: Rule[] = [{ cellColor: '#282C34', turnDirection: 'RIGHT' }]
                gameEngine.updateRules(playerId, newRules)
                const ant = gameEngine.getState().ants[0]
                expect(ant.rules.length).toBe(3)
                expect(ant.rules.find(rule => rule.cellColor === COLOR_WHITE)).toBeDefined()
                expect(ant.rules.find(rule => rule.cellColor === ant.color)).toBeDefined()
                expect(ant.rules.find(rule => rule.cellColor === '#282C34')).toBeDefined()
            })

            it('should throw an error if a rule has an invalid color', () => {
                const invalidRules = [{ cellColor: 'invalid', turnDirection: 'LEFT' }] as any
                expect(() => (gameEngine as any).validateRules(invalidRules)).toThrow('Invalid cell color: cellColor must be a valid hex color')
            })
        })

        describe('validateRules', () => {
            it('should throw an error if a rule is missing cellColor', () => {
                const invalidRules = [{ turnDirection: 'LEFT' }] as any
                expect(() => (gameEngine as any).validateRules(invalidRules)).toThrow('cellColor and turnDirection are required')
            })

            it('should throw an error if a rule is missing turnDirection', () => {
                const invalidRules = [{ cellColor: COLOR_WHITE }] as any
                expect(() => (gameEngine as any).validateRules(invalidRules)).toThrow('cellColor and turnDirection are required')
            })

            it('should throw an error if turnDirection is invalid', () => {
                const invalidRules = [{ cellColor: COLOR_WHITE, turnDirection: 'STRAIGHT' }] as any
                expect(() => (gameEngine as any).validateRules(invalidRules)).toThrow('Invalid turn direction')
            })

            it('should throw an error for duplicate cell colors in rules', () => {
                const invalidRules: Rule[] = [
                    { cellColor: COLOR_WHITE, turnDirection: 'LEFT' },
                    { cellColor: COLOR_WHITE, turnDirection: 'RIGHT' }
                ]
                expect(() => (gameEngine as any).validateRules(invalidRules)).toThrow('Rules cannot have the same current color')
            })

            it('should pass for a valid set of rules', () => {
                const validRules: Rule[] = [{ cellColor: COLOR_WHITE, turnDirection: 'LEFT' }]
                expect(() => (gameEngine as any).validateRules(validRules)).not.toThrow()
            })
        })
    })

    describe('Game Simulation', () => {
        let player1: { id: string, color: Color }
        let player2: { id: string, color: Color }

        beforeEach(() => {
            const p1 = gameEngine.addPlayer()
            const p2 = gameEngine.addPlayer()
            player1 = { id: p1.id, color: p1.color }
            player2 = { id: p2.id, color: p2.color }
        })

        it('should move an ant according to its rule on a white tile', () => {
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [RULE_R])
            gameEngine.tick()
            expect(gameEngine.getState().ants[0].position).toEqual({ x: 11, y: 10 })
            expect(gameEngine.getState().ants[0].direction).toBe('RIGHT')
            expect(gameEngine.getTickUpdate().cells.get('10,10')).toBe(player1.color)
            gameEngine.tick()
            expect(gameEngine.getState().ants[0].position).toEqual({ x: 11, y: 11 })
            expect(gameEngine.getState().ants[0].direction).toBe('DOWN')
            expect(gameEngine.getTickUpdate().cells.get('11,10')).toBe(player1.color)
        })

        it('should move an ant and flip its own tile back to white', () => {
            const rule: Rule = { cellColor: player1.color, turnDirection: 'LEFT' }
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [rule])
            gameEngine.flipTile(player1.id, { x: 10, y: 10 })
            gameEngine.tick()
            const state = gameEngine.getState()
            const ant = state.ants[0]
            const snapshot = gameEngine.getTickUpdate()
            expect(ant.position).toEqual({ x: 9, y: 10 })
            expect(ant.direction).toBe('LEFT')
            expect(snapshot.cells.get('10,10')).toBe(COLOR_WHITE)
            expect(snapshot.ants[0].position).toEqual({ x: 9, y: 10 })
            expect(snapshot.ants[0].direction).toBe('LEFT')
        })

        it('should provide the full grid state to a new player', () => {
            gameEngine.placeAnt(player1.id, { x: 5, y: 5 }, [RULE_R])
            gameEngine.tick() // Ant moves to 6,5, colors 5,5
            gameEngine.tick() // Ant moves to 6,6, colors 6,5
            gameEngine.tick() // Ant moves to 5,6, colors 6,6
            const fullState = gameEngine.getState()
            expect(fullState.grid.cells.get('5,5')).toBe(player1.color)
            expect(fullState.grid.cells.get('6,5')).toBe(player1.color)
            expect(fullState.grid.cells.get('6,6')).toBe(player1.color)
            expect(fullState.ants.length).toBe(1)
        })

        it("should treat another player's tile as white", () => {
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [RULE_R])
            gameEngine.flipTile(player2.id, { x: 10, y: 10 })
            const originalTileColor = gameEngine.getCellColor({ x: 10, y: 10 })
            gameEngine.tick()
            const ant = gameEngine.getState().ants[0]
            expect(ant.position).toEqual({ x: 11, y: 10 })
            expect(ant.direction).toBe('RIGHT')
            expect(gameEngine.getTickUpdate().cells.get('10,10')).toBe(player1.color)
        })

        it('default rules should be applied if no rule matches', () => {
            const rule: Rule = { cellColor: '#FF0000', turnDirection: 'LEFT' }
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [rule]) // default white rule should be applied (turn LEFT)
            gameEngine.tick()
            const ant = gameEngine.getState().ants[0]
            const snapshot = gameEngine.getTickUpdate()
            expect(ant.position).toEqual({ x: 9, y: 10 })
            expect(ant.direction).toBe('LEFT')
            expect(snapshot.cells.size).toBe(1)
            expect(snapshot.cells.get('10,10')).toBe(ant.color)
        })

        it('should handle collisions correctly', () => {
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [RULE_R])
            gameEngine.placeAnt(player2.id, { x: 12, y: 10 }, [RULE_L])
            gameEngine.tick()
            const ants = gameEngine.getState().ants
            const ant1 = ants.find(a => a.id === gameEngine.getState().players.get(player1.id)?.antId)!
            const ant2 = ants.find(a => a.id === gameEngine.getState().players.get(player2.id)?.antId)!
            expect(ant1.position).toEqual({ x: 11, y: 10 })
            expect(ant1.direction).toBe('RIGHT')
            expect(ant2.position).toEqual({ x: 12, y: 10 })
            expect(ant2.direction).toBe('UP')
            expect(gameEngine.getTickUpdate().cells.has('12,10')).toBe(false)
            expect(gameEngine.getTickUpdate().cells.has('11,9')).toBe(false)
        })

        it('should create occupiedPositions Map correctly and prevent ant collisions', () => {
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [RULE_R])
            gameEngine.placeAnt(player2.id, { x: 11, y: 10 }, [RULE_R])
            gameEngine.tick()
            const ants = gameEngine.getState().ants
            const ant1 = ants.find(ant => ant.id === gameEngine.getState().players.get(player1.id)?.antId)!
            const ant2 = ants.find(ant => ant.id === gameEngine.getState().players.get(player2.id)?.antId)!
            expect(ant1.position).toEqual({ x: 10, y: 10 })
            expect(ant2.position).toEqual({ x: 12, y: 10 })
            const tickUpdate = gameEngine.getTickUpdate()
            expect(tickUpdate.cells.size).toBe(1)
            expect(tickUpdate.cells.get('11,10')).toBe(player2.color)
        })

        it('should delete a tiles colored with white', () => {
            gameEngine.placeAnt(player1.id, { x: 10, y: 10 }, [RULE_R])
            gameEngine.tick()
            expect(gameEngine.getState().grid.cells.has('10,10')).toBe(true)
            gameEngine.flipTile(player1.id, { x: 10, y: 10 })
            const cells = gameEngine.getState().grid.cells
            expect(Object.values(cells).every(color => color !== COLOR_WHITE)).toBe(true)
        })
    })

    describe('Grid and State Management', () => {
        let player: { id: string, color: Color }

        beforeEach(() => {
            player = gameEngine.addPlayer()
        })

        describe('flipTile', () => {
            it('should allow a player to flip a white tile to their color', () => {
                const changedCells = gameEngine.flipTile(player.id, { x: 5, y: 5 })
                expect(changedCells.get('5,5')).toBe(player.color)
            })

            it('should allow a player to flip their own tile back to white', () => {
                gameEngine.flipTile(player.id, { x: 5, y: 5 })
                const changedCells = gameEngine.flipTile(player.id, { x: 5, y: 5 })
                expect(changedCells.get('5,5')).toBe(COLOR_WHITE)
            })

            it("should throw an error when trying to flip another player's tile", () => {
                const player2 = gameEngine.addPlayer()
                gameEngine.flipTile(player2.id, { x: 5, y: 5 })
                expect(() => gameEngine.flipTile(player.id, { x: 5, y: 5 })).toThrow('Tile is colored by another player')
            })
        })

        describe('getTickUpdate', () => {
            it('should only contain cells that changed during the tick', () => {
                gameEngine.placeAnt(player.id, { x: 1, y: 1 }, [RULE_R])
                gameEngine.flipTile(player.id, { x: 99, y: 99 })
                gameEngine.tick()
                const snapshot = gameEngine.getTickUpdate()
                expect(snapshot.cells.size).toBe(1)
                expect(snapshot.cells.has('1,1')).toBe(true)
            })

            it('should be empty if no state changed', () => {
                gameEngine.tick()
                const snapshot = gameEngine.getTickUpdate()
                expect(snapshot.cells.size).toBe(0)
            })

            it('should contain all ants with their updated states', () => {
                gameEngine.placeAnt(player.id, { x: 1, y: 1 }, [RULE_R])
                gameEngine.tick()
                const snapshot = gameEngine.getTickUpdate()
                expect(snapshot.ants.length).toBe(1)
                expect(snapshot.ants[0].position).toEqual({ x: 2, y: 1 })
            })
        })
    })

    describe('Game Config Updates', () => {
        it('should update config before game starts', () => {
            gameEngine.updateConfig(30, 200)
            const state = gameEngine.getState()
            expect(state.grid.width).toBe(30)
            expect(state.grid.height).toBe(30)
        })

        it('should throw if updating config after ant placed', () => {
            const player = gameEngine.addPlayer()
            gameEngine.placeAnt(player.id, { x: 1, y: 1 })
            expect(() => gameEngine.updateConfig(40, 100)).toThrow('Cannot update config: game already started')
        })

        it('should throw if grid size is invalid', () => {
            expect(() => gameEngine.updateConfig(0, 100)).toThrow('Grid width and height must be greater than 0')
        })
    })
}) 