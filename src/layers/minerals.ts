import type { LayerConfig, MineralRecord } from './types'

export const MINERAL_COLORS: Record<string, string> = {
  '铁矿': '#e74c3c',
  '铜矿': '#e67e22',
  '金矿': '#f1c40f',
  '铝土矿': '#9b59b6',
  '锂矿': '#1abc9c',
  '煤矿': '#546e7a',
  '石油': '#2c3e50',
  '稀土': '#e91e63',
}

const minerals: LayerConfig = {
  id: 'minerals',
  name: '全球矿产分布',
  description: '世界主要矿区及矿种分布，涵盖金属矿、能源矿和非金属矿',
  dataUrl: '/data/minerals.geojson',
  legend: Object.entries(MINERAL_COLORS).map(([label, color]) => ({ label, color })),
  defaultVisible: true,
}

export function groupMineralsByCountryId(features: GeoJSON.Feature[]): Map<string, MineralRecord[]> {
  const map = new Map<string, MineralRecord[]>()
  for (const f of features) {
    const p = f.properties as Record<string, string>
    const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
    const record: MineralRecord = {
      name: p.name,
      mineral_type: p.mineral_type,
      country: p.country,
      country_id: p.country_id,
      reserve_level: p.reserve_level,
      status: p.status,
      coordinates: coords,
    }
    const list = map.get(p.country_id) ?? []
    list.push(record)
    map.set(p.country_id, list)
  }
  return map
}

export default minerals
