# Langton's Ant API Reference

## Overview

The Langton's Ant API provides a WebSocket-based real-time gaming experience where multiple players can control ants on a shared grid. Each ant follows customizable rules that determine its movement and color changes.

## Base URL

```
ws://localhost:3001
http://localhost:3001
```

## HTTP Endpoints

### Health Check
```
GET /health
```

Returns the server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## WebSocket Protocol

### Connection

Connect to the WebSocket server to join the game:

```javascript
const ws = new WebSocket('ws://localhost:3001')
```

### Message Format

All messages follow this structure:

```typescript
{
  type: string
  payload: object
}
```

### Rate Limiting

The API implements rate limiting to prevent abuse:

- **Window**: 1000ms (1 second)
- **Limit**: 30 messages per window

**Rate Limit Response:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Rate limit exceeded. Please wait before sending more messages."
  }
}
```

## Incoming Messages (Client → Server)

### PLACE_ANT

Place an ant on the grid.

```typescript
{
  type: 'PLACE_ANT'
  payload: {
    position: {
      x: number
      y: number
    }
    rules?: Rule[]
  }
}
```

**Parameters:**
- `position`: Grid coordinates (0-based)
- `rules`: Optional array of movement rules (see Rule format below)

**Rule Format:**
```typescript
{
  cellColor: string  // Hex color (e.g., '#FF0000')
  turnDirection: 'LEFT' | 'RIGHT'
}
```

**Example:**
```json
{
  "type": "PLACE_ANT",
  "payload": {
    "position": { "x": 10, "y": 10 },
    "rules": [
      { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
      { "cellColor": "#FF0000", "turnDirection": "RIGHT" }
    ]
  }
}
```

**Error Responses:**

1. **Player not found:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Player not found"
  }
}
```

2. **Player already has an ant:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Player already has an ant"
  }
}
```

3. **Position out of bounds:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Position out of bounds"
  }
}
```

4. **Invalid position coordinates:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Position coordinates must be integers"
  }
}
```

5. **Position already occupied:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "An ant already exists at this position"
  }
}
```

6. **Invalid rules:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid rule format: cellColor and turnDirection are required"
  }
}
```

### CHANGE_RULES

Update the rules for your ant.

```typescript
{
  type: 'CHANGE_RULES'
  payload: {
    rules: Rule[]
  }
}
```

**Example:**
```json
{
  "type": "CHANGE_RULES",
  "payload": {
    "rules": [
      { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
      { "cellColor": "#00FF00", "turnDirection": "RIGHT" }
    ]
  }
}
```

**Error Responses:**

1. **Player has no ant:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Player has no ant"
  }
}
```

2. **Ant not found:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Ant not found"
  }
}
```

3. **Empty rules:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Rules cannot be empty"
  }
}
```

4. **Invalid turn direction:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid turn direction: turnDirection must be LEFT or RIGHT"
  }
}
```

5. **Invalid color format:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid cell color: cellColor must be a valid hex color"
  }
}
```

6. **Duplicate colors:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Rules cannot have the same current color"
  }
}
```

### FLIP_TILE

Flip a tile color on the grid.

```typescript
{
  type: 'FLIP_TILE'
  payload: {
    position: {
      x: number
      y: number
    }
  }
}
```

**Example:**
```json
{
  "type": "FLIP_TILE",
  "payload": {
    "position": { "x": 5, "y": 5 }
  }
}
```

**Error Responses:**

1. **Player not found:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Player not found"
  }
}
```

2. **Position out of bounds:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Position out of bounds"
  }
}
```

3. **Tile belongs to another player:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Tile is colored by another player"
  }
}
```

## Outgoing Messages (Server → Client)

### WELCOME

Sent when a client first connects.

```typescript
{
  type: 'WELCOME'
  payload: {
    player: {
      id: string
      color: string
      antId: string | null
    }
    state: {
      ants: Ant[]
      grid: {
        width: number
        height: number
        cells: Record<string, string>
      }
    }
  }
}
```

**Example:**
```json
{
  "type": "WELCOME",
  "payload": {
    "player": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "color": "#FF5733",
      "antId": null
    },
    "state": {
      "ants": [],
      "grid": {
        "width": 1000,
        "height": 1000,
        "cells": {}
      }
    }
  }
}
```

### PLAYER_JOINED

Broadcasted when a new player joins.

```typescript
{
  type: 'PLAYER_JOINED'
  payload: {
    playerId: string
    color: string
  }
}
```

**Example:**
```json
{
  "type": "PLAYER_JOINED",
  "payload": {
    "playerId": "550e8400-e29b-41d4-a716-446655440001",
    "color": "#33FF57"
  }
}
```

### PLAYER_LEFT

Broadcasted when a player leaves.

```typescript
{
  type: 'PLAYER_LEFT'
  payload: {
    playerId: string
    cells: Record<string, string>
  }
}
```

**Example:**
```json
{
  "type": "PLAYER_LEFT",
  "payload": {
    "playerId": "550e8400-e29b-41d4-a716-446655440001",
    "cells": {
      "10,10": "#FFFFFF",
      "11,11": "#FFFFFF"
    }
  }
}
```

### ANT_PLACED

Broadcasted when a player places an ant.

```typescript
{
  type: 'ANT_PLACED'
  payload: {
    ant: Ant
    playerId: string
    cells: Record<string, string>
  }
}
```

**Example:**
```json
{
  "type": "ANT_PLACED",
  "payload": {
    "ant": {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "position": { "x": 10, "y": 10 },
      "direction": "UP",
      "color": "#FF5733",
      "rules": [
        { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
        { "cellColor": "#FF5733", "turnDirection": "RIGHT" }
      ]
    },
    "playerId": "550e8400-e29b-41d4-a716-446655440000",
    "cells": {}
  }
}
```

### RULES_CHANGED

Broadcasted when a player changes their rules.

```typescript
{
  type: 'RULES_CHANGED'
  payload: {
    playerId: string
    rules: Rule[]
  }
}
```

**Example:**
```json
{
  "type": "RULES_CHANGED",
  "payload": {
    "playerId": "550e8400-e29b-41d4-a716-446655440000",
    "rules": [
      { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
      { "cellColor": "#FF5733", "turnDirection": "RIGHT" },
      { "cellColor": "#3357FF", "turnDirection": "LEFT" }
    ]
  }
}
```

### TILE_FLIPPED

Broadcasted when a player flips a tile.

```typescript
{
  type: 'TILE_FLIPPED'
  payload: {
    cells: Record<string, string>
    playerId: string
  }
}
```

**Example:**
```json
{
  "type": "TILE_FLIPPED",
  "payload": {
    "cells": {
      "15,15": "#FF5733"
    },
    "playerId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### GAME_TICK_UPDATE

Broadcasted on each game tick with updated ant positions and cell changes.

```typescript
{
  type: 'GAME_TICK_UPDATE'
  payload: {
    ants: Ant[]
    cells: Record<string, string>
  }
}
```

**Example:**
```json
{
  "type": "GAME_TICK_UPDATE",
  "payload": {
    "ants": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440002",
        "position": { "x": 11, "y": 10 },
        "direction": "RIGHT",
        "color": "#FF5733",
        "rules": [
          { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
          { "cellColor": "#FF5733", "turnDirection": "RIGHT" }
        ]
      }
    ],
    "cells": {
      "10,10": "#FF5733"
    }
  }
}
```

### GRID_CHUNK

Sent when a new player joins to provide the current grid state in chunks.

```typescript
{
  type: 'GRID_CHUNK'
  payload: {
    chunk: number
    total: number
    cells: Record<string, string>
  }
}
```

**Example:**
```json
{
  "type": "GRID_CHUNK",
  "payload": {
    "chunk": 1,
    "total": 5,
    "cells": {
      "0,0": "#FF5733",
      "1,1": "#33FF57",
      "2,2": "#3357FF"
    }
  }
}
```

### ERROR

Error response for invalid requests.

```typescript
{
  type: 'ERROR'
  payload: {
    message: string
  }
}
```

**Common Error Messages:**

1. **Invalid JSON format:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid JSON format"
  }
}
```

2. **Missing message type:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid message format: missing type"
  }
}
```

3. **Missing payload:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid message format: missing payload"
  }
}
```

