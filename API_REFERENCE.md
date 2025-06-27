# Langton's Ant API Reference

## Overview

The Langton's Ant API provides a WebSocket-based real-time gaming experience where multiple players can control ants on a shared grid. Each ant follows customizable rules that determine its movement and color changes. The API supports up to 10 concurrent players on a 20x20 grid with real-time updates every 250ms.

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

## Data Types

### Position
```typescript
{
  x: number  // Grid coordinate (0-based)
  y: number  // Grid coordinate (0-based)
}
```

### Direction
```typescript
'UP' | 'RIGHT' | 'DOWN' | 'LEFT'
```

### Color
```typescript
string  // Hex color format (e.g., '#FF0000')
```

### Rule
```typescript
{
  cellColor: string      // Hex color of the cell
  turnDirection: 'LEFT' | 'RIGHT'  // Direction to turn
}
```

### Ant
```typescript
{
  id: string
  position: Position
  direction: Direction
  color: Color
  rules: Rule[]
}
```

### Player
```typescript
{
  id: string
  color: Color
  antId: string | null
}
```

## Incoming Messages (Client → Server)

### PLACE_ANT

Place an ant on the grid.

```typescript
{
  type: 'PLACE_ANT'
  payload: {
    position: Position
    rules?: Rule[]
    direction?: Direction
  }
}
```

**Parameters:**
- `position`: Grid coordinates (0-based, must be integers)
- `rules`: Optional array of movement rules
- `direction`: Optional initial direction (defaults to 'UP')

**Example:**
```json
{
  "type": "PLACE_ANT",
  "payload": {
    "position": { "x": 10, "y": 10 },
    "rules": [
      { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
      { "cellColor": "#FF0000", "turnDirection": "RIGHT" }
    ],
    "direction": "UP"
  }
}
```

**Success Response:**
```json
{
  "type": "ANT_PLACED",
  "payload": {
    "cells": {},
    "ant": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "position": { "x": 10, "y": 10 },
      "direction": "UP",
      "color": "#FF5733",
      "rules": [
        { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
        { "cellColor": "#FF5733", "turnDirection": "RIGHT" }
      ]
    },
    "playerId": "550e8400-e29b-41d4-a716-446655440001"
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

6. **Invalid direction:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid direction"
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

**Success Response:**
```json
{
  "type": "RULES_CHANGED",
  "payload": {
    "playerId": "550e8400-e29b-41d4-a716-446655440001",
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

4. **Invalid rule format:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid rule format: cellColor and turnDirection are required"
  }
}
```

5. **Invalid turn direction:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid turn direction: turnDirection must be LEFT or RIGHT"
  }
}
```

6. **Invalid color format:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Invalid cell color: cellColor must be a valid hex color"
  }
}
```

7. **Duplicate colors:**
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
    position: Position
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

**Success Response:**
```json
{
  "type": "TILE_FLIPPED",
  "payload": {
    "cells": {
      "5,5": "#FF5733"
    },
    "playerId": "550e8400-e29b-41d4-a716-446655440001"
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

### UPDATE_GAME_CONFIG

Update game configuration (only works before game starts).

```typescript
{
  type: 'UPDATE_GAME_CONFIG'
  payload: {
    gridSize: number
    tickInterval: number
  }
}
```

**Example:**
```json
{
  "type": "UPDATE_GAME_CONFIG",
  "payload": {
    "gridSize": 50,
    "tickInterval": 500
  }
}
```

**Success Response:**
```json
{
  "type": "GAME_CONFIG_UPDATED",
  "payload": {
    "gridSize": 50,
    "tickInterval": 500
  }
}
```

**Error Responses:**

1. **Game already started:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Cannot update config after game has started"
  }
}
```

2. **Grid size is too small:**
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Grid width and height must be greater than 1"
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
    player: Player
    state: {
      players: Record<string, Player>
      ants: Ant[]
      grid: {
        width: number
        height: number
        cells: Record<string, Color>
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
      "players": {
        "550e8400-e29b-41d4-a716-446655440000": {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "color": "#FF5733",
          "antId": null
        }
      },
      "ants": [],
      "grid": {
        "width": 20,
        "height": 20,
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
    color: Color
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
    cells: Record<string, Color>
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

### GAME_TICK_UPDATE

Sent every tick (250ms by default) with game state updates.

```typescript
{
  type: 'GAME_TICK_UPDATE'
  payload: {
    cells: Record<string, Color>
    ants: Ant[]
  }
}
```

**Example:**
```json
{
  "type": "GAME_TICK_UPDATE",
  "payload": {
    "cells": {
      "10,10": "#FF5733",
      "11,10": "#33FF57"
    },
    "ants": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "position": { "x": 11, "y": 10 },
        "direction": "RIGHT",
        "color": "#FF5733",
        "rules": [
          { "cellColor": "#FFFFFF", "turnDirection": "LEFT" },
          { "cellColor": "#FF5733", "turnDirection": "RIGHT" }
        ]
      }
    ]
  }
}
```

### GRID_CHUNK

Sent when sending large grid data in chunks.

```typescript
{
  type: 'GRID_CHUNK'
  payload: {
    chunk: number
    total: number
    cells: Record<string, Color>
  }
}
```

**Example:**
```json
{
  "type": "GRID_CHUNK",
  "payload": {
    "chunk": 1,
    "total": 3,
    "cells": {
      "0,0": "#FFFFFF",
      "0,1": "#FF5733",
      "1,0": "#33FF57"
    }
  }
}
```

## Game Rules

### Ant Movement
1. **Rule Application**: When an ant moves to a cell, it applies the rule for that cell's color
2. **Direction Change**: The ant turns according to the rule's `turnDirection`
3. **Color Change**: The cell's color changes to the ant's color
4. **Movement**: The ant moves one step in its new direction
5. **Wrapping**: Ants wrap around the grid edges
6. **Collision Handling**: If an ant tries to move to an occupied cell, it turns 180 degrees and if it still can't move, it stays in place

### Rule System
- **Mandatory Rules**: Every ant must have rules for white (`#FFFFFF`) and its own color
- **Custom Rules**: Players can define additional rules for other colors
- **Rule Validation**: Rules are validated for format, color validity, and uniqueness
- **Default Rules**: If no rules are provided, default rules are applied which are:
  - White cell: turn left
  - Ant's own color cell: turn right

### Player Management
- **Maximum Players**: 10 concurrent players
- **Color Assignment**: Unique colors are automatically assigned
- **Player Removal**: When a player disconnects, their colored cells are cleared
- **Reconnection**: Plater's ant is removed, cells are cleared and they get new IDs and colors on reconnection

## Error Handling

All errors follow this format:

```typescript
{
  type: 'ERROR'
  payload: {
    message: string
  }
}
```

Common error scenarios:
- Invalid message format
- Rate limit exceeded
- Player not found
- Position out of bounds
- Invalid rules
- Game configuration errors

## Configuration

Default game configuration:

```typescript
{
  gridWidth: 20,
  gridHeight: 20,
  tickInterval: 250,        // milliseconds
  maxPlayers: 10,
  heartbeatInterval: 10000, // milliseconds
  rateLimitWindowMs: 1000,  // milliseconds
  maxMessagesPerWindow: 30,
  gridChunkSize: 1000
}
```

## Connection Lifecycle

1. **Connect**: Client connects to WebSocket server
2. **Welcome**: Server sends welcome message with player info and game state
3. **Gameplay**: Client can place ant, change rules, flip tiles
4. **Updates**: Server broadcasts game tick updates every 250ms
5. **Disconnect**: Server handles player cleanup and broadcasts player left