# Multiplayer Langton's Ant Server

## Description
Langton's Ant is a two-dimensional cellular automaton with simple local rules that produce complex global behaviour.  
This repository contains a **multiplayer, real-time** WebSocket server implementation where every connected player controls an individual ant with a unique colour and rule-set. The service consists of:

* **Server** – a Node + TypeScript WebSocket server responsible for game state, tick processing, validation and broadcasting.
  - For a complete description of all public classes, methods and message schemas see [API_REFERENCE.md](./API_REFERENCE.md).

**🌐 Live Demo**: [https://tsdmrfth-langtons-ant.netlify.app](https://tsdmrfth-langtons-ant.netlify.app)

The server maintains a single authoritative grid; clients receive incremental snapshots every 250 ms and render only the changed chunks for performance.

---
# Server Setup

## Getting Started

### Prerequisites
* Node ≥ 24.X
* npm ≥ 11.3.0

#### 1 — Clone & install
```bash
git clone https://github.com/tsdmrfth/langtons-ant
cd langtons-ant
npm install
```

#### 2 — Run the server (dev mode)
Run the server
```bash
npm run dev
```

#### 3 — Run unit tests
Run the tests
```bash
npm test
```

#### 4 — Production deployment
The server is automatically deployed to Heroku via GitHub Actions CI/CD pipeline. Every push to the `main-v2` branch triggers:
1. TypeScript compilation validation
2. Test suite execution
3. Automatic deployment to Heroku if all checks pass

The production server uses PM2 for process management and automatic restarts.

---
## Server Features

#### Game Engine
- **Real-time Game Loop**: Efficient tick processing with configurable intervals
- **Grid Management**: In-memory grid storage with chunked transmission for performance
- **Ant Movement**: Accurate ant movement and collision detection
- **Rule System**: Flexible rule definition with validation and enforcement
- **Player Management**: Dynamic player connection/disconnection handling

#### WebSocket Protocol
- **Real-time Communication**: WebSocket-based communication with automatic reconnection
- **Message Validation**: Comprehensive validation of incoming WebSocket messages
- **Error Handling**: Detailed error responses with specific error messages
- **State Synchronization**: Real-time game state updates across all clients
- **Grid Chunking**: Efficient large grid transmission with chunked updates

#### Player Management
- **Unique Color Assignment**: Each player gets a unique random color on connection
- **Player Tracking**: Real-time tracking of all connected players and their ants
- **Connection Management**: Graceful handling of player connections and disconnections
- **Session Management**: Stateless design for scalability

#### Game Logic
- **Rule Validation**: Comprehensive rule validation with mandatory white and player color rules
- **Collision Detection**: Deterministic collision resolution with player-join order priority
- **Ant Placement**: Validated ant placement with bounds checking
- **Tile Management**: Efficient tile state management and updates

### 🔧 Technical Implementation

#### Architecture
- **Node.js**: High-performance server runtime
- **TypeScript**: Full type safety with strict configuration
- **WebSocket**: Native WebSocket API for real-time communication
- **In-Memory Storage**: Ultra-low latency grid storage with Map-based data structures

#### Performance Optimizations
- **Grid Chunking**: Efficient transmission of large grids with chunked updates
- **Incremental Updates**: Only transmits changed grid chunks
- **Memory Management**: Optimized memory usage with efficient data structures
- **Rate Limiting**: Prevents message flooding and abuse

#### Error Handling
- **Validation Utilities**: Comprehensive input validation for all messages
- **Error Recovery**: Graceful error handling throughout the application
- **Logging**: Comprehensive logging with Pino for debugging and monitoring
- **Health Checks**: Server health monitoring endpoint

#### Testing
- **Integration Tests**: Missing WebSocket integration tests
- **Load Testing**: Missing comprehensive load testing

#### Infrastructure
- **Backup**: Missing data backup and recovery mechanisms

---
## Technical Choices
| Topic | Decision & Rationale |
|-------|----------------------|
| **Language** | TypeScript with `strict: true` for reliability and editor tooling |
| **Runtime** | Node.js for high-performance server-side JavaScript |
| **WebSocket** | Native WebSocket API for real-time communication |
| **State model** | `GameEngine` class keeps all grid data in memory for ultra-low latency; grid is a `Map` keyed by `x,y` and sharded into fixed-size chunks to minimise diff payloads |
| **Collision policy** | When an ant attempts to move to an occupied cell, it first tries to turn 180 degrees and move in the opposite direction. If that position is also occupied, the ant stays in place. This provides a more dynamic collision resolution while maintaining determinism. |
| **Colour allocation** | Random RGB excluding already-used values; guarantees uniqueness. |
| **Testing** | Jest unit tests for all game logic and WebSocket contract; CI step aborts on failure. |
| **Performance** | `permessage-deflate` is enabled in the WS handshake which cuts average snapshot payload size in local profiling and boosts ops/sec at shorter tick intervals. |

---
## Requirements Conflict Resolution

### The Conflict
The original requirements contained a conceptual conflict between two stated goals:

1. **Custom Rules**: "Each player can define a custom rule for their ant (e.g., specify turn directions and color flips for different tile states)"
2. **Other Players' Tiles**: "Tiles colored by other players' ants should be treated as blank (white) for a player's ant rules"

### The Problem
If players can only define rules for "white" and "their own color", but other players' tiles are treated as white, then the "custom rules for different tile states" becomes meaningless - there are effectively only two states per ant.

### Chosen Resolution
We resolved this conflict by implementing a **simplified two-state rule system**:

- **State 1**: White tiles and other players' colored tiles → Apply the "white" rule
- **State 2**: My colored tiles → Apply the "my color" rule

### Implementation Details
The current implementation in `GameEngine.processAnt()` correctly handles this:

```typescript
const cellColor = this.getCellColor(ant.position)
const ruleColor = cellColor === ant.color ? cellColor : COLOR_WHITE
const newColor = cellColor === ant.color ? COLOR_WHITE : ant.color
```

This treats any non-white, non-own-color tile as white for rule purposes, which aligns with the requirement while maintaining a simple and understandable rule system.

---
## Continuous Integration & Deployment
This repository uses GitHub Actions for continuous integration and automatic deployment to Heroku.

### CI/CD Pipeline
The workflow is located at `.github/workflows/ci.yml` and runs on every push and pull request to the `main-v2` branch.

**Pipeline Steps:**
1. Checkout code
2. Spin up a Node 24.x matrix runner
3. Install dependencies with `npm install`
4. Check TypeScript compilation with `npm run check-typescript`
5. Execute the Jest test suite with `npm test`
6. **Automatic Heroku deployment** (only on successful CI completion)

The workflow fails fast on type errors or failing tests, ensuring only validated code reaches production.

### Production Deployment
- **Platform**: Heroku
- **Process Manager**: PM2 for automatic restarts and process management
- **Branch**: `main-v2` (automatic deployment on successful CI)
- **Health Check**: Available at `/health` endpoint

---
## Trade-offs 
* **Colour continuity:** when a player disconnects, their colour is returned to the available pool. If they reconnect they will be treated as a new player and may receive a different colour – the implementation keeps the server stateless and avoids reserving colours indefinitely.
* **Fairness:** current collision resolution favours earlier ants.
* **Performance vs Memory:** In-memory grid storage provides ultra-low latency but limits scalability for very large grids.
* **Stateless Design:** Server is stateless for simplicity but lacks session persistence for reconnection handling.
* **Production Deployment:** Automated deployment via GitHub Actions and Heroku for reliability and consistency.

---
## Future Work
With more time, I would have liked to implement and test the following:
- Implement player session persistence for reconnection handling
- Offload tick processing to worker threads to maintain WebSocket event loop responsiveness for larger grids
- Partition the grid across shards and broadcast merged diffs for larger loads (e.g. 10k×10k grid with 160 players)
- Add a Redis layer plus periodic snapshots to enable restarts and historical replay
- Add a deployment script to deploy the server to a cloud provider
- Add support for other languages

---
### Infrastructure
- **Automated Deployment**: CI/CD pipeline with GitHub Actions and Heroku integration
- **Process Management**: PM2 for production process management and automatic restarts
- **Environment Management**: Heroku environment configuration
- **Monitoring**: Application health checks and logging
- **Load Testing**: Comprehensive load testing for server performance
- **Documentation**: API documentation and user guides

---
## Performance Benchmarks
The following numbers were produced on an Apple M2 Pro using the provided benchmark script:

- Higher Ops/Sec = faster
- Lower Heap MB = less memory

### main-v2 branch

| Grid (NxN) | Players | Ops / Sec | Heap MB |
|------------|---------|-----------|---------|
| 100x100 | 5 | 416,554 | 7.0 |
| 100x100 | 10 | 229,500 | 5.7 |
| 100x100 | 20 | 114,953 | 7.2 |
| 100x100 | 40 | 57,400 | 6.1 |
| 100x100 | 80 | 28,843 | 6.2 |
| 100x100 | 160 | 14,302 | 18.2 |
| 500x500 | 5 | 505,248 | 18.9 |
| 500x500 | 10 | 246,823 | 18.6 |
| 500x500 | 20 | 117,962 | 19.2 |
| 500x500 | 40 | 58,763 | 14.4 |
| 500x500 | 80 | 27,928 | 6.7 |
| 500x500 | 160 | 13,457 | 25.7 |
| 1000x1000 | 5 | 504,819 | 10.4 |
| 1000x1000 | 10 | 245,297 | 10.1 |
| 1000x1000 | 20 | 116,474 | 10.7 |
| 1000x1000 | 40 | 58,293 | 37.7 |
| 1000x1000 | 80 | 27,900 | 29.3 |
| 1000x1000 | 160 | 11,921 | 26.4 |
| 5000x5000 | 5 | 503,589 | 12.2 |
| 5000x5000 | 10 | 235,595 | 15.0 |
| 5000x5000 | 20 | 117,722 | 19.3 |
| 5000x5000 | 40 | 55,749 | 25.4 |
| 5000x5000 | 80 | 27,329 | 7.3 |
| 5000x5000 | 160 | 13,120 | 9.7 |
| 10000x10000 | 5 | 478,091 | 28.2 |
| 10000x10000 | 10 | 234,262 | 31.1 |
| 10000x10000 | 20 | 117,377 | 38.2 |
| 10000x10000 | 40 | 56,873 | 13.4 |
| 10000x10000 | 80 | 27,403 | 28.6 |
| 10000x10000 | 160 | 12,993 | 39.0 |

Run it yourself:
```bash
npm run benchmark
```

---
## Key Changes in main-v2 branch

This branch introduces significant improvements to the Langton's Ant API, focusing on enhanced functionality, better error handling, and improved performance. Here are the key changes:

### 🔧 **Server Configuration & Infrastructure**
- **Logging**: Added comprehensive logging with Pino for better debugging and monitoring
- **Rate Limiting**: Implemented rate limiting (30 messages per second window) to prevent abuse
- **Health Check**: Added `/health` endpoint for monitoring server status

### 🎮 **Game Engine Enhancements**
- **Rule System**: Completely refactored rule system with improved validation:
  - Changed `currentColor` to `cellColor` for clarity
  - Removed `newColor` property (simplified rule structure)
  - Added mandatory rule validation (white and player color rules)
  - Enhanced rule validation with duplicate color detection
  - Added 180 degree turn rule: ant will turn 180 degrees if the cell is occupied by another ant
- **Player Management**: Improved player removal with automatic cell clearing
- **Ant Placement**: Enhanced validation for position bounds and coordinate types
- **Game Loop**: Optimized tick processing with better state management
- **Collision Policy**: Improved collision resolution with 180 degree turn rule

### **WebSocket Protocol Improvements**
- **Message Types**: Added new message types and standardized existing ones for better consistency:
  - `PLAYER_JOIN` → `PLAYER_JOINED`
  - `PLACE_ANT` → `ANT_PLACED`
  - `RULE_CHANGE` → `CHANGE_RULES`
  - `TILE_FLIP` → `FLIP_TILE`
- **Error Handling**: Comprehensive error responses with specific error messages
- **Message Validation**: Enhanced message validation with type checking
- **Grid Chunking**: Implemented grid chunking for efficient large grid transmission

### 🛠 **Developer Experience**
- **TypeScript Types**: Enhanced type definitions with comprehensive interfaces
- **API Documentation**: Complete API reference with examples and error responses
- **Testing**: Improved test coverage with 51 passing tests
- **Dependencies**: Added Pino for logging and updated all dependencies

### 🔒 **Security & Performance**
- **Rate Limiting**: Prevents message flooding and abuse
- **Input Validation**: Comprehensive validation for all incoming messages
- **Memory Management**: Optimized memory usage with better data structures
- **Error Boundaries**: Graceful error handling throughout the application

### 📊 **Configuration Updates**
- **Game Config**: Added new configuration options:
  - `rateLimitWindowMs`: Rate limiting window (1000ms)
  - `maxMessagesPerWindow`: Maximum messages per window (30)
  - `gridChunkSize`: Grid chunk size for transmission (1000)
- **Constants**: Added `COLOR_WHITE` constant for consistency
- **Production**: PM2 process management for automatic restarts and monitoring

### 🧪 **Testing Improvements**
- **Comprehensive Coverage**: Tests for all major functionality
- **Error Scenarios**: Tests for various error conditions
- **Performance Tests**: Benchmark script for performance testing

### CI/CD Pipeline
- **GitHub Actions**: CI/CD pipeline with GitHub Actions and Heroku integration
- **Heroku**: Production deployment to Heroku
- **PM2**: Process management for automatic restarts and monitoring
- **Environment Management**: Heroku environment configuration
- **Monitoring**: Application health checks and logging