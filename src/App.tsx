import { useState, useCallback } from 'react'
import { ConfigProvider, theme } from 'antd'
import GlobeView from './components/GlobeView'
import LayerPanel from './components/LayerPanel'
import CountryDetail from './components/CountryDetail'
import { useLayers } from './hooks/useLayers'
import type { DataPoint } from './layers/types'

interface SelectedCountry {
  id: string
  name: string
  points: DataPoint[]
}

export default function App() {
  const { layerStates, toggleLayer } = useLayers()
  const [selected, setSelected] = useState<SelectedCountry | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const activeLayer = layerStates.find(ls => ls.visible)?.config ?? null

  const handleSelectCountry = useCallback((id: string, name: string, points: DataPoint[]) => {
    setSelected({ id, name, points })
  }, [])

  const handleClose = useCallback(() => setSelected(null), [])

  const handleSelectCategory = useCallback((type: string | null) => {
    setSelectedCategory(type)
  }, [])

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div className="app-layout">
        <LayerPanel
          layerStates={layerStates}
          onToggle={toggleLayer}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />
        <GlobeView
          layerStates={layerStates}
          onSelectCountry={handleSelectCountry}
          selectedCategory={selectedCategory}
        />
        <CountryDetail
          open={selected !== null}
          countryName={selected?.name ?? ''}
          points={selected?.points ?? []}
          layerConfig={activeLayer}
          onClose={handleClose}
        />
      </div>
    </ConfigProvider>
  )
}
