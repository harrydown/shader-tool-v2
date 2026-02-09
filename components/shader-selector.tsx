    "use client"

import { useRef, useEffect } from "react"

type ShaderType = "cell" | "true-ascii"

interface ShaderSelectorProps {
  selectedShader: ShaderType
  onShaderChange: (shader: ShaderType) => void
}

export function ShaderSelector({ selectedShader, onShaderChange }: ShaderSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const shaders: { id: ShaderType; name: string; description: string }[] = [
    {
      id: "cell",
      name: "Cell Shader",
      description: "Grid-based pixel patterns with various styles",
    },
    {
      id: "true-ascii",
      name: "ASCII Shader",
      description: "True ASCII characters rendered on screen",
    },
  ]

  useEffect(() => {
    // Scroll selected item into view
    if (containerRef.current) {
      const selected = containerRef.current.querySelector('[data-selected="true"]')
      if (selected) {
        selected.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }
  }, [selectedShader])

  return (
    <div
      id="shader-selector"
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        right: "400px", // Leave space for control panel
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.8)",
        borderRadius: "8px",
        padding: "12px",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "#666 rgba(0, 0, 0, 0.3)",
        }}
      >
        {shaders.map((shader) => (
          <button
            key={shader.id}
            data-selected={selectedShader === shader.id}
            onClick={() => onShaderChange(shader.id)}
            style={{
              minWidth: "200px",
              padding: "16px",
              background:
                selectedShader === shader.id
                  ? "linear-gradient(135deg, #917aff 0%, #6b5ce7 100%)"
                  : "rgba(255, 255, 255, 0.05)",
              border:
                selectedShader === shader.id
                  ? "2px solid #917aff"
                  : "2px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontFamily: "monospace",
              textAlign: "left",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (selectedShader !== shader.id) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"
              }
            }}
            onMouseLeave={(e) => {
              if (selectedShader !== shader.id) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)"
              }
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "4px",
              }}
            >
              {shader.name}
            </div>
            <div
              style={{
                fontSize: "11px",
                opacity: 0.8,
                lineHeight: "1.4",
              }}
            >
              {shader.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
