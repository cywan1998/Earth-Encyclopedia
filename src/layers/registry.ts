import type { LayerConfig } from './types'
import minerals from './minerals'

const layers: LayerConfig[] = [
  minerals,
]

export function getAllLayers(): LayerConfig[] {
  return layers
}
