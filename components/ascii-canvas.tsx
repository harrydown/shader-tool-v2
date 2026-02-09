"use client"

import { useRef, useEffect, useCallback } from "react"

// Character sets
export const characterSets: Record<string, string> = {
  basic: ' .:-=+*#%@',
  short: ' .:;+=xX$&#',
  medium: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  extended: ' .",:;!~+-<>i1?][}{|)(\\/_tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  classic: ' .:-=+*#%@',
  ramp: ' ._-=+*#%@',
  blocks: ' ░▒▓█',
  blocksExtended: ' ·:░▒▓█',
  braille: ' ⡀⡄⡆⡇⣇⣧⣷⣿',
  numeric: ' 1234567890',
  alphanumeric: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  binary: ' 01',
  matrix: ' .0123456789',
  retro: ' .:*oe&#%@',
  minimal: ' .-+=#',
  dots: ' .·•○●',
  lines: ' -_=≡═',
}

function brightnessToChar(brightness: number, charset: string, invert: boolean = false): string {
  const index = invert 
    ? Math.floor((1 - brightness) * (charset.length - 1))
    : Math.floor(brightness * (charset.length - 1))
  return charset[Math.max(0, Math.min(charset.length - 1, index))]
}

function calculateBrightness(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

interface ASCIICanvasProps {
  cellSize?: number
  invert?: boolean
  colorMode?: boolean
  brightness?: number
  contrast?: number
  saturation?: number
  characterSet?: number
  cellSpacing?: number
  cellDensity?: number
  randomSeed?: number
  densityMask?: "none" | "uniform" | "gradient-linear" | "gradient-radial" | "logo-mask" | "image-mask"
  densityStart?: number
  densityEnd?: number
  gradientDirection?: "up" | "down" | "left" | "right"
  gradientMidpoint?: number
  maskImageData?: ImageData | null
  maskWidth?: number
  maskHeight?: number
  maskScale?: number
  maskOffsetX?: number
  maskOffsetY?: number
  imageData: ImageData | null
  width: number
  height: number
  logicalWidth: number
  logicalHeight: number
}

export function ASCIICanvas({
  cellSize = 12,
  invert = false,
  colorMode = true,
  brightness = 0,
  contrast = 1,
  saturation = 1,
  characterSet = 0,
  cellSpacing = 0,
  cellDensity = 100,
  randomSeed = 0,
  densityMask = "none",
  densityStart = 0,
  densityEnd = 100,
  gradientDirection = "up",
  gradientMidpoint = 0.5,
  maskImageData = null,
  maskWidth = 0,
  maskHeight = 0,
  maskScale = 1.0,
  maskOffsetX = 0.0,
  maskOffsetY = 0.0,
  imageData,
  width,
  height,
  logicalWidth,
  logicalHeight,
}: ASCIICanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const debuggedRef = useRef(false)
  const paramsRef = useRef({ cellSize, invert, colorMode, brightness, contrast, saturation, characterSet })

  // Update params ref when props change
  useEffect(() => {
    paramsRef.current = { 
      cellSize, invert, colorMode, brightness, contrast, saturation, characterSet, cellSpacing, 
      cellDensity, randomSeed, densityMask, densityStart, densityEnd, gradientDirection, gradientMidpoint,
      maskImageData, maskWidth, maskHeight, maskScale, maskOffsetX, maskOffsetY
    }
  }, [cellSize, invert, colorMode, brightness, contrast, saturation, characterSet, cellSpacing, cellDensity, randomSeed, densityMask, densityStart, densityEnd, gradientDirection, gradientMidpoint, maskImageData, maskWidth, maskHeight, maskScale, maskOffsetX, maskOffsetY])

  // Rendering function that can be called directly
  const renderASCII = useCallback((canvas: HTMLCanvasElement, imgData: ImageData, imgWidth: number, imgHeight: number, logicalW: number, logicalH: number, needsFlip: boolean = false) => {
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    const params = paramsRef.current

    // Calculate grid dimensions using LOGICAL dimensions with cell spacing
    const effectiveCellSize = params.cellSize * (1 + params.cellSpacing)
    const charWidth = effectiveCellSize
    const charHeight = effectiveCellSize
    const cols = Math.floor(logicalW / charWidth)
    const rows = Math.floor(logicalH / charHeight)

    // Clear canvas and reset transforms
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Fill with black background to hide 3D object
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set font - scale to fit within cell and account for DPI
    const scale = imgWidth / logicalW
    const fontSize = Math.floor(params.cellSize * 0.8 * scale)
    ctx.font = `${fontSize}px monospace`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'

    // Get character set
    const charsetKeys = ['basic', 'short', 'medium', 'extended', 'classic', 'ramp', 'blocks', 'blocksExtended', 'braille', 'numeric', 'alphanumeric', 'binary', 'matrix', 'retro', 'minimal', 'dots', 'lines']
    const charsetName = charsetKeys[params.characterSet] || 'basic'
    const charset = characterSets[charsetName]

    // Seeded random for density
    const seededRandom = (x: number, y: number, seed: number) => {
      const hash = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453
      return hash - Math.floor(hash)
    }

    // Sample and render ASCII
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Calculate sample position in physical pixels
        const sampleX = Math.floor((x + 0.5) * charWidth * (imgWidth / logicalW))
        let sampleY = Math.floor((y + 0.5) * charHeight * (imgHeight / logicalH))
        
        // Flip Y coordinate if needed (WebGL reads bottom-up)
        if (needsFlip) {
          sampleY = imgHeight - sampleY - 1
        }
        
        if (sampleX >= imgWidth || sampleY >= imgHeight || sampleY < 0) continue

        // Get pixel color from imageData
        const idx = (sampleY * imgWidth + sampleX) * 4
        let r = imgData.data[idx]
        let g = imgData.data[idx + 1]
        let b = imgData.data[idx + 2]
        const a = imgData.data[idx + 3]

        // Skip transparent pixels
        if (a < 10) continue

        // Apply density filter based on mask type
        let densityThreshold = 1.0 // Default: show all characters
        
        if (params.densityMask === "uniform") {
          densityThreshold = params.cellDensity / 100
        } else if (params.densityMask === "gradient-linear") {
          // Calculate position along gradient direction (0 to 1)
          let gradientPos = 0
          if (params.gradientDirection === "up") {
            gradientPos = 1 - (y / rows)
          } else if (params.gradientDirection === "down") {
            gradientPos = y / rows
          } else if (params.gradientDirection === "left") {
            gradientPos = 1 - (x / cols)
          } else if (params.gradientDirection === "right") {
            gradientPos = x / cols
          }
          
          // Apply midpoint adjustment
          if (gradientPos < params.gradientMidpoint) {
            gradientPos = (gradientPos / params.gradientMidpoint) * 0.5
          } else {
            gradientPos = ((gradientPos - params.gradientMidpoint) / (1 - params.gradientMidpoint)) * 0.5 + 0.5
          }
          
          // Interpolate between densityStart and densityEnd
          const density = params.densityStart + gradientPos * (params.densityEnd - params.densityStart)
          densityThreshold = density / 100
        } else if (params.densityMask === "gradient-radial") {
          // Calculate distance from center (0 at center, 1 at edge)
          const centerX = cols / 2
          const centerY = rows / 2
          const dx = (x - centerX) / centerX
          const dy = (y - centerY) / centerY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const gradientPos = Math.min(1, dist)
          
          // Interpolate between densityStart and densityEnd
          const density = params.densityStart + gradientPos * (params.densityEnd - params.densityStart)
          densityThreshold = density / 100
        } else if ((params.densityMask === "logo-mask" || params.densityMask === "image-mask") && params.maskImageData && params.maskWidth > 0 && params.maskHeight > 0) {
          // Sample mask texture with aspect correction
          // Normalize coordinates to 0-1
          const uvX = x / cols
          const uvY = y / rows
          
          // Center UV coordinates (-0.5 to 0.5)
          let centeredX = uvX - 0.5
          let centeredY = uvY - 0.5
          
          // Calculate aspect ratios
          const logoAspect = params.maskWidth / params.maskHeight
          const viewportAspect = logicalW / logicalH
          
          // Correct aspect ratio to prevent stretching
          const aspectRatio = viewportAspect / logoAspect
          centeredX *= aspectRatio
          
          // Apply position offset (invert X for intuitive direction, matching Cell shader)
          centeredX -= params.maskOffsetX
          centeredY += params.maskOffsetY
          
          // Apply scale and convert back to 0-1
          const maskUVX = centeredX / params.maskScale + 0.5
          const maskUVY = centeredY / params.maskScale + 0.5
          
          // Sample mask if in bounds
          if (maskUVX >= 0 && maskUVX <= 1 && maskUVY >= 0 && maskUVY <= 1) {
            const maskX = Math.floor(maskUVX * params.maskWidth)
            const maskY = Math.floor(maskUVY * params.maskHeight)
            const maskIdx = (maskY * params.maskWidth + maskX) * 4
            
            if (maskIdx >= 0 && maskIdx < params.maskImageData.data.length) {
              // Use alpha channel like Cell shader
              const maskValue = params.maskImageData.data[maskIdx + 3] / 255
              const density = params.densityStart + maskValue * (params.densityEnd - params.densityStart)
              densityThreshold = density / 100
            }
          } else {
            // Outside mask bounds - use densityStart
            densityThreshold = params.densityStart / 100
          }
        }
        
        // Apply random skip based on threshold
        if (densityThreshold < 1.0) {
          const rand = seededRandom(x, y, params.randomSeed)
          if (rand > densityThreshold) continue
        }

        // Apply saturation
        if (params.saturation !== 1) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b
          r = clamp(gray + params.saturation * (r - gray), 0, 255)
          g = clamp(gray + params.saturation * (g - gray), 0, 255)
          b = clamp(gray + params.saturation * (b - gray), 0, 255)
        }

        // Apply brightness
        if (params.brightness !== 0) {
          r = clamp(r + params.brightness * 255, 0, 255)
          g = clamp(g + params.brightness * 255, 0, 255)
          b = clamp(b + params.brightness * 255, 0, 255)
        }

        // Calculate luminance
        let lum = calculateBrightness(r, g, b)

        // Apply contrast
        lum = clamp((lum - 0.5) * params.contrast + 0.5, 0, 1)

        // Map brightness to character
        const char = brightnessToChar(lum, charset, params.invert)

        // Set color
        if (params.colorMode) {
          ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
        } else {
          const grayVal = Math.round(lum * 255)
          ctx.fillStyle = `rgb(${grayVal}, ${grayVal}, ${grayVal})`
        }

        // Draw character at physical pixel position
        const scale = imgWidth / logicalW
        const px = x * charWidth * scale
        const py = y * charHeight * scale
        ctx.fillText(char, px, py)
      }
    }
  }, [])

  // Expose render function globally for direct access
  useEffect(() => {
    if (canvasRef.current) {
      (window as any).__renderASCII = (imgData: ImageData, imgWidth: number, imgHeight: number, logicalW: number, logicalH: number, needsFlip: boolean = false) => {
        if (canvasRef.current) {
          renderASCII(canvasRef.current, imgData, imgWidth, imgHeight, logicalW, logicalH, needsFlip)
        }
      }
    }
  }, [renderASCII])

  // Simple fallback useEffect (not really needed since we use direct rendering)
  useEffect(() => {
    // Canvas is set up and ready
  }, [imageData, width, height, logicalWidth, logicalHeight])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${logicalWidth}px`,
        height: `${logicalHeight}px`,
        pointerEvents: 'none',
        zIndex: 10,
      }}
      width={width}
      height={height}
    />
  )
}
