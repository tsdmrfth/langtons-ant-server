import { useRef, useCallback } from 'react'
import { LERP_FACTOR, SCALE_THRESHOLD, OFFSET_THRESHOLD } from '@/config/constants'

interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
}

export const useCanvasAnimation = () => {
  const view = useRef<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  })

  const targetView = useRef<ViewState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  })

  const animationFrameId = useRef<number | null>(null)

  const startAnimation = useCallback(() => {
    if (animationFrameId.current) {
      return
    }

    animationFrameId.current = requestAnimationFrame(animate)
  }, [])

  const stopAnimation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
  }, [])

  const animate = useCallback(() => {
    const { scale, offsetX, offsetY } = view.current
    const { scale: targetScale, offsetX: targetOffsetX, offsetY: targetOffsetY } = targetView.current
    const scaleDiff = targetScale - scale
    const offsetXDiff = targetOffsetX - offsetX
    const offsetYDiff = targetOffsetY - offsetY

    if (Math.abs(scaleDiff) < SCALE_THRESHOLD && Math.abs(offsetXDiff) < OFFSET_THRESHOLD && Math.abs(offsetYDiff) < OFFSET_THRESHOLD) {
      view.current = { scale: targetScale, offsetX: targetOffsetX, offsetY: targetOffsetY }
      stopAnimation()
      return
    }

    view.current = {
      scale: scale + scaleDiff * LERP_FACTOR,
      offsetX: offsetX + offsetXDiff * LERP_FACTOR,
      offsetY: offsetY + offsetYDiff * LERP_FACTOR,
    }

    animationFrameId.current = requestAnimationFrame(animate)
  }, [stopAnimation])

  const setTargetView = useCallback((newTarget: Partial<ViewState>) => {
    targetView.current = { ...targetView.current, ...newTarget }
    startAnimation()
  }, [startAnimation])

  const getCurrentView = useCallback(() => view.current, [])
  const getTargetView = useCallback(() => targetView.current, [])

  return {
    view: view.current,
    targetView: targetView.current,
    startAnimation,
    stopAnimation,
    setTargetView,
    getCurrentView,
    getTargetView,
  }
} 