import { useUIStore } from '@/stores/uiStore'
import { X } from 'lucide-react'
import React from 'react'
import { AntControlPanel } from './AntControlPanel'
import { AntsList } from './AntsList'
import { CollapsibleRuleEditor } from './CollapsibleRuleEditor'
import { GameControls } from './GameControls'

export const Sidebar: React.FC = () => {
  const { sidebarOpen, actions: uiActions } = useUIStore()

  return (
    <>
      {
        sidebarOpen && (
          <div
            className="fixed top-16 bottom-0 left-0 right-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => uiActions.setSidebarOpen(false)} />
        )
      }

      <aside
        className={`
        bg-gray-900 border-r border-gray-700 transition-all duration-300 ease-in-out
        fixed md:relative top-16 md:top-0 left-0 z-40 md:z-auto
        w-80 h-full
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarOpen ? 'md:w-80' : 'md:w-0'}
        flex flex-col
      `}>
        <div
          className={`
          min-w-80 transition-opacity duration-300 flex-1 flex flex-col p-4 h-full
          ${sidebarOpen ? 'opacity-100' : 'opacity-0'}
        `}>
          <div className="space-y-6 flex-1 overflow-y-auto overflow-x-visible min-h-0 scrollbar-none">
            <GameControls />
            <AntControlPanel />
            <CollapsibleRuleEditor />
            <AntsList />
          </div>

          <div className="pt-4 flex-shrink-0">
            <button
              onClick={() => uiActions.setSidebarOpen(false)}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700">
              <X size={16} />
              <span>Hide</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
