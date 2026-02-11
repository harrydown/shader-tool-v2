"use client"

import { useState, useEffect, useRef } from "react"
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber"
import { EffectComposer } from "@react-three/postprocessing"
import { OrbitControls, useGLTF } from "@react-three/drei"
import { Vector2, TextureLoader, Box3, Vector3 } from "three"
import * as THREE from "three"
import { AsciiEffect } from "./ascii-effect"
import { ASCIIRendererInner } from "./ascii-renderer-inner"
import { ASCIICanvas } from "./ascii-canvas"
import { getDefaultAsset } from "./3d-assets"

function RotatingMesh({ onBoundsUpdate }: { onBoundsUpdate?: (bounds: { x: number; y: number; width: number; height: number }) => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera, size, gl } = useThree()
  const asset = getDefaultAsset()

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * asset.rotation.x
      meshRef.current.rotation.y += delta * asset.rotation.y

      // Calculate screen bounds
      if (onBoundsUpdate) {
        const box = new Box3().setFromObject(meshRef.current)
        const min = new Vector3()
        const max = new Vector3()
        box.getCenter(min)
        box.getSize(max)
        
        // Project to screen coordinates
        const minScreen = min.clone().sub(max.clone().multiplyScalar(0.5)).project(camera)
        const maxScreen = min.clone().add(max.clone().multiplyScalar(0.5)).project(camera)
        
        const x = (minScreen.x * 0.5 + 0.5) * size.width
        const y = (1 - (maxScreen.y * 0.5 + 0.5)) * size.height
        const width = (maxScreen.x - minScreen.x) * 0.5 * size.width
        const height = (maxScreen.y - minScreen.y) * 0.5 * size.height
        
        onBoundsUpdate({ x, y, width, height })
      }
    }
  })

  return (
    <mesh ref={meshRef} scale={asset.scale}>
      <torusKnotGeometry args={asset.args as [number, number, number, number]} />
      <meshStandardMaterial 
        color={asset.color} 
        roughness={asset.material.roughness} 
        metalness={asset.material.metalness} 
      />
    </mesh>
  )
}

function ImagePlane({ imageUrl, dimensions, onBoundsUpdate }: { imageUrl: string | null; dimensions: { width: number; height: number } | null; onBoundsUpdate?: (bounds: { x: number; y: number; width: number; height: number }) => void }) {
  const texture = imageUrl ? useLoader(TextureLoader, imageUrl) : null
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera, size } = useThree()

  useFrame(() => {
    if (meshRef.current && onBoundsUpdate) {
      const box = new Box3().setFromObject(meshRef.current)
      const min = new Vector3()
      const max = new Vector3()
      box.getCenter(min)
      box.getSize(max)
      
      // Project to screen coordinates
      const minScreen = min.clone().sub(max.clone().multiplyScalar(0.5)).project(camera)
      const maxScreen = min.clone().add(max.clone().multiplyScalar(0.5)).project(camera)
      
      const x = (minScreen.x * 0.5 + 0.5) * size.width
      const y = (1 - (maxScreen.y * 0.5 + 0.5)) * size.height
      const width = (maxScreen.x - minScreen.x) * 0.5 * size.width
      const height = (maxScreen.y - minScreen.y) * 0.5 * size.height
      
      onBoundsUpdate({ x, y, width, height })
    }
  })

  if (!imageUrl || !texture || !dimensions) return null

  // Use image dimensions divided by 1000 for plane size
  const planeWidth = dimensions.width / 1000
  const planeHeight = dimensions.height / 1000

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial map={texture} transparent={true} alphaTest={0.01} />
    </mesh>
  )
}

function ModelViewer({ modelUrl, onBoundsUpdate }: { modelUrl: string | null; onBoundsUpdate?: (bounds: { x: number; y: number; width: number; height: number }) => void }) {
  const meshRef = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const gltf = modelUrl ? useGLTF(modelUrl) : null

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotate the model
      meshRef.current.rotation.y += delta * 0.5

      // Calculate screen bounds
      if (onBoundsUpdate) {
        const box = new Box3().setFromObject(meshRef.current)
        const min = new Vector3()
        const max = new Vector3()
        box.getCenter(min)
        box.getSize(max)
        
        // Project to screen coordinates
        const minScreen = min.clone().sub(max.clone().multiplyScalar(0.5)).project(camera)
        const maxScreen = min.clone().add(max.clone().multiplyScalar(0.5)).project(camera)
        
        const x = (minScreen.x * 0.5 + 0.5) * size.width
        const y = (1 - (maxScreen.y * 0.5 + 0.5)) * size.height
        const width = (maxScreen.x - minScreen.x) * 0.5 * size.width
        const height = (maxScreen.y - minScreen.y) * 0.5 * size.height
        
        onBoundsUpdate({ x, y, width, height })
      }
    }
  })

  if (!modelUrl || !gltf) return null

  return (
    <group ref={meshRef} scale={9}>
      <primitive object={gltf.scene} />
    </group>
  )
}

