import { useToast } from '@/hooks/use-toast'
import webSocketService from '@/services/WebSocketSingleton'
import { useGameStore } from '@/stores/gameStore'
import { useUIStore } from '@/stores/uiStore'
import { IncomingMessage } from '@/types/game'
import React, { useCallback, useEffect } from 'react'

export const WebSocketManager: React.FC = () => {
  const { actions: gameActions } = useGameStore()
  const { actions: uiActions } = useUIStore()
  const { toast } = useToast()

  const handleMessage = useCallback((message: IncomingMessage) => {
    switch (message.type) {
      case 'WELCOME': {
        const { player, state } = message.payload
        gameActions.setCurrentPlayer({ id: player.id, color: player.color, antId: null })
        gameActions.setInitialState({
          players: state.players,
          ants: state.ants,
          grid: {
            width: state.grid.width,
            height: state.grid.height,
            cells: {}
          },
        })
        break
      }

      case 'PLAYER_JOINED': {
        const { playerId, color } = message.payload
        gameActions.addPlayer({ id: playerId, color, antId: null })
        break
      }

      case 'PLAYER_LEFT': {
        const { playerId, cells } = message.payload
        console.log(message.payload, 'player left')
        gameActions.removePlayer(playerId, cells)
        break
      }

      case 'ANT_PLACED': {
        const { ant, cells, playerId } = message.payload
        gameActions.updateAntsList(playerId, ant, cells)
        uiActions.setIsPlacingAnt(false)
        break
      }

      case 'GAME_TICK_UPDATE':
        gameActions.updateGameState(message.payload)
        break

      case 'RULES_CHANGED': {
        const { playerId, rules } = message.payload
        gameActions.handleRuleChangeResponse(playerId, rules)
        break
      }

      case 'TILE_FLIPPED': {
        const { cells } = message.payload
        gameActions.insertNewCells(cells)
        break
      }

      case 'ERROR':
        toast({
          title: "An error occurred",
          description: message.payload.message,
          variant: "destructive"
        })
        break

      case 'GRID_CHUNK': {
        const { cells } = message.payload
        gameActions.mergeGridCells(cells)
        break
      }

      case 'GAME_CONFIG_UPDATED': {
        const { gridSize, tickInterval } = message.payload
        gameActions.setInitialState({
          grid: { width: gridSize, height: gridSize, cells: {} },
          ants: []
        })
        uiActions.setGameControlUpdateLoading(false)
        toast({
          title: 'Game Config Updated',
          description: `Grid: ${gridSize}x${gridSize}, Tick: ${tickInterval}ms`,
          variant: 'default'
        })
        break
      }

      default:
        break
    }
  }, [gameActions, uiActions, toast])

  const handleConnectionChange = useCallback((state: string, error?: string) => {
    if (state === 'connected') {
      uiActions.setConnectionState(true)
      toast({
        title: "Connected",
        description: "Successfully connected to the game server. Place your ant and start the game!",
        variant: "default",
        duration: 4000
      })
    } else if (state === 'disconnected' || state === 'error') {
      uiActions.setConnectionState(false, error)
    }
  }, [uiActions, toast])

  useEffect(() => {
    webSocketService.setCallbacks({
      onMessage: handleMessage,
      onConnectionChange: handleConnectionChange
    })

    webSocketService.connect()
    return () => {
      webSocketService.disconnect()
    }
  }, [handleMessage, handleConnectionChange])

  return null
}
