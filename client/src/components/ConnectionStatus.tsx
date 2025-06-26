import React from 'react'
import { useUIStore } from '@/stores/uiStore'

export const ConnectionStatus: React.FC = () => {
  const { isConnected, connectionError } = useUIStore()

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
      <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'
        }`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      {
        connectionError && (
          <span className="text-xs text-red-300 ml-2">
            {connectionError}
          </span>
        )
      }
    </div>
  )
}
