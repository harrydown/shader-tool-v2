"use client"

import { useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"

interface ASCIIRendererInnerProps {
  onRenderData?: (data: ImageData, width: number, height: number) => void
}

// This component runs inside Canvas and captures WebGL data every frame
export function ASCIIRendererInner({ onRenderData }: ASCIIRendererInnerProps) {
  const { gl, size } = useThree()
  const frameCountRef = useRef(0)
  const lastSizeRef = useRef({ width: 0, height: 0 })

  useFrame(() => {
    // Throttle: render every 3rd frame for performance (20fps)
    frameCountRef.current++
    if (frameCountRef.current % 3 !== 0) return
    if (!onRenderData) return

    // Get the WebGL context from the renderer
    const glContext = gl.getContext()

    // Account for device pixel ratio
    const pixelRatio = gl.getPixelRatio()
    const actualWidth = Math.floor(size.width * pixelRatio)
    const actualHeight = Math.floor(size.height * pixelRatio)

    // Read pixels from WebGL canvas
    const pixels = new Uint8Array(actualWidth * actualHeight * 4)
    glContext.readPixels(0, 0, actualWidth, actualHeight, glContext.RGBA, glContext.UNSIGNED_BYTE, pixels)

    // Create ImageData
    const imageData = new ImageData(new Uint8ClampedArray(pixels.buffer), actualWidth, actualHeight)
    
    // Render directly to canvas - no React state updates
    if ((window as any).__renderASCII) {
      (window as any).__renderASCII(imageData, actualWidth, actualHeight, size.width, size.height, true)
    }
    
    // Only call callback on size changes to update canvas dimensions
    if (lastSizeRef.current.width !== actualWidth || lastSizeRef.current.height !== actualHeight) {
      lastSizeRef.current = { width: actualWidth, height: actualHeight }
      onRenderData(imageData, actualWidth, actualHeight)
    }
  })

  // This component doesn't render anything in the 3D scene
  return null
}
