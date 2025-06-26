import { useToast } from '@/hooks/use-toast'
import { useGameStore } from '@/stores/gameStore'
import { useUIStore } from '@/stores/uiStore'
import { contrastColor } from '@/utils/color'
import { Palette, Plus } from 'lucide-react'
import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

export const AntControlPanel: React.FC = () => {
  const { currentPlayer } = useGameStore()
  const { isPlacingAnt, isFlippingTile, actions: uiActions } = useUIStore()
  const { toast } = useToast()

  if (!currentPlayer) {
    return null
  }

  const hasAnt = !!currentPlayer.antId

  const handlePlaceAnt = () => {
    if (hasAnt) {
      toast({
        title: 'You already have an ant',
        description: 'You can only have one ant at a time.',
      })

      return
    }

    if (window.innerWidth < 768) {
      uiActions.setSidebarOpen(false)
    }

    uiActions.setIsPlacingAnt(true)
    toast({
      title: 'Place Your Ant',
      description: 'Click on any cell in the grid to place your ant.',
    })
  }

  const handleToggleTileFlip = () => {
    if (window.innerWidth < 768) {
      uiActions.setSidebarOpen(false)
    }

    const newFlippingState = !isFlippingTile
    uiActions.setIsFlippingTile(newFlippingState)

    if (newFlippingState) {
      toast({
        title: 'Tile Flip Mode',
        description: 'Click on any cell in the grid to flip its color.',
      })
    } else {
      toast({
        title: 'Tile Flip Mode Disabled',
        description: 'Tile flipping mode has been turned off.',
      })
    }
  }

  return (
    <TooltipProvider>
      <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4">
        <div className="w-full px-4 py-2 bg-gray-700 text-gray-100 font-semibold rounded-t-lg text-lg">
          Ant Controls
        </div>
        <div className="p-4">
          <div className="grid grid-rows-2 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handlePlaceAnt}
                  disabled={!currentPlayer || hasAnt}
                  className={`flex items-center justify-center gap-2 px-4 py-2 disabled:bg-gray-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded transition-colors ${isPlacingAnt ? 'ring-2 ring-yellow-400' : ''}`}
                  style={{ backgroundColor: isPlacingAnt ? '#fbbf24' : currentPlayer.color }}>
                  <Plus
                    size={16}
                    style={{ color: contrastColor(isPlacingAnt ? '#fbbf24' : currentPlayer.color) }} />
                  <span
                    className="text-sm"
                    style={{ color: contrastColor(isPlacingAnt ? '#fbbf24' : currentPlayer.color) }}>
                    {isPlacingAnt ? 'Cancel Place' : 'Place Ant'}
                  </span>
                </button>
              </TooltipTrigger>
              {hasAnt && (
                <TooltipContent>
                  <p>You cannot place more than one ant</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled={!currentPlayer}
                  onClick={handleToggleTileFlip}
                  className={`flex items-center justify-center gap-2 px-4 py-2 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors ${isFlippingTile ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  style={{ backgroundColor: isFlippingTile ? '#fbbf24' : currentPlayer.color }}>
                  <Palette
                    size={16}
                    style={{ color: contrastColor(isFlippingTile ? '#fbbf24' : currentPlayer.color) }} />
                  <span
                    className="text-sm"
                    style={{ color: contrastColor(isFlippingTile ? '#fbbf24' : currentPlayer.color) }}>
                    {isFlippingTile ? 'Cancel Flip' : 'Flip Tiles'}
                  </span>
                </button>
              </TooltipTrigger>
              {!currentPlayer && (
                <TooltipContent>
                  <p>You must be connected to flip tiles</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>

          <div className="p-3 bg-gray-750 rounded border mt-4" style={{ borderColor: currentPlayer.color }}>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: currentPlayer.color }} />
              <span
                className="text-sm text-gray-300">
                Your color: {currentPlayer.color}
              </span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
