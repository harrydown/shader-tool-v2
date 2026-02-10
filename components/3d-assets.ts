export interface Material {
  color: string
  roughness: number
  metalness: number
}

export interface RotationSpeed {
  x: number
  y: number
}

export interface Asset3D {
  type: 'torusKnot' | 'sphere' | 'box' | 'torus' | 'cone' | 'cylinder' | 'dodecahedron' | 'icosahedron' | 'octahedron' | 'tetrahedron' | 'custom'
  args: number[]
  scale?: number
  color: string
  material: Material
  rotation: RotationSpeed
}

export const ASSETS_3D: Record<string, Asset3D> = {
  torusKnot: {
    type: 'torusKnot',
    args: [0.8, 0.3, 100, 16],
    scale: 1,
    color: '#917aff',
    material: {
      roughness: 0.3,
      metalness: 0.1
    },
    rotation: {
      x: 0.3,
      y: 0.5
    }
  }
}

export const DEFAULT_ASSET = 'torusKnot'

export function getAsset(name: string): Asset3D | undefined {
  return ASSETS_3D[name]
}

export function getDefaultAsset(): Asset3D {
  return ASSETS_3D[DEFAULT_ASSET]
}
