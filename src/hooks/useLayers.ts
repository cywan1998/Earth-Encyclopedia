import { useState, useCallback } from 'react'
import { getAllLayers } from '../layers/registry'
import type { LayerConfig } from '../layers/types'

export interface LayerState {
  config: LayerConfig
  visible: boolean
}

export function useLayers() {
  const [layerStates, setLayerStates] = useState<LayerState[]>(() =>
    getAllLayers().map(config => ({
      config,
      visible: config.defaultVisible ?? false,
    }))
  )

  const toggleLayer = useCallback((layerId: string) => {
    setLayerStates(prev =>
      prev.map(ls =>
        ls.config.id === layerId ? { ...ls, visible: !ls.visible } : ls
      )
    )
  }, [])

  return { layerStates, toggleLayer }
}
