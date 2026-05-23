export interface DataPoint {
  id: string
  name: string
  category: string
  country: string
  country_id: string
  coordinates: [number, number]
  properties: Record<string, string | number | undefined>
}

export interface CategoryStyle {
  label: string
  color: string
  icon?: string
}

export interface DetailField {
  key: string
  label: string
}

export interface LayerConfig {
  id: string
  name: string
  description: string
  dataUrl: string
  categories: Record<string, CategoryStyle>
  parseFeature: (feature: GeoJSON.Feature) => DataPoint
  getCountryColor?: (points: DataPoint[]) => { color: string; opacity: number }
  detailFields?: DetailField[]
  defaultVisible?: boolean
}
