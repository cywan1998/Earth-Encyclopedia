export interface LegendItem {
  label: string
  color: string
}

export interface MineralRecord {
  name: string
  mineral_type: string
  country: string
  country_id: string
  reserve_level: string
  status: string
  coordinates: [number, number]
}

export interface LayerConfig {
  id: string
  name: string
  description: string
  dataUrl: string
  legend?: LegendItem[]
  defaultVisible?: boolean
}