function AsciiEffectWithMask({ maskImageUrl, maskScale, densityMask, onMaskLoad, ...props }: any) {
  // Use logo for logo-mask, or user-provided image for image-mask
  const textureUrl = densityMask === "logo-mask" ? "/Syndica-Logo-White.svg" : maskImageUrl;
  const maskTexture = textureUrl ? useLoader(TextureLoader, textureUrl) : null;

  // Configure texture to prevent stretching and streaking
  if (maskTexture) {
    maskTexture.wrapS = THREE.ClampToEdgeWrapping;
    maskTexture.wrapT = THREE.ClampToEdgeWrapping;
    maskTexture.minFilter = THREE.LinearFilter;
    maskTexture.magFilter = THREE.LinearFilter;
    maskTexture.needsUpdate = true;
    
    // Report dimensions
    if (onMaskLoad && maskTexture.image) {
      onMaskLoad({ width: maskTexture.image.width, height: maskTexture.image.height });
    }
  }

  return (
    <AsciiEffect
      {...props}
      postfx={{
        ...props.postfx,
        densityMaskTexture: maskTexture,
        hasDensityMaskTexture: !!maskTexture,
        maskScale: maskScale,
      }}
    />
  )
}

export function EffectScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shaderType, setShaderType] = useState<"cell" | "true-ascii">("cell")
  const [mousePos, setMousePos] = useState(new Vector2(0, 0))
  const [resolution, setResolution] = useState(new Vector2(1920, 1080))
  const [style, setStyle] = useState<"standard" | "dense" | "minimal" | "blocks" | "standard-dots" | "melding-dots" | "ascii-characters-minimal" | "ascii-characters-normal">("standard")
  const [cellSize, setCellSize] = useState(16)
  const [cellSpacing, setCellSpacing] = useState(0.0)
  const [colorMode, setColorMode] = useState(true)
  const [invert, setInvert] = useState(false)
  const [blur, setBlur] = useState(1.0)
  const [minSize, setMinSize] = useState(0.2)
  const [maxSize, setMaxSize] = useState(1.8)
  const [backgroundColor, setBackgroundColor] = useState("#5c5c5c")
  const [characterSet, setCharacterSet] = useState(0)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(1)
  const [saturation, setSaturation] = useState(1)
  const [cellDensity, setCellDensity] = useState(100)
  const [densityStart, setDensityStart] = useState(0)
  const [densityEnd, setDensityEnd] = useState(100)
  const [randomSeed, setRandomSeed] = useState(0)
  const [densityMask, setDensityMask] = useState<"none" | "uniform" | "gradient-linear" | "gradient-radial" | "logo-mask" | "image-mask">("none");
  const [gradientDirection, setGradientDirection] = useState<"up" | "down" | "left" | "right">("up");
  const [gradientMidpoint, setGradientMidpoint] = useState(0.5)
  const [maskImageUrl, setMaskImageUrl] = useState<string | null>(null)
  const [maskScale, setMaskScale] = useState(1.0)
  const [maskOffsetX, setMaskOffsetX] = useState(0.0)
  const [maskOffsetY, setMaskOffsetY] = useState(0.0)
  const [maskDimensions, setMaskDimensions] = useState<{ width: number; height: number } | null>(null)
  const [asciiMaskImageData, setAsciiMaskImageData] = useState<ImageData | null>(null)
  const [maskRenderedSize, setMaskRenderedSize] = useState<{ width: number; height: number } | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [showImage, setShowImage] = useState(false)
  const [modelUrl, setModelUrl] = useState<string | null>("/1-Logo.gltf")
  const [showModel, setShowModel] = useState(true)
  const [isUserUploadedModel, setIsUserUploadedModel] = useState(false)
  const [showBackgroundImage, setShowBackgroundImage] = useState(false)
  const [showCanvasBackground, setShowCanvasBackground] = useState(true)
  const [makeBlackAlpha, setMakeBlackAlpha] = useState(false)
  const [includeBackgroundInExport, setIncludeBackgroundInExport] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number } | null>(null)
  const [mediaBounds, setMediaBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [asciiImageData, setAsciiImageData] = useState<ImageData | null>(null)
  const [asciiCanvasSize, setAsciiCanvasSize] = useState({ width: 0, height: 0 })
  const [asciiLogicalSize, setAsciiLogicalSize] = useState({ width: 0, height: 0 })
  const [showDimensionsInfo, setShowDimensionsInfo] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  // Handler for ASCII renderer
  const handleAsciiRenderData = (data: ImageData, width: number, height: number) => {
    setAsciiImageData(data)
    setAsciiCanvasSize({ width, height })
    // Calculate logical size (accounting for device pixel ratio)
    const pixelRatio = window.devicePixelRatio || 1
    const logicalW = Math.floor(width / pixelRatio)
    const logicalH = Math.floor(height / pixelRatio)
    setAsciiLogicalSize({ 
      width: logicalW, 
      height: logicalH
    })
  }

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

  // Calculate rendered mask size whenever relevant parameters change
  useEffect(() => {
    if ((densityMask === "logo-mask" || densityMask === "image-mask") && maskDimensions) {
      const logoAspect = maskDimensions.width / maskDimensions.height;
      const resX = resolution.x;
      const resY = resolution.y;
      const viewportAspect = resX / resY;
      
      // Based on shader logic: centeredUV.y *= viewportAspect / logoAspect
      // This expands Y sampling, which means mask covers less height
      const yScale = logoAspect / viewportAspect;
      
      // At maskScale=1.0, the mask covers the full width and adjusted height
      // Shader receives maskScale / 2, so divide here as well
      const actualScale = maskScale / 2.0;
      const renderedHeight = resY * yScale / actualScale;
      const renderedWidth = renderedHeight * logoAspect;
      
      setMaskRenderedSize({ width: renderedWidth, height: renderedHeight });
    } else {
      setMaskRenderedSize(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [densityMask, maskDimensions?.width ?? 0, maskDimensions?.height ?? 0, maskScale, resolution.x, resolution.y]);

  // Load mask image for ASCII shader
  useEffect(() => {
    if (shaderType !== "true-ascii") return
    if (densityMask !== "logo-mask" && densityMask !== "image-mask") {
      setAsciiMaskImageData(null)
      return
    }

    const imageUrl = densityMask === "logo-mask" ? "/Syndica-Logo-White.svg" : maskImageUrl
    if (!imageUrl) {
      setAsciiMaskImageData(null)
      return
    }

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setMaskDimensions({ width: img.width, height: img.height })
      
      // Draw to canvas and extract ImageData
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        setAsciiMaskImageData(imageData)
      }
    }
    img.onerror = () => {
      setAsciiMaskImageData(null)
      setMaskDimensions(null)
    }
    img.src = imageUrl
  }, [shaderType, densityMask, maskImageUrl])

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

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setModelUrl(url)
      setShowModel(true)
      setIsUserUploadedModel(true)
    }
  }

  const clearModel = () => {
    if (modelUrl && isUserUploadedModel) {
      URL.revokeObjectURL(modelUrl)
    }
    setModelUrl("/1-Logo.gltf")
    setShowModel(true)
    setIsUserUploadedModel(false)
  }

  const captureScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas')
    if (canvas) {
      // Temporarily hide background if not included in export
      const bgElement = containerRef.current?.querySelector('[data-background-layer]') as HTMLElement
      const originalDisplay = bgElement?.style.display
      if (bgElement && !includeBackgroundInExport) {
        bgElement.style.display = 'none'
      }
      
      requestAnimationFrame(() => {
        // If True ASCII shader, composite the ASCII canvas on top
        if (shaderType === "true-ascii") {
          const asciiCanvas = Array.from(containerRef.current?.querySelectorAll('canvas') || []).find(
            c => (c as HTMLCanvasElement).style.zIndex === '10'
          ) as HTMLCanvasElement
          
          if (asciiCanvas) {
            // Create composite canvas
            const compositeCanvas = document.createElement('canvas')
            compositeCanvas.width = asciiCanvas.width
            compositeCanvas.height = asciiCanvas.height
            const ctx = compositeCanvas.getContext('2d')
            
            if (ctx) {
              // Draw ASCII canvas (it has black background and characters)
              ctx.drawImage(asciiCanvas, 0, 0)
              
              compositeCanvas.toBlob((blob) => {
                // Restore background visibility
                if (bgElement && originalDisplay !== undefined) {
                  bgElement.style.display = originalDisplay
                }
                
                if (blob) {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `ascii-art-viewport-${Date.now()}.png`
                  a.click()
                  URL.revokeObjectURL(url)
                }
              }, 'image/png')
              return
            }
          }
        }
        
        // Regular canvas capture for Cell shader
        canvas.toBlob((blob) => {
          // Restore background visibility
          if (bgElement && originalDisplay !== undefined) {
            bgElement.style.display = originalDisplay
          }
          
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

  const captureMedia = () => {
    if (!mediaBounds) return
    
    const sourceCanvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement
    if (!sourceCanvas) return
    
    // Temporarily hide background if not included in export
    const bgElement = containerRef.current?.querySelector('[data-background-layer]') as HTMLElement
    const originalDisplay = bgElement?.style.display
    if (bgElement && !includeBackgroundInExport) {
      bgElement.style.display = 'none'
    }
    
    // Wait for next frame to ensure canvas is rendered
    requestAnimationFrame(() => {
      const dpr = window.devicePixelRatio || 1
      
      // For True ASCII shader, use the ASCII canvas
      if (shaderType === "true-ascii") {
        const asciiCanvas = Array.from(containerRef.current?.querySelectorAll('canvas') || []).find(
          c => (c as HTMLCanvasElement).style.zIndex === '10'
        ) as HTMLCanvasElement
        
        if (asciiCanvas) {
          // Create temporary canvas at media dimensions
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = Math.round(mediaBounds.width)
          tempCanvas.height = Math.round(mediaBounds.height)
          const ctx = tempCanvas.getContext('2d')
          
          if (!ctx) {
            if (bgElement && originalDisplay !== undefined) {
              bgElement.style.display = originalDisplay
            }
            return
          }
          
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Draw only the media bounds area from ASCII canvas
          ctx.drawImage(
            asciiCanvas,
            Math.round(mediaBounds.x * dpr), // source x
            Math.round(mediaBounds.y * dpr), // source y
            Math.round(mediaBounds.width * dpr), // source width
            Math.round(mediaBounds.height * dpr), // source height
            0, // destination x
            0, // destination y
            Math.round(mediaBounds.width), // destination width
            Math.round(mediaBounds.height) // destination height
          )
          
          tempCanvas.toBlob((blob) => {
            if (bgElement && originalDisplay !== undefined) {
              bgElement.style.display = originalDisplay
            }
            
            if (blob) {
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `ascii-media-${Math.round(mediaBounds.width)}x${Math.round(mediaBounds.height)}-${Date.now()}.png`
              a.click()
              URL.revokeObjectURL(url)
            }
          }, 'image/png')
          return
        }
      }
      
      // For Cell shader, use the WebGL canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = Math.round(mediaBounds.width)
      tempCanvas.height = Math.round(mediaBounds.height)
      const ctx = tempCanvas.getContext('2d')
      
      if (!ctx) {
        // Restore background visibility
        if (bgElement && originalDisplay !== undefined) {
          bgElement.style.display = originalDisplay
        }
        return
      }
      
      // Extract just the media portion from the source canvas
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // Draw only the media bounds area (accounting for device pixel ratio)
      ctx.drawImage(
        sourceCanvas,
        Math.round(mediaBounds.x * dpr), // source x
        Math.round(mediaBounds.y * dpr), // source y
        Math.round(mediaBounds.width * dpr), // source width
        Math.round(mediaBounds.height * dpr), // source height
        0, // destination x
        0, // destination y
        Math.round(mediaBounds.width), // destination width
        Math.round(mediaBounds.height) // destination height
      )
      
      // Download the image
      tempCanvas.toBlob((blob) => {
        // Restore background visibility
        if (bgElement && originalDisplay !== undefined) {
          bgElement.style.display = originalDisplay
        }
        
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `ascii-media-${Math.round(mediaBounds.width)}x${Math.round(mediaBounds.height)}-${Date.now()}.png`
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

  const resetSettings = () => {
    setStyle("standard")
    setCellSize(16)
    setColorMode(true)
    setInvert(false)
    setBlur(1.0)
    setMinSize(0.2)
    setMaxSize(1.8)
    setBackgroundColor("#5c5c5c")
    setBrightness(0)
    setContrast(1)
    setSaturation(1)
    setCellDensity(100)
    setDensityStart(0)
    setDensityEnd(100)
    setDensityMask("none")
    setGradientMidpoint(0.5)
    setMaskScale(1.0)
    setMaskOffsetX(0.0)
    setMaskOffsetY(0.0)
  }

  return (
    <div id="main-container" ref={containerRef} style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Background Image Layer (unprocessed) */}
      {showImage && imageUrl && mediaBounds && showBackgroundImage && (
        <div
          id="background-image-layer"
          data-background-layer
          style={{
            position: "absolute",
            left: `${mediaBounds.x}px`,
            top: `${mediaBounds.y}px`,
            width: `${mediaBounds.width}px`,
            height: `${mediaBounds.height}px`,
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            zIndex: 0,
            pointerEvents: "none"
          }}
        />
      )}
      
      {/* Control Panel */}
      <div id="control-panel" style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        background: "rgba(0, 0, 0, 0.8)",
        padding: "20px",
        borderRadius: "8px",
        color: "white",
        fontFamily: "monospace",
        fontSize: "11px",
        zIndex: 1000,
        width: "320px"
      }}>
        <div style={{ marginBottom: "15px", paddingBottom: "15px", borderBottom: "1px solid #555" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "13px" }}>Shader Type</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShaderType("cell")}
              onMouseEnter={(e) => {
                if (shaderType !== "cell") {
                  e.currentTarget.style.background = "#444";
                  e.currentTarget.style.borderColor = "#3675f8";
                }
              }}
              onMouseLeave={(e) => {
                if (shaderType !== "cell") {
                  e.currentTarget.style.background = "#333";
                  e.currentTarget.style.borderColor = "#555";
                }
              }}
              style={{
                flex: 1,
                padding: "10px",
                background: shaderType === "cell" ? "#3675f8" : "#333",
                color: "white",
                border: shaderType === "cell" ? "2px solid #3675f8" : "1px solid #555",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Cell Shader
            </button>
            <button
              onClick={() => setShaderType("true-ascii")}
              onMouseEnter={(e) => {
                if (shaderType !== "true-ascii") {
                  e.currentTarget.style.background = "#444";
                  e.currentTarget.style.borderColor = "#3675f8";
                }
              }}
              onMouseLeave={(e) => {
                if (shaderType !== "true-ascii") {
                  e.currentTarget.style.background = "#333";
                  e.currentTarget.style.borderColor = "#555";
                }
              }}
              style={{
                flex: 1,
                padding: "10px",
                background: shaderType === "true-ascii" ? "#3675f8" : "#333",
                color: "white",
                border: shaderType === "true-ascii" ? "2px solid #3675f8" : "1px solid #555",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              ASCII Shader
            </button>
          </div>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: "0", fontSize: "13px" }}>
            {shaderType === "cell" ? "Cell Shader Controls" : "ASCII Shader Controls"}
          </h3>
          <button
            onClick={resetSettings}
            style={{
              padding: "4px 8px",
              background: "#444",
              color: "white",
              border: "1px solid #666",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px"
            }}
          >
            Reset
          </button>
        </div>
        
        {shaderType === "cell" && (
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "3px", fontSize: "11px", fontSize: "11px" }}>Style</label>
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
              <option value="standard-dots">Dots</option>
              <option value="melding-dots">Melding Dots</option>
              <option value="ascii-characters-minimal">ASCII Characters minimal</option>
              <option value="ascii-characters-normal">ASCII Characters normal</option>
            </select>
          </div>
        )}

        {shaderType === "true-ascii" && (
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>Character Set</label>
            <select 
              value={characterSet} 
              onChange={(e) => setCharacterSet(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "5px",
                background: "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px"
              }}
            >
              <option value={0}>Basic ( .:-=+*#%@)</option>
              <option value={1}>Short ( .:;+=xX$&#)</option>
              <option value={2}>Medium ( .'`^",:;Il!...)</option>
              <option value={3}>Extended ( .",:;!~+-&lt;&gt;i...)</option>
              <option value={4}>Classic ( .:-=+*#%@)</option>
              <option value={5}>Simple Ramp ( ._-=+*#%@)</option>
              <option value={6}>Blocks ( ░▒▓█)</option>
              <option value={7}>Blocks Extended ( ·:░▒▓█)</option>
              <option value={8}>Braille Blocks ( ⡀⡄⡆⡇⣇⣧⣷⣿)</option>
              <option value={9}>Numeric ( 1234567890)</option>
              <option value={10}>Alphanumeric ( 0123456789AB...)</option>
              <option value={11}>Binary ( 01)</option>
              <option value={12}>Matrix ( .0123456789)</option>
              <option value={13}>Retro ( .:*oe&#%@)</option>
              <option value={14}>Minimal ( .-+=#)</option>
              <option value={15}>Dots ( .·•○●)</option>
              <option value={16}>Lines ( -_=≡═)</option>
            </select>
          </div>
        )}

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px", fontSize: "11px" }}>
            Cell Size: {cellSize}px
          </label>
          <input 
            type="range" 
            min="4" 
            max="32" 
            value={cellSize}
            onChange={(e) => setCellSize(Number(e.target.value))}
            style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px", fontSize: "11px" }}>
            Cell Spacing: {cellSpacing.toFixed(2)}
          </label>
          <input 
            type="range" 
            min="-0.5" 
            max="0.5" 
            step="0.01"
            value={cellSpacing}
            onChange={(e) => setCellSpacing(Number(e.target.value))}
            style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
          />
        </div>

        {style === "melding-dots" && shaderType === "cell" && (
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
              Blur: {blur.toFixed(1)}
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="3" 
              step="0.1"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
            />
          </div>
        )}

        {(style === "standard-dots" || style === "melding-dots") && shaderType === "cell" && (
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
              Min Size: {minSize.toFixed(1)}
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={minSize}
              onChange={(e) => setMinSize(Number(e.target.value))}
              style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
            />
          </div>
        )}

        {(style === "standard-dots" || style === "melding-dots") && shaderType === "cell" && (
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
              Max Size: {maxSize.toFixed(1)}
            </label>
            <input 
              type="range" 
              min="1.0" 
              max="3.0" 
              step="0.1"
              value={maxSize}
              onChange={(e) => setMaxSize(Number(e.target.value))}
              style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "20px", paddingBottom: "15px", borderBottom: "1px solid #555" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", color: "white" }}>
            Cell Density
          </label>
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
            Density Mask
          </label>
          <select 
            value={densityMask} 
            onChange={(e) => setDensityMask(e.target.value as any)}
            style={{
              width: "100%",
              padding: "5px",
              background: "#333",
              color: "white",
              border: "1px solid #555",
              borderRadius: "4px",
              marginBottom: "10px"
            }}
          >
            <option value="none">None</option>
            <option value="uniform">Uniform</option>
            <option value="gradient-linear">Gradient: Linear</option>
            <option value="gradient-radial">Gradient: Radial</option>
            <option value="logo-mask">Logo Mask</option>
            <option value="image-mask">Custom Image Mask</option>
          </select>
        </div>
          {densityMask === "gradient-linear" && (
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                Direction
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "5px" }}>
                <button
                  onClick={() => setGradientDirection("up")}
                  style={{
                    padding: "8px",
                    background: gradientDirection === "up" ? "#4a7aff" : "#333",
                    color: "white",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => setGradientDirection("down")}
                  style={{
                    padding: "8px",
                    background: gradientDirection === "down" ? "#4a7aff" : "#333",
                    color: "white",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  ↓
                </button>
                <button
                  onClick={() => setGradientDirection("left")}
                  style={{
                    padding: "8px",
                    background: gradientDirection === "left" ? "#4a7aff" : "#333",
                    color: "white",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => setGradientDirection("right")}
                  style={{
                    padding: "8px",
                    background: gradientDirection === "right" ? "#4a7aff" : "#333",
                    color: "white",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "16px"
                  }}
                >
                  →
                </button>
              </div>
            </div>
          )}
          {densityMask === "image-mask" && (
            <>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Mask Image
                </label>
                <input 
                  type="file" 
                  accept="image/*,.svg"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const url = URL.createObjectURL(file)
                      setMaskImageUrl(url)
                    }
                  }}
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
              </div>
            </>
          )}
          {(densityMask === "logo-mask" || densityMask === "image-mask") && (
            <>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Mask Scale: {maskScale.toFixed(2)}x
                </label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="10" 
                  step="0.1"
                  value={maskScale}
                  onChange={(e) => setMaskScale(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Position X: {maskOffsetX.toFixed(2)}
                </label>
                <input 
                  type="range" 
                  min="-2" 
                  max="2" 
                  step="0.01"
                  value={maskOffsetX}
                  onChange={(e) => setMaskOffsetX(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Position Y: {maskOffsetY.toFixed(2)}
                </label>
                <input 
                  type="range" 
                  min="-2" 
                  max="2" 
                  step="0.01"
                  value={maskOffsetY}
                  onChange={(e) => setMaskOffsetY(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Density Start: {densityStart}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={densityStart}
                  onChange={(e) => setDensityStart(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Density End: {densityEnd}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={densityEnd}
                  onChange={(e) => setDensityEnd(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
            </>
          )}
          {densityMask === "gradient-linear" && (
            <>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Density Start: {densityStart}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={densityStart}
                  onChange={(e) => setDensityStart(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Density End: {densityEnd}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={densityEnd}
                  onChange={(e) => setDensityEnd(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                  Gradient Midpoint: {(gradientMidpoint * 100).toFixed(0)}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={gradientMidpoint}
                  onChange={(e) => setGradientMidpoint(Number(e.target.value))}
                  style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
                />
              </div>
            </>
          )}
          {densityMask === "uniform" && (
            <div style={{ marginBottom: "10px" }}>
              <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
                Density: {cellDensity}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={cellDensity}
                onChange={(e) => setCellDensity(Number(e.target.value))}
                style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
              />
            </div>
          )}
          {densityMask !== "none" && (
            <button
              onClick={() => setRandomSeed(Math.random() * 1000)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#2563eb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#3675f8";
              }}
              style={{
                width: "100%",
                padding: "6px",
                background: "#3675f8",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                minHeight: "32px",
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              Randomise Pattern
            </button>
          )}
        </div>

        <div style={{ marginBottom: "10px" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "13px" }}>Frame Controls</h3>
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
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
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
            Brightness: {brightness.toFixed(2)}
          </label>
          <input 
            type="range" 
            min="-0.5" 
            max="0.5" 
            step="0.01"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
            Contrast: {contrast.toFixed(2)}
          </label>
          <input 
            type="range" 
            min="0.5" 
            max="2" 
            step="0.01"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "3px", fontSize: "11px" }}>
            Saturation: {saturation.toFixed(2)}
          </label>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.01"
            value={saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
            style={{ width: "100%", height: "4px", accentColor: "#3675f8" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={showCanvasBackground}
              onChange={(e) => setShowCanvasBackground(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Show Background
          </label>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input 
              type="checkbox" 
              checked={makeBlackAlpha}
              onChange={(e) => setMakeBlackAlpha(e.target.checked)}
              style={{ marginRight: "8px" }}
            />
            Make Black Alpha
          </label>
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

        <div style={{ marginBottom: "10px" }}>
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
          <h3 style={{ margin: "0 0 10px 0", fontSize: "13px" }}>Export</h3>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            {mediaBounds && (
              <button
                onClick={captureMedia}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#3675f8";
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "#3675f8",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  minHeight: "40px",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                Capture Media
              </button>
            )}
            <button
              onClick={captureScreenshot}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#444";
                e.currentTarget.style.borderColor = "#3675f8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(51, 51, 51)";
                e.currentTarget.style.borderColor = "#555";
              }}
              style={{
                flex: 1,
                padding: "8px",
                background: "rgb(51, 51, 51)",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                minHeight: "40px",
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              Capture Window
            </button>
          </div>
          {!isRecording ? (
            <button
              onClick={startRecording}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#a0150a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C81A0D";
              }}
              style={{
                width: "100%",
                padding: "8px",
                background: "#C81A0D",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                minHeight: "40px",
                fontWeight: 600,
                transition: "all 0.2s"
              }}
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#a0150a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#C81A0D";
              }}
              style={{
                width: "100%",
                padding: "8px",
                background: "#C81A0D",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                minHeight: "40px",
                fontWeight: 600,
                transition: "all 0.2s",
                animation: "pulse 1s infinite"
              }}
            >
              Stop Recording
            </button>
          )}
        </div>

        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #555" }}>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "13px" }}>Media Upload</h3>
          <input 
            type="file" 
            accept="image/*,.glb,.gltf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const fileName = file.name.toLowerCase()
                if (fileName.endsWith('.glb') || fileName.endsWith('.gltf')) {
                  handleModelUpload(e)
                } else {
                  handleImageUpload(e)
                }
              }
            }}
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
                Show Foreground Image
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={showBackgroundImage}
                  onChange={(e) => setShowBackgroundImage(e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                Show Background Image
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={includeBackgroundInExport}
                  onChange={(e) => setIncludeBackgroundInExport(e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                Include in Export
              </label>
              <button
                onClick={clearImage}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#444";
                  e.currentTarget.style.borderColor = "#3675f8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgb(51, 51, 51)";
                  e.currentTarget.style.borderColor = "#555";
                }}
                style={{
                  width: "100%",
                  padding: "5px",
                  background: "rgb(51, 51, 51)",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  minHeight: "32px",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                Clear Image
              </button>
            </div>
          )}
          {modelUrl && isUserUploadedModel && (
            <div>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={showModel}
                  onChange={(e) => setShowModel(e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                Show 3D Model
              </label>
              <button
                onClick={clearModel}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#444";
                  e.currentTarget.style.borderColor = "#3675f8";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgb(51, 51, 51)";
                  e.currentTarget.style.borderColor = "#555";
                }}
                style={{
                  width: "100%",
                  padding: "5px",
                  background: "rgb(51, 51, 51)",
                  color: "white",
                  border: "1px solid #555",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  minHeight: "32px",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                Clear Model
              </button>
            </div>
          )}
        </div>
      </div>

      <Canvas
        id="canvas-container"
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: (showImage && !showCanvasBackground) ? "transparent" : backgroundColor,
        }}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
      >
        <color attach="background" args={(showImage && !showCanvasBackground) ? ["transparent"] : [backgroundColor]} />

        {/* Lighting */}
        <hemisphereLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={2} />
        <directionalLight position={[-5, 3, -5]} intensity={1.2} />

        {/* 3D Model */}
        {showImage && <ImagePlane imageUrl={imageUrl} dimensions={originalImageSize} onBoundsUpdate={setMediaBounds} />}
        {!showImage && showModel && modelUrl && <ModelViewer modelUrl={modelUrl} onBoundsUpdate={setMediaBounds} />}
        {!showImage && !showModel && <RotatingMesh onBoundsUpdate={setMediaBounds} />}

        <OrbitControls enableDamping enableZoom={true} />

        {/* ASCII Effect with PostFX */}
        {shaderType === "cell" ? (
          <EffectComposer>
            <AsciiEffectWithMask
              densityMask={densityMask}
              maskImageUrl={maskImageUrl}
              maskScale={maskScale / 2.0}
              onMaskLoad={setMaskDimensions}
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
                cellSpacing: cellSpacing,
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
                brightnessAdjust: brightness,
                contrastAdjust: contrast,
                saturationAdjust: saturation,
                backgroundColor: [
                  parseInt(backgroundColor.slice(1, 3), 16) / 255,
                  parseInt(backgroundColor.slice(3, 5), 16) / 255,
                  parseInt(backgroundColor.slice(5, 7), 16) / 255
                ],
                cellDensity: cellDensity,
                randomSeed: randomSeed,
                densityMask: densityMask === "none" ? 0 : densityMask === "uniform" ? 1 : densityMask === "gradient-linear" ? (gradientDirection === "up" ? 2 : gradientDirection === "down" ? 3 : gradientDirection === "left" ? 4 : 5) : densityMask === "gradient-radial" ? 6 : (densityMask === "logo-mask" || densityMask === "image-mask") ? 7 : 0,
                gradientMidpoint: gradientMidpoint,
                densityStart: densityStart,
                densityEnd: densityEnd,
                maskOffsetX: maskOffsetX,
                maskOffsetY: maskOffsetY,
                makeBlackAlpha: makeBlackAlpha,
              }}
            />
          </EffectComposer>
        ) : (
          <ASCIIRendererInner onRenderData={handleAsciiRenderData} />
        )}
      </Canvas>

      {/* ASCII Canvas Overlay - rendered outside Canvas */}
      {shaderType === "true-ascii" && (
        <ASCIICanvas
          key="ascii-canvas"
          cellSize={cellSize}
          invert={invert}
          colorMode={colorMode}
          brightness={brightness}
          contrast={contrast}
          saturation={saturation}
          characterSet={characterSet}
          cellSpacing={cellSpacing}
          cellDensity={cellDensity}
          randomSeed={randomSeed}
          densityMask={densityMask}
          densityStart={densityStart}
          densityEnd={densityEnd}
          gradientDirection={gradientDirection}
          gradientMidpoint={gradientMidpoint}
          maskImageData={asciiMaskImageData}
          maskWidth={maskDimensions?.width ?? 0}
          maskHeight={maskDimensions?.height ?? 0}
          maskScale={maskScale}
          maskOffsetX={maskOffsetX}
          maskOffsetY={maskOffsetY}
          imageData={asciiImageData}
          width={asciiCanvasSize.width}
          height={asciiCanvasSize.height}
          logicalWidth={asciiLogicalSize.width}
          logicalHeight={asciiLogicalSize.height}
        />
      )}

      {/* Dimensions Display */}
      {(showImage || true) && (
        <div id="dimensions-display" style={{
          position: "absolute",
          top: "20px",
          left: "20px",
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
          {mediaBounds && (
            <div style={{ marginTop: "8px", color: "#ffdd88" }}>
              <strong>Media Position:</strong><br/>
              X: {Math.round(mediaBounds.x)} px<br/>
              Y: {Math.round(mediaBounds.y)} px<br/>
              Width: {Math.round(mediaBounds.width)} px<br/>
              Height: {Math.round(mediaBounds.height)} px
            </div>
          )}
          {(densityMask === "logo-mask" || densityMask === "image-mask") && maskDimensions && (
            <div style={{ marginTop: "8px", color: "#aaffaa" }}>
              <strong>Mask Dimensions:</strong><br/>
              Width: {maskDimensions.width} px<br/>
              Height: {maskDimensions.height} px<br/>
              Aspect: {(maskDimensions.width / maskDimensions.height).toFixed(4)}<br/>
              {maskRenderedSize && (
                <>
                  <br/>
                  <strong>Rendered Size:</strong><br/>
                  Width: {Math.round(maskRenderedSize.width)} px<br/>
                  Height: {Math.round(maskRenderedSize.height)} px
                </>
              )}
            </div>
          )}
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
