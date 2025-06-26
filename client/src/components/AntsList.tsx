import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useGameStore } from '@/stores/gameStore'
import { Settings } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

export const AntsList: React.FC = () => {
  const { currentPlayer, ants } = useGameStore()
  const [collapsed, setCollapsed] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const sortedAnts = [...ants].sort((a, b) => {
    const aIsCurrentUser = a.id === currentPlayer?.antId
    const bIsCurrentUser = b.id === currentPlayer?.antId

    if (aIsCurrentUser && !bIsCurrentUser) return -1
    if (!aIsCurrentUser && bIsCurrentUser) return 1
    return 0
  })

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [collapsed, ants.length])

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-gray-700 text-gray-100 font-semibold focus:outline-none rounded-t-lg ${collapsed ? 'rounded-b-lg' : ''} text-lg`}>
        <span>Ants ({ants.length})</span>
        <span className="ml-2">{collapsed ? '+' : '-'}</span>
      </button>
      <div
        style={{
          maxHeight: collapsed ? 0 : contentHeight,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
        <div ref={contentRef} className="p-4">
          <div className="space-y-2">
            {
              sortedAnts.map((ant, index) => {
                const isCurrentUser = ant.id === currentPlayer?.antId
                const playerNumber = index + 1

                return (
                  ant && ant.id && (
                    <div
                      key={ant.id}
                      className={`flex items-center gap-3 p-2 rounded ${isCurrentUser ? 'border' : 'bg-gray-750'}`}
                      style={isCurrentUser ? {
                        backgroundColor: `${currentPlayer.color}20`,
                        borderColor: currentPlayer.color
                      } : {}}>

                      <div
                        className="flex-1 flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded border border-gray-500"
                          style={{ backgroundColor: ant.color }} />
                        <span
                          className={`text-sm flex-1 ${isCurrentUser ? 'text-blue-400 font-medium' : 'text-gray-300'}`}
                          style={{ color: ant.color }}>
                          {isCurrentUser ? 'Your ant' : `Player ${playerNumber}'s ant`}
                        </span>
                      </div>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Settings className="h-4 w-4 text-gray-400" />
                            <span className="sr-only">Ant Settings</span>
                          </Button>
                        </PopoverTrigger>

                        <PopoverContent
                          className="w-auto"
                          side="right"
                          align="start"
                          onClick={(e) => e.stopPropagation()}>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Ant Rules</h4>
                              <p className="text-sm text-muted-foreground">
                                Color-based turning rules.
                              </p>
                            </div>
                            <div className="grid gap-2">
                              {
                                ant.rules.map((rule, index) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-muted-foreground">Cell Color:</span>
                                      <div
                                        className="w-4 h-4 rounded-full border border-gray-400"
                                        style={{ backgroundColor: rule.cellColor }}
                                      />
                                      <span className="font-mono text-sm">{rule.cellColor}</span>
                                    </div>
                                    <span className="text-sm font-medium">
                                      {rule.turnDirection === 'LEFT' ? 'Turn Left' : 'Turn Right'}
                                    </span>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )
                )
              })
            }

            {
              ants.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">No ants placed yet</p>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
} 