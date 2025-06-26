import { useGameStore } from '@/stores/gameStore'
import { useUIStore } from '@/stores/uiStore'
import React, { useEffect, useRef, useState } from 'react'

export const CollapsibleRuleEditor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const { currentPlayer, selectedRules, actions } = useGameStore()
  const { isConnected } = useUIStore()
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (isConnected && currentPlayer) {
      setIsOpen(true)
    }
  }, [isConnected, currentPlayer])

  useEffect(() => {
    setTimeout(() => {
      const listRef = document.querySelector('.space-y-3')

      if (listRef) {
        listRef.scrollTo({
          top: listRef.scrollHeight,
          behavior: 'smooth'
        })
      }
    }, 0)
  }, [selectedRules])

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isOpen, selectedRules])

  if (!isConnected || !currentPlayer) {
    return null
  }

  const updateRuleDirection = (index: number, value: 'LEFT' | 'RIGHT') => {
    actions.setSelectedRules(selectedRules.map((rule, i) =>
      i === index ? { ...rule, turnDirection: value } : rule
    ))
  }

  const updateRules = () => {
    actions.changeAntRules(selectedRules)
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-gray-700 text-gray-100 font-semibold focus:outline-none rounded-t-lg ${!isOpen ? 'rounded-b-lg' : ''}`}>
        <span>Rule Editor</span>
        <span className="ml-2">{isOpen ? '-' : '+'}</span>
      </button>
      <div
        style={{
          maxHeight: isOpen ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
        <div ref={contentRef} className="p-4 bg-gray-800 rounded-b-lg">
          <div className="space-y-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {
                selectedRules.map((rule, index) => (
                  <div key={index} className="bg-gray-750 p-3 rounded border border-gray-600">
                    <div className="grid grid-cols-2 gap-3 items-start">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Cell Color
                        </label>
                        <div className="w-8 h-8 rounded border border-gray-600" style={{ backgroundColor: rule.cellColor }}></div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Turn Direction
                        </label>
                        <select
                          value={rule.turnDirection}
                          onChange={(e) => updateRuleDirection(index, e.target.value as 'LEFT' | 'RIGHT')}
                          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white">
                          <option value="LEFT">Turn Left</option>
                          <option value="RIGHT">Turn Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>

            <button
              onClick={updateRules}
              className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
              Update Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
