import React from 'react'
import { useUIStore } from '@/stores/uiStore'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ConnectionStatus } from './ConnectionStatus'

export const Header: React.FC = () => {
  const { sidebarOpen, actions: uiActions } = useUIStore()

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={() => uiActions.setSidebarOpen(!sidebarOpen)}
          className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
          {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        <h1 className="text-xl font-bold text-white">
          Multiplayer Langton's Ant
        </h1>
      </div>

      <ConnectionStatus />
    </header>
  )
}