4. **Invalid message type:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid message type: UNKNOWN_TYPE"
  }
}
```

5. **Connection error:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Connection error occurred"
  }
}
```

## Data Types

### Ant
```typescript
{
  id: string
  position: {
    x: number
    y: number
  }
  direction: 'UP' | 'RIGHT' | 'DOWN' | 'LEFT'
  color: string
  rules: Rule[]
}
```

### Position
```typescript
{
  x: number
  y: number
}
```

### Rule
```typescript
{
  cellColor: string
  turnDirection: 'LEFT' | 'RIGHT'
}
```

## Game Rules

1. **Grid Wrapping**: The grid wraps around at edges
2. **Ant Movement**: Ants move one cell per tick based on their rules
3. **Color Changes**: When an ant moves, it changes the color of the cell it was on
4. **Collision Prevention**: Multiple ants cannot occupy the same cell. First ant to move to a cell wins.
5. **Mandatory Rules**: Each ant must have rules for white cells and its own color
6. **Tile Flipping**: Players can manually flip tiles of their own color or white tiles

## Edge Cases and Error Scenarios

### Connection Issues

1. **Client Disconnection**: When a client disconnects unexpectedly, their ant and colored tiles are removed from the game
2. **Server Restart**: All game state is lost on server restart (no persistence implemented)
3. **Network Latency**: High latency may cause delayed updates but won't break the game

### Game State Edge Cases

1. **Maximum Players Reached**: New connections are rejected when max players limit is reached
2. **Grid Boundaries**: Ants wrap around grid edges seamlessly
3. **Concurrent Ant Placement**: If multiple players try to place ants at the same position simultaneously, only the first succeeds
4. **Rule Conflicts**: Players cannot create rules with duplicate colors for the same cell state

### Performance Considerations

1. **Large Grids**: Grid size is not limited, but performance may degrade with large grids
2. **Many Players**: Performance degrades linearly with the number of connected players
3. **Frequent Updates**: High-frequency rule changes may trigger rate limiting

## Error Handling

The API returns descriptive error messages for various scenarios:

- `Player not found`: Invalid player ID
- `Player already has an ant`: Attempting to place a second ant
- `Position out of bounds`: Invalid grid coordinates
- `An ant already exists at this position`: Cell already occupied
- `Invalid rule format`: Malformed rule object
- `Invalid turn direction`: Must be 'LEFT' or 'RIGHT'
- `Invalid cell color`: Must be valid hex color
- `Rules cannot have the same current color`: Duplicate colors in rules
- `Rate limit exceeded`: Too many requests in time window
- `Tile is colored by another player`: Cannot flip another player's tile

## Client Implementation Example

```javascript
const ws = new WebSocket('ws://localhost:3001')

ws.onopen = () => {
  console.log('Connected to Langton\'s Ant server')
}

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  
  switch (message.type) {
    case 'WELCOME':
      console.log('Welcome! Player ID:', message.payload.player.id)
      break
      
    case 'GAME_TICK_UPDATE':
      updateGameDisplay(message.payload)
      break
      
    case 'ERROR':
      console.error('Error:', message.payload.message)
      break
  }
}

// Place an ant
ws.send(JSON.stringify({
  type: 'PLACE_ANT',
  payload: {
    position: { x: 10, y: 10 },
    rules: [
      { cellColor: '#FFFFFF', turnDirection: 'LEFT' },
      { cellColor: '#FF0000', turnDirection: 'RIGHT' }
    ]
  }
}))
```

## Configuration

The server can be configured via environment variables:

- `PORT`: Server port (default: 3001)
- `LOG_LEVEL`: Logging level (default: info)
- `GRID_WIDTH`: Grid width (default: 1000)
- `GRID_HEIGHT`: Grid height (default: 1000)
- `TICK_INTERVAL`: Game tick interval in ms (default: 250)
- `MAX_PLAYERS`: Maximum number of players (default: 10)
- `HEARTBEAT_INTERVAL`: WebSocket heartbeat interval in ms (default: 10000)
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window in ms (default: 1000)
- `MAX_MESSAGES_PER_WINDOW`: Rate limit per window (default: 30)
- `GRID_CHUNK_SIZE`: Grid chunk size for new players (default: 1000)