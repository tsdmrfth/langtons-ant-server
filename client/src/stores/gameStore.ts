import { toast } from '@/hooks/use-toast'
import webSocketService from '@/services/WebSocketSingleton'
import { Ant, GameTickUpdatePayload, Grid, OutgoingMessage, PlaceAntPayload, Player, Rule, RuleChangePayload, TileFlipPayload } from '@/types/game'
import { validatePosition, validateRules } from '@/utils/errorHandling'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

const COLOR_WHITE = '#FFFFFF'

interface GameStore {
    newCells: Record<string, string>
    historicalCells?: Record<string, string> | null
    grid: {
        width: number
        height: number
        cells: Record<string, string>
    }
    ants: Ant[]
    players: Record<string, Player>
    currentPlayer: Player | null
    selectedRules: Rule[]
    actions: {
        setInitialState: (state: { grid: Grid, ants: Ant[], players: Record<string, Player> }) => void
        setCurrentPlayer: (player: Player) => void
        setSelectedRules: (rules: Rule[]) => void
        updateGameState: (snapshot: GameTickUpdatePayload) => void
        addPlayer: (player: Player) => void
        removePlayer: (playerId: string, cells: Record<string, string>) => void
        sendMessage: (message: OutgoingMessage) => void
        placeAnt: (position: { x: number, y: number }) => void
        updateAntsList: (playerId: string, ant: Ant, cells: Record<string, string>) => void
        changeAntRules: (rules: Rule[]) => void
        flipTile: (position: { x: number, y: number }) => void
        mergeGridCells: (cells: Record<string, string>) => void
        handleRuleChangeResponse: (playerId: string, rules: Rule[]) => void,
        insertNewCells: (cells: Record<string, string>) => void
    }
}

export const useGameStore = create<GameStore>()(
    subscribeWithSelector((set, get) => ({
        newCells: {},
        grid: {
            width: 100,
            height: 100,
            cells: {}
        },
        ants: [],
        players: {},
        currentPlayer: null,
        selectedRules: [],
        actions: {
            setInitialState: (state: { grid: Grid, ants: Ant[], players: Record<string, Player> }) => {
                set({
                    grid: {
                        width: state.grid.width,
                        height: state.grid.height,
                        cells: state.grid.cells || {}
                    },
                    ants: state.ants || [],
                    players: state.players || {}
                })
            },
            setCurrentPlayer: (player: Player) => {
                set({ currentPlayer: player })
                set({
                    selectedRules: [
                        {
                            cellColor: COLOR_WHITE,
                            turnDirection: 'LEFT',
                        },
                        {
                            cellColor: player.color,
                            turnDirection: 'RIGHT',
                        },
                    ]
                })
            },
            setSelectedRules: (rules: Rule[]) => {
                set({ selectedRules: rules })
            },
            updateGameState: (snapshot: GameTickUpdatePayload) => {
                set((state) => ({
                    grid: {
                        ...state.grid,
                        cells: { ...state.grid.cells, ...(state.newCells || {}) }
                    },
                    ants: snapshot.ants || state.ants,
                    newCells: snapshot.cells || {}
                }))
            },
            addPlayer: (player: Player) => {
                if (get().players[player.id]) {
                    return
                }

                set((state) => ({
                    players: { ...state.players, [player.id]: player }
                }))
            },
            removePlayer: (playerId: string, cells: Record<string, string>) => {
                set((state) => {
                    const { [playerId]: removed, ...remaining } = state.players

                    if (!removed?.antId) {
                        return state
                    }

                    Object.keys(cells).forEach((cell) => {
                        delete state.grid.cells[cell]
                        delete state.historicalCells?.[cell]
                    })
                    const ants = state.ants.filter((ant) => ant.id !== removed?.antId)
                    return {
                        players: remaining,
                        newCells: cells,
                        ants,
                        grid: state.grid,
                        historicalCells: state.historicalCells
                    }
                })
            },
            sendMessage: (message: OutgoingMessage) => {
                try {
                    console.log('sending message', message)
                    webSocketService.sendMessage(message)
                } catch (error) {
                    throw new Error('Failed to send message to server')
                }
            },
            placeAnt: (position: { x: number, y: number }) => {
                const rules = get().selectedRules
                const { grid } = get()

                if (!rules) {
                    toast({
                        title: 'No rules selected',
                        description: 'Please select rules before placing an ant',
                        variant: 'destructive'
                    })
                    return
                }

                try {
                    validatePosition(position, grid.width, grid.height)
                    validateRules(rules)
                } catch (error) {
                    toast({
                        title: 'Invalid ant placement',
                        description: error instanceof Error ? error.message : 'Invalid position or rules',
                        variant: 'destructive'
                    })
                    return
                }

                const payload: PlaceAntPayload = { position, rules }
                get().actions.sendMessage({ type: 'PLACE_ANT', payload })
            },
            updateAntsList: (playerId: string, ant: Ant, cells: Record<string, string>) => {
                set((state) => ({
                    players: {
                        ...state.players,
                        [playerId]: {
                            ...(state.players[playerId] || {}),
                            antId: ant.id
                        }
                    },
                    ants: [...state.ants, ant],
                    grid: {
                        ...state.grid,
                        cells: { ...state.grid.cells, ...cells }
                    },
                    currentPlayer: state.currentPlayer?.id === playerId ? {
                        ...state.currentPlayer,
                        antId: ant.id
                    } : state.currentPlayer,
                }))
            },
            changeAntRules: (rules: Rule[]) => {
                try {
                    validateRules(rules)
                } catch (error) {
                    toast({
                        title: 'Invalid rules',
                        description: error instanceof Error ? error.message : 'Please check your rule configuration',
                        variant: 'destructive'
                    })
                    return
                }

                const payload: RuleChangePayload = { rules }
                get().actions.sendMessage({ type: 'CHANGE_RULES', payload })
            },
            flipTile: (position: { x: number, y: number }) => {
                const { grid } = get()

                try {
                    validatePosition(position, grid.width, grid.height)
                } catch (error) {
                    toast({
                        title: 'Invalid tile position',
                        description: error instanceof Error ? error.message : 'Position is out of bounds',
                        variant: 'destructive'
                    })
                    return
                }

                const payload: TileFlipPayload = { position }
                get().actions.sendMessage({ type: 'FLIP_TILE', payload })
            },
            mergeGridCells: (cells: Record<string, string>) => {
                set((state) => ({
                    historicalCells: { ...state.historicalCells, ...cells },
                    grid: {
                        ...state.grid,
                        cells: { ...state.grid.cells, ...state.newCells }
                    }
                }))
            },
            handleRuleChangeResponse: (playerId: string, rules: Rule[]) => {
                set((state) => ({
                    ants: state.ants.map((ant) => {
                        if (ant.id === playerId) {
                            return { ...ant, rules }
                        }
                        return ant
                    })
                }))

                if (get().currentPlayer?.id === playerId) {
                    toast({
                        title: 'Rules Updated',
                        description: 'Your ant\'s rules have been successfully updated.',
                        variant: 'default'
                    })
                } else {
                    toast({
                        title: 'Rules Updated',
                        description: 'Another player has updated their rules. You can see the new rules in the ants list.',
                        variant: 'default'
                    })
                }
            },
            insertNewCells: (cells: Record<string, string>) => {
                set((state) => ({
                    newCells: cells,
                    grid: {
                        ...state.grid,
                        cells: { ...state.grid.cells, ...state.newCells }
                    }
                }))
            }
        }
    }))
)
