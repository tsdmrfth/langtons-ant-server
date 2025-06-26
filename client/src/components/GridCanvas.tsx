import { useToast } from '@/hooks/use-toast'
import { useGameStore } from '@/stores/gameStore'
import { useUIStore } from '@/stores/uiStore'
import { Crosshair, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ReactZoomPanPinchRef, TransformComponent, TransformWrapper, useControls } from "react-zoom-pan-pinch"

const SPACING = 100
const GRID_LINE_WIDTH = 1

export const GridCanvas = () => {
  const grid = useGameStore(state => state.grid)
  const newCells = useGameStore(state => state.newCells)
  const allCells = useGameStore(state => state.grid.cells)
  const historicalCells = useGameStore(state => state.historicalCells)
  const ants = useGameStore(state => state.ants)
  const gameActions = useGameStore(state => state.actions)
  const placeAnt = useGameStore(state => state.actions.placeAnt)
  const flipTile = useGameStore(state => state.actions.flipTile)
  const isPlacingAnt = useUIStore(state => state.isPlacingAnt)
  const isFlippingTile = useUIStore(state => state.isFlippingTile)
  const { toast } = useToast()
  const gridCanvasRef = useRef<HTMLCanvasElement>(null)
  const cellsCanvasRef = useRef<HTMLCanvasElement>(null)
  const antsCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const transformWrapperRef = useRef<ReactZoomPanPinchRef>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const transformScale = useRef(1)
  const [isPanning, setIsPanning] = useState(false)
  const didRenderHistoricalCells = useRef(false)
  const { canvasSize, canvasTop, canvasLeft } = useMemo(() => {
    const { width, height } = containerSize

    if (width === 0 || height === 0) {
      return { canvasSize: 0, canvasTop: 0, canvasLeft: 0 }
    }

    const size = Math.min(width, height) - SPACING
    return {
      canvasSize: size,
      canvasTop: (height - size) / 2,
      canvasLeft: (width - size) / 2
    }
  }, [containerSize])
  const cellSize = useMemo(() => {
    if (canvasSize === 0 || grid.width === 0 || grid.height === 0) {
      return 0
    }
    return canvasSize / Math.max(grid.width, grid.height)
  }, [canvasSize, grid.width, grid.height])
  const prevCanvasSize = useRef(canvasSize)
  const prevCellSize = useRef(cellSize)
  console.log(Object.keys(allCells).length, 'allCells')

  const drawGrid = useCallback(() => {
    const context = gridCanvasRef.current?.getContext('2d', { alpha: false })

    if (!context || !gridCanvasRef.current || canvasSize === 0) {
      return
    }

    const canvas = gridCanvasRef.current
    canvas.width = canvasSize
    canvas.height = canvasSize
    const gridWidth = grid.width * cellSize
    const gridHeight = grid.height * cellSize
    const offsetX = (canvasSize - gridWidth) / 2
    const offsetY = (canvasSize - gridHeight) / 2
    context.fillStyle = '#FFFFFF'
    context.fillRect(0, 0, canvasSize, canvasSize)
    context.strokeStyle = '#CCCCCC'
    context.lineWidth = GRID_LINE_WIDTH

    for (let i = 0; i <= grid.width; i++) {
      const x = offsetX + i * cellSize
      context.beginPath()
      context.moveTo(x, offsetY)
      context.lineTo(x + GRID_LINE_WIDTH, offsetY + gridHeight)
      context.stroke()
    }

    for (let j = 0; j <= grid.height; j++) {
      const y = offsetY + j * cellSize
      context.beginPath()
      context.moveTo(offsetX, y)
      context.lineTo(offsetX + gridWidth, y + GRID_LINE_WIDTH)
      context.stroke()
    }
  }, [grid.width, grid.height, cellSize, canvasSize])

  const drawCellsOnCanvas = useCallback((canvasRefence: HTMLCanvasElement, cells: Record<string, string>) => {
    const context = canvasRefence.getContext('2d', { alpha: false })

    if (!context || canvasSize === 0) {
      return
    }

    const canvas = canvasRefence
    const configChanged = canvasSize !== prevCanvasSize.current || cellSize !== prevCellSize.current

    if (configChanged) {
      canvas.width = canvasSize
      canvas.height = canvasSize
    }

    const gridWidth = grid.width * cellSize
    const gridHeight = grid.height * cellSize
    const offsetX = (canvasSize - gridWidth) / 2
    const offsetY = (canvasSize - gridHeight) / 2
    Object.entries(cells).forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number)

      if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
        context.fillStyle = color
        context.clearRect(
          offsetX + (x * cellSize),
          offsetY + (y * cellSize),
          cellSize,
          cellSize
        )
        context.fillRect(
          offsetX + GRID_LINE_WIDTH + (x * cellSize),
          offsetY + GRID_LINE_WIDTH + (y * cellSize),
          cellSize - 2 * GRID_LINE_WIDTH,
          cellSize - 2 * GRID_LINE_WIDTH
        )
      }
    })
  }, [canvasSize, grid.width, grid.height, cellSize])

  const drawCells = useCallback(async () => {
    const context = cellsCanvasRef.current?.getContext('2d', { alpha: false })

    if (!context || !cellsCanvasRef.current || canvasSize === 0) {
      return
    }

    const canvas = cellsCanvasRef.current
    const configChanged = canvasSize !== prevCanvasSize.current || cellSize !== prevCellSize.current
    let cellsToDraw = configChanged ? allCells : newCells

    if (configChanged) {
      canvas.width = canvasSize
      canvas.height = canvasSize
      didRenderHistoricalCells.current = false
    }

    if (historicalCells && !didRenderHistoricalCells.current) {
      didRenderHistoricalCells.current = true
      cellsToDraw = { ...historicalCells, ...cellsToDraw }
    }

    drawCellsOnCanvas(canvas, cellsToDraw)
  }, [allCells, newCells, historicalCells, canvasSize, cellSize, drawCellsOnCanvas])

  const drawAnts = useCallback(() => {
    const context = antsCanvasRef.current?.getContext('2d', { alpha: false })

    if (!context || !antsCanvasRef.current || canvasSize === 0) {
      return
    }

    const canvas = antsCanvasRef.current

    if (canvas.width !== canvasSize) {
      canvas.width = canvasSize
    }

    if (canvas.height !== canvasSize) {
      canvas.height = canvasSize
    }

    context.clearRect(0, 0, canvas.width, canvas.height)
    const gridWidth = grid.width * cellSize
    const gridHeight = grid.height * cellSize
    const offsetX = (canvasSize - gridWidth) / 2
    const offsetY = (canvasSize - gridHeight) / 2
    ants.forEach(ant => {
      const x = offsetX + ant.position.x * cellSize + cellSize / 2
      const y = offsetY + ant.position.y * cellSize + cellSize / 2
      const radius = cellSize / 4
      context.fillStyle = ant.color
      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI)
      context.fill()
      context.strokeStyle = '#000000'
      context.lineWidth = 2
      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI)
      context.stroke()
      const directionAngle = {
        UP: -Math.PI / 2,
        RIGHT: 0,
        DOWN: Math.PI / 2,
        LEFT: Math.PI
      }[ant.direction]
      const arrowLength = radius * 0.6
      const arrowX = x + Math.cos(directionAngle) * arrowLength
      const arrowY = y + Math.sin(directionAngle) * arrowLength
      context.strokeStyle = '#000000'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(arrowX, arrowY)
      context.stroke()
    })
  }, [grid.width, grid.height, ants, cellSize, canvasSize])

  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if ((!isPlacingAnt && !isFlippingTile) || !gridCanvasRef.current || canvasSize === 0 || isPanning) return

    const canvas = gridCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clickX = (event.clientX - rect.left) / transformScale.current
    const clickY = (event.clientY - rect.top) / transformScale.current
    const gridWidth = grid.width * cellSize
    const gridHeight = grid.height * cellSize
    const offsetX = (canvasSize - gridWidth) / 2
    const offsetY = (canvasSize - gridHeight) / 2
    const gridX = Math.floor((clickX - offsetX) / cellSize)
    const gridY = Math.floor((clickY - offsetY) / cellSize)

    if (gridX < 0 || gridX >= grid.width || gridY < 0 || gridY >= grid.height) {
      toast({
        title: 'Invalid Position',
        description: 'Click position is outside the grid boundaries',
        variant: 'destructive'
      })
      return
    }

    if (isPlacingAnt) {
      placeAnt({ x: gridX, y: gridY })
    } else if (isFlippingTile) {
      flipTile({ x: gridX, y: gridY })
    }
  }, [isPlacingAnt, isFlippingTile, grid.width, grid.height, placeAnt, flipTile, toast, cellSize, canvasSize, isPanning])

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) {
        return
      }

      const { width, height } = entries[0].contentRect
      setContainerSize({ width, height })
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    drawGrid()
  }, [drawGrid])

  useEffect(() => {
    drawCells()
    drawAnts()
    prevCanvasSize.current = canvasSize
    prevCellSize.current = cellSize
  }, [drawCells, drawAnts, canvasSize, cellSize, historicalCells, gameActions])

  if (!grid.width || !grid.height) {
    return null
  }

  return (
    <TransformWrapper
      smooth={true}
      maxScale={10}
      minScale={0.5}
      initialScale={1}
      initialPositionX={0}
      initialPositionY={0}
      ref={transformWrapperRef}
      onPanningStart={(_, event) => {
        if (event.detail > 0) {
          return
        }
        setIsPanning(true)
      }}
      onPanningStop={() => setTimeout(() => setIsPanning(false), 500)}
      onTransformed={(_, state) => transformScale.current = state.scale}>
      <TransformComponent
        wrapperClass='w-full h-full' contentClass='w-full h-full p-6 md:p-8 relative'>
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%' }}
          className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative">
          <canvas
            className="z-10"
            ref={gridCanvasRef}
            style={{
              position: 'absolute',
              top: canvasTop,
              left: canvasLeft,
              width: canvasSize,
              height: canvasSize
            }} />
          <canvas
            className="z-20"
            ref={cellsCanvasRef}
            style={{
              position: 'absolute',
              top: canvasTop,
              left: canvasLeft,
              width: canvasSize,
              height: canvasSize
            }} />
          <canvas
            className="z-30"
            ref={antsCanvasRef}
            onClick={handleCanvasClick}
            style={{
              position: 'absolute',
              top: canvasTop,
              left: canvasLeft,
              width: canvasSize,
              height: canvasSize
            }} />
        </div>
      </TransformComponent>
      <ZoomControls />
    </TransformWrapper>
  )
}

const ZoomControls = () => {
  const { zoomIn, zoomOut, centerView } = useControls()

  return (
    <div className="absolute top-6 right-6 z-50 flex flex-col gap-2 bg-gray-800 bg-opacity-90 rounded-lg shadow-lg p-2">
      <button
        onClick={() => zoomIn()}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 hover:bg-yellow-600 text-white transition-colors focus:outline-none">
        <Plus size={20} />
      </button>
      <button
        onClick={() => zoomOut()}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 hover:bg-yellow-600 text-white transition-colors focus:outline-none">
        <Minus size={20} />
      </button>
      <button
        onClick={() => centerView()}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-600 hover:bg-yellow-600 text-white transition-colors focus:outline-none">
        <Crosshair size={20} />
      </button>
    </div>
  )
}