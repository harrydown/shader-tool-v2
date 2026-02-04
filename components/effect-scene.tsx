"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { EffectComposer } from "@react-three/postprocessing"
import { OrbitControls } from "@react-three/drei"
import { Vector2, TextureLoader } from "three"
import * as THREE from "three"
import { AsciiEffect } from "./ascii-effect"

function RotatingMesh() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef} scale={1}>
      <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />
      <meshStandardMaterial color="#917aff" roughness={0.3} metalness={0.1} />
    </mesh>
  )
}

function ImagePlane({ imageUrl, dimensions }: { imageUrl: string | null; dimensions: { width: number; height: number } | null }) {
  const texture = imageUrl ? useLoader(TextureLoader, imageUrl) : null

  if (!imageUrl || !texture || !dimensions) return null

  // Use image dimensions divided by 1000 for plane size
  const planeWidth = dimensions.width / 1000
  const planeHeight = dimensions.height / 1000

  return (
    <mesh>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial map={texture} transparent={true} alphaTest={0.01} />
    </mesh>
  )
}

export function EffectScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState(new Vector2(0, 0))
  const [resolution, setResolution] = useState(new Vector2(1920, 1080))
  const [style, setStyle] = useState<"standard" | "dense" | "minimal" | "blocks" | "standard-dots" | "melding-dots" | "ascii-characters-minimal" | "ascii-characters-normal">("standard")
  const [cellSize, setCellSize] = useState(16)
  const [colorMode, setColorMode] = useState(true)
  const [invert, setInvert] = useState(false)
  const [blur, setBlur] = useState(1.0)
  const [minSize, setMinSize] = useState(0.2)
  const [maxSize, setMaxSize] = useState(1.8)
  const [backgroundColor, setBackgroundColor] = useState("#5c5c5c")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showImage, setShowImage] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = rect.height - (e.clientY - rect.top)
        setMousePos(new Vector2(x, y))
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("mousemove", handleMouseMove)

      const rect = container.getBoundingClientRect()
      setResolution(new Vector2(rect.width, rect.height))

      const handleResize = () => {
        const rect = container.getBoundingClientRect()
        setResolution(new Vector2(rect.width, rect.height))
      }
      window.addEventListener("resize", handleResize)

      return () => {
        container.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("resize", handleResize)
      }
    }
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        setOriginalImageSize({ width: img.width, height: img.height })
      }
      img.src = url
      setImageUrl(url)
      setShowImage(true)
    }
  }

  const clearImage = () => {
    setOriginalImageSize(null)
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
    setImageUrl(null)
    setShowImage(false)
  }

  const captureScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) {
      // Regular canvas capture at viewport size
      requestAnimationFrame(() => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ascii-art-viewport-${Date.now()}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
        }, 'image/png')
      })
    }
  }

  const captureAtImageSize = () => {
    if (!originalImageSize) return
    
    const sourceCanvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (!sourceCanvas) return
    
    // Wait for next frame to ensure canvas is rendered
    requestAnimationFrame(() => {
      // Create temporary canvas at original image dimensions
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = originalImageSize.width
      tempCanvas.height = originalImageSize.height
      const ctx = tempCanvas.getContext('2d')
      
      if (!ctx) return
      
      // Scale and draw the source canvas to match original image dimensions
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(sourceCanvas, 0, 0, originalImageSize.width, originalImageSize.height)
      
      // Download the image
      tempCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `ascii-art-${originalImageSize.width}x${originalImageSize.height}-${Date.now()}.png`
          a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    })
  }

  const startRecording = () => {
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (!canvas) return

    const stream = canvas.captureStream(30) // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000
    })

    recordedChunksRef.current = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ascii-art-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    }

    mediaRecorder.start()
    mediaRecorderRef.current = mediaRecorder
    setIsRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
    }
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Control Panel */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        background: "rgba(0, 0, 0, 0.8)",
        padding: "20px",
        borderRadius: "8px",
        color: "white",
        fontFamily: "monospace",
        fontSize: "14px",
        zIndex: 1000,
        minWidth: "200px"
      }}>
        <h3 style={{ margin: "0 0 15px 0", fontSize: "16px" }}>ASCII Controls</h3>
        
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>Style</label>
          <select 
            value={style} 
            onChange={(e) => setStyle(e.target.value as any)}
            style={{
              width: "100%",
              padding: "5px",
              background: "#333",
              color: "white",
              border: "1px solid #555",
              borderRadius: "4px"
            }}
          >
            <option value="standard">Standard</option>
            <option value="dense">Dense</option>
            <option value="minimal">Minimal</option>
            <option value="blocks">Blocks</option>
            <option value="standard-dots">Standard - Dots</option>
            <option value="melding-dots">Melding Dots</option>
            <option value="ascii-characters-minimal">ASCII Characters minimal</option>
            <option value="ascii-characters-normal">ASCII Characters normal</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Cell Size: {cellSize}px
          </label>
          <input 
            type="range" 
            min="4" 
            max="32" 
            value={cellSize}
            onChange={(e) => setCellSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Blur: {blur.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0.5" 
            max="3" 
            step="0.1"
            value={blur}
            onChange={(e) => setBlur(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Min Size: {minSize.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.1"
            value={minSize}
            onChange={(e) => setMinSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Max Size: {maxSize.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="1.0" 
            max="3.0" 
            step="0.1"
            value={maxSize}
            onChange={(e) => setMaxSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Background Color
          </label>
          <input 
            type="color" 
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            style={{ 
              width: "100%",
              height: "30px",
              cursor: "pointer",
              border: "1px solid #555",
              borderRadius: "4px"
            }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={colorMode}
              onChange={(e) => setColorMode(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Color Mode
          </label>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Invert
          </label>
        </div>

        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #555" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
            Export
          </label>
          <button
            onClick={captureScreenshot}
            style={{
              width: "100%",
              padding: "8px",
              background: "#4a9eff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              marginBottom: "8px"
            }}
          >
            📷 Capture Image
          </button>
          {showImage && originalImageSize && (
            <button
              onClick={captureAtImageSize}
              style={{
                width: "100%",
                padding: "8px",
                background: "#6ac",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                marginBottom: "8px"
              }}
            >
              📐 Capture at Original Size ({originalImageSize.width}×{originalImageSize.height})
            </button>
          )}
          {!isRecording ? (
            <button
              onClick={startRecording}
              style={{
                width: "100%",
                padding: "8px",
                background: "#ff4a4a",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px"
              }}
            >
              🔴 Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{
                width: "100%",
                padding: "8px",
                background: "#ff9900",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                animation: "pulse 1s infinite"
              }}
            >
              ⏹️ Stop Recording
            </button>
          )}
        </div>

        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #555" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold" }}>
            Image Upload
          </label>
          <input 
            type="file" 
            accept="image/*"
            onChange={handleImageUpload}
            style={{
              width: "100%",
              padding: "5px",
              background: "#333",
              color: "white",
              border: "1px solid #555",
              borderRadius: "4px",
              fontSize: "12px",
              marginBottom: "10px"
            }}
          />
          {imageUrl && (
            <div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={showImage}
                  onChange={(e) => setShowImage(e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                Show Image
              </label>
              <button
                onClick={clearImage}
                style={{
                  width: "100%",
                  padding: "5px",
                  background: "#c44",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}
              >
                Clear Image
              </button>
            </div>
          )}
        </div>
      </div>

      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: backgroundColor }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={[backgroundColor]} />

        {/* Lighting */}
        <hemisphereLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <directionalLight position={[-5, 3, -5]} intensity={1.2} />

        {/* 3D Model */}
        {!showImage && <RotatingMesh />}
        {showImage && <ImagePlane imageUrl={imageUrl} dimensions={originalImageSize} />}

        <OrbitControls enableDamping enableZoom={true} />

        {/* ASCII Effect with PostFX */}
        <EffectComposer>
          <AsciiEffect
            style={style}
            cellSize={cellSize}
            invert={invert}
            color={colorMode}
            blur={blur}
            minSize={minSize}
            maxSize={maxSize}
            resolution={resolution}
            mousePos={mousePos}
            postfx={{
              scanlineIntensity: 0,
              scanlineCount: 200,
              targetFPS: 0,
              jitterIntensity: 0,
              jitterSpeed: 1,
              mouseGlowEnabled: false,
              mouseGlowRadius: 200,
              mouseGlowIntensity: 1.5,
              vignetteIntensity: 0,
              vignetteRadius: 0.8,
              colorPalette: "original",
              curvature: 0,
              aberrationStrength: 0,
              noiseIntensity: 0,
              noiseScale: 1,
              noiseSpeed: 1,
              waveAmplitude: 0,
              waveFrequency: 10,
              waveSpeed: 1,
              glitchIntensity: 0,
              glitchFrequency: 0,
              brightnessAdjust: 0,
              contrastAdjust: 1,
            }}
          />
        </EffectComposer>
      </Canvas>

      {/* Dimensions Display */}
      {(showImage || true) && (
        <div style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          background: "rgba(0, 0, 0, 0.8)",
          padding: "12px 16px",
          borderRadius: "8px",
          color: "white",
          fontFamily: "monospace",
          fontSize: "12px",
          zIndex: 1000,
          minWidth: "220px"
        }}>
          <div style={{ marginBottom: "8px", fontWeight: "bold", borderBottom: "1px solid #555", paddingBottom: "4px" }}>
            Dimensions
          </div>
          {originalImageSize && showImage && (
            <>
              <div style={{ marginBottom: "4px", color: "#88ff88" }}>
                <strong>Original Image:</strong><br/>
                {originalImageSize.width} × {originalImageSize.height} px
              </div>
              <div style={{ marginBottom: "4px", color: "#ffaa88" }}>
                <strong>3D Plane Size:</strong><br/>
                {(originalImageSize.width / 1000).toFixed(2)} × {(originalImageSize.height / 1000).toFixed(2)} units
              </div>
            </>
          )}
          <div style={{ color: "#88aaff" }}>
            <strong>Canvas/Viewport:</strong><br/>
            {Math.round(resolution.x)} × {Math.round(resolution.y)} px
          </div>
          <div style={{ marginTop: "8px", fontSize: "10px", opacity: 0.7, borderTop: "1px solid #555", paddingTop: "4px" }}>
            Aspect Ratio: {(resolution.x / resolution.y).toFixed(2)}
            {originalImageSize && showImage && (
              <> | Image: {(originalImageSize.width / originalImageSize.height).toFixed(2)}</>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
