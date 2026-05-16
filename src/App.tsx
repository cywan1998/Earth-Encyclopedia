import { useState, useCallback } from 'react'
import { ConfigProvider, theme } from 'antd'
import MapView from './components/MapView'
import LayerPanel from './components/LayerPanel'
import CountryDetail from './components/CountryDetail'
import { useLayers } from './hooks/useLayers'
import type { MineralRecord } from './layers/types'

interface SelectedCountry {
  id: string
  name: string
  minerals: MineralRecord[]
}

export default function App() {
  const { layerStates, toggleLayer } = useLayers()
  const [selected, setSelected] = useState<SelectedCountry | null>(null)

  const handleSelectCountry = useCallback((id: string, name: string, minerals: MineralRecord[]) => {
    setSelected({ id, name, minerals })
  }, [])

  const handleClose = useCallback(() => setSelected(null), [])

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div className="app-layout">
        <LayerPanel layerStates={layerStates} onToggle={toggleLayer} />
        <MapView layerStates={layerStates} onSelectCountry={handleSelectCountry} />
        <CountryDetail
          open={selected !== null}
          countryName={selected?.name ?? ''}
          minerals={selected?.minerals ?? []}
          onClose={handleClose}
        />
      </div>
    </ConfigProvider>
  )
}
