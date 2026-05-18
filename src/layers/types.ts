export interface LegendItem {
  label: string
  color: string
  icon?: string
}

export interface MineralRecord {
  name: string
  mineral_type: string
  country: string
  country_id: string
  reserve_level: string
  reserves: string
  annual_production?: string
  grade?: string
  discovery_year?: string
  operator?: string
  description: string
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
