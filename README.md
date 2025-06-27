# Multiplayer Langton's Ant

## Description
Langton's Ant is a two-dimensional cellular automaton with simple local rules that produce complex global behaviour.  
This repository contains a **multiplayer, real-time, browser-based** implementation where every connected player controls an individual ant with a unique colour and rule-set. The service consists of:

* **api/** – a Node + TypeScript WebSocket server responsible for game state, tick processing, validation and broadcasting.
  - For a complete description of all public classes, methods and message schemas see [API_REFERENCE.md](./api/API_REFERENCE.md).
* **client/** – a React web application that renders the shared grid, lets the player define rules, place an ant, and interact with tiles.

The server maintains a single authoritative grid; clients receive incremental snapshots every 250 ms and render only the changed chunks for performance.

---
# Client Setup

## Getting Started

### Prerequisites
* Node ≥ 24.X
* npm ≥ 10.9.0

#### 1 — Clone & install
```bash
git clone https://github.com/tsdmrfth/langtons-ant
cd langtons-ant
yarn install
```

#### 2 — Run the client (dev mode)
Make sure you're in client folder

```bash
cd client
```

Run the client
```bash
yarn dev
```

The client will be available at `http://localhost:5173`

#### 3 — Build for production
```bash
cd client
yarn build
```

#### 4 — Preview production build
```bash
cd client
yarn preview
```

#### 5 - Production build & deploy
- Missing

---
# Server Setup

## Getting Started

### Prerequisites
* Node ≥ 24.X
* Yarn ≥ 4.6.0

#### 1 — Clone & install
```bash
git clone https://github.com/tsdmrfth/langtons-ant
cd langtons-ant
yarn install
```

#### 2 — Run the server (dev mode)
Make sure you're in api folder

```bash
cd api
```

Run the server
```bash
yarn dev
```

#### 3 — Run unit tests
Make sure you're in api folder

```bash
cd api
```

Run the tests
```bash
yarn test
```

#### 4 — Production build & deploy
- Missing

---
## Client Features

### ✅ Implemented Features

#### Frontend Implementation
- **Canvas-based Grid Renderer**: Uses HTML5 Canvas for efficient rendering of the game grid
- **Real-time Updates**: Smooth rendering with incremental updates every 250ms
- **Zoom and Pan**: Interactive canvas with zoom controls and pan functionality
- **Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui components
- **Performant rendering**: Only renders changed cells and ant positions

#### Rule Definition System
- **Collapsible Rule Editor**: Interactive UI for defining custom ant rules
- **Visual Color Picker**: Color selection for different cell states
- **Turn Direction Selection**: LEFT/RIGHT turn options for each rule
- **Real-time Rule Updates**: Rules are sent to server and synchronized across clients

#### Grid Interaction
- **Ant Placement**: Click to place ant on grid (when in placement mode)
- **Tile Flipping**: Click tiles to flip colors (white ↔ player color)
- **Player Color Isolation**: Other players' tiles are treated as white for rule application
- **Visual Feedback**: Clear indication of placement mode and interactive states

#### WebSocket Integration
- **Automatic Reconnection**: Robust reconnection logic with exponential backoff
- **Message Validation**: Comprehensive validation of incoming WebSocket messages
- **Error Handling**: Toast notifications for connection status and errors
- **State Synchronization**: Real-time game state updates across all clients

#### Player Management
- **Unique Color Assignment**: Each player gets a unique random color on connection
- **Player List**: Visual display of all connected players and their ants
- **Connection Status**: Real-time connection status indicator
- **Player Disconnection Handling**: Graceful handling of player disconnections

#### User Experience
- **Toast Notifications**: Comprehensive feedback for all user actions
- **Loading States**: Visual feedback during async operations
- **Error Boundaries**: Graceful error handling with recovery options
- **Mobile Responsive**: Works on both desktop and mobile devices

### 🔧 Technical Implementation

#### Architecture
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Full type safety with strict configuration
- **Zustand**: Lightweight state management for game and UI state
- **Vite**: Fast development server and build tool
- **Tailwind CSS**: Utility-first CSS framework for styling

#### State Management
- **Game Store**: Manages game state, ants, players, and grid data
- **UI Store**: Handles UI state, connection status, and user interactions
- **WebSocket Service**: Singleton service for WebSocket communication

#### Performance Optimizations
- **Canvas Rendering**: Efficient canvas-based grid rendering
- **Incremental Updates**: Only renders changed grid chunks
- **Debounced Interactions**: Performance optimization for user interactions
- **Memory Management**: Proper cleanup of animation frames and event listeners

#### Error Handling
- **Validation Utilities**: Comprehensive input validation
- **Error Boundaries**: React error boundaries for component error handling
- **WebSocket Error Recovery**: Automatic reconnection and error recovery
- **User Feedback**: Clear error messages and recovery options

### ❌ Missing Features (Requirements Not Met)

#### Deployment & Production
- **Production Deployment Script**: Missing deployment automation
- **Environment Configuration**: Missing production environment setup
- **Build Optimization**: Missing production build optimizations

#### Testing
- **Unit Tests**: Missing comprehensive test suite for client components
- **Integration Tests**: Missing WebSocket integration tests
- **E2E Tests**: Missing end-to-end testing

#### Performance Monitoring
- **Performance Metrics**: Missing performance monitoring and analytics
- **Error Reporting**: Missing external error reporting service integration
- **Load Testing**: Missing client-side performance testing

#### Accessibility
- **Keyboard Navigation**: Limited keyboard accessibility
- **Screen Reader Support**: Missing ARIA labels and screen reader optimization
- **Color Contrast**: Missing accessibility color contrast validation

#### Advanced Features
- **Grid Size Configuration**: Missing client-side grid size configuration UI
- **Rule Templates**: Missing predefined rule templates
- **Game History**: Missing replay or history functionality
- **Export/Import**: Missing game state export/import functionality

---
## Technical Choices
| Topic | Decision & Rationale |
|-------|----------------------|
| **Language** | TypeScript with `strict: true` for reliability and editor tooling |
| **Frontend Framework** | React 18 with hooks for modern, performant UI development |
| **State Management** | Zustand for lightweight, simple state management without boilerplate |
| **UI Library** | shadcn/ui with Tailwind CSS for consistent, accessible components |
| **Canvas Rendering** | HTML5 Canvas for efficient grid rendering and smooth animations |
| **WebSocket Library** | Native WebSocket API with custom service layer for control |
| **Build Tool** | Vite for fast development and optimized production builds |
| **Styling** | Tailwind CSS for utility-first styling and responsive design |
| **State model** | `GameEngine` class keeps all grid data in memory for ultra-low latency; grid is a `Map` keyed by `x,y` and sharded into fixed-size chunks to minimise diff payloads |
| **Collision policy** | During a tick, ants are processed in player-join order; if two ants attempt the same cell, the first ant moves, the others stay. This keeps determinism but is biased – Randomised ordering or hashed fairness could be added as a future improvement. |
| **Colour allocation** | Random RGB excluding already-used values; guarantees uniqueness. |
| **Testing** | Jest unit tests for all game logic and WebSocket contract; CI step aborts on failure. |
| **Performance** | `permessage-deflate` is enabled in the WS handshake which cuts average snapshot payload size in local profiling and boosts ops/sec at shorter tick intervals. |

---
## Continuous Integration
This repository ships with a GitHub Actions workflow located at `.github/workflows/ci.yml` which runs on every push and pull-request to the `main` branch.

Pipeline outline
1. Checkout code
2. Enable Corepack then activate **Yarn 4.6.0** – matching the `packageManager` field
3. Spin up a Node 24.x matrix runner
4. Install dependencies with `yarn install --immutable` using the cached `api/yarn.lock`
5. Build the TypeScript sources via `yarn build:server`
6. Execute the Jest test suite with `yarn test`

All steps run from the `api` sub-directory to keep the mono-repo future-proof. The workflow fails fast on type errors or failing tests, ensuring main is always deployable.

**Note**: Client-side testing and build steps are missing from CI pipeline.

---
## Trade-offs 
* **Colour continuity:** when a player disconnects, their colour is returned to the available pool. If they reconnect they will be treated as a new player and may receive a different colour – the implementation keeps the server stateless and avoids reserving colours indefinitely.
* **Fairness:** current collision resolution favours earlier ants.
* **Performance vs Memory:** In-memory grid storage provides ultra-low latency but limits scalability for very large grids.
* **Client-side Testing:** Comprehensive testing was sacrificed for faster development and feature implementation.
* **Accessibility:** Basic accessibility features were prioritized over advanced accessibility compliance for faster development.
* **Production Deployment:** Manual deployment process was chosen over automated deployment for simplicity.

---
## Future Work
With more time, I would have liked to implement and test the following:

### Client Improvements
- **Comprehensive Testing**: Add unit tests, integration tests, and E2E tests for all client components
- **Performance Monitoring**: Add performance metrics and monitoring for canvas rendering
- **Accessibility Enhancement**: Improve keyboard navigation and screen reader support
- **Advanced UI Features**: Add rule templates, grid size configuration, and game history
- **Error Reporting**: Integrate with external error reporting service (Sentry, etc.)
- **PWA Support**: Add Progressive Web App features for offline capability

### Server Improvements
- Implement player session persistence for reconnection handling
- Offload tick processing to worker threads to maintain WebSocket event loop responsiveness for larger grids
- Partition the grid across shards and broadcast merged diffs for larger loads (e.g. 10k×10k grid with 160 players)
- Add a Redis layer plus periodic snapshots to enable restarts and historical replay
- Add a deployment script to deploy the server to a cloud provider
- Add support for other languages

### Infrastructure
- **Automated Deployment**: Add CI/CD pipeline for both client and server
- **Environment Management**: Add proper environment configuration management
- **Monitoring**: Add application performance monitoring and logging
- **Load Testing**: Add comprehensive load testing for both client and server
- **Documentation**: Add API documentation and user guides

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
cd api
yarn benchmark
```

---
## Testing
The project includes comprehensive test coverage with 51 passing tests across:
- Game engine logic and state management
- WebSocket message handling and validation
- Ant movement and collision detection
- Player management and rule validation

Run tests with:
```bash
cd api
yarn test
```

**Note**: Client-side testing is missing and should be added for comprehensive coverage.

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

### 🧪 **Testing Improvements**
- **Comprehensive Coverage**: Tests for all major functionality
- **Error Scenarios**: Tests for various error conditions
- **Performance Tests**: Benchmark script for performance testing

### 🎨 **Client Improvements**
- **Modern UI**: Complete React application with modern UI components
- **Real-time Rendering**: Canvas-based grid renderer with smooth animations
- **Rule Editor**: Interactive rule definition interface
- **WebSocket Integration**: Robust WebSocket communication with reconnection
- **State Management**: Efficient state management with Zustand
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Mobile-responsive interface with Tailwind CSS