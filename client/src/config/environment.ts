export const environment = {
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001',
} as const 