import type { LayerConfig, DataPoint, CategoryStyle } from './types'

const RESERVE_WEIGHT: Record<string, number> = { '超大型': 4, '大型': 2, '中型': 1 }

export const MINERAL_CATEGORIES: Record<string, CategoryStyle> = {
  '铁矿': { label: '铁矿', color: '#e74c3c', icon: '/icons/minerals/iron.svg' },
  '铜矿': { label: '铜矿', color: '#e67e22', icon: '/icons/minerals/copper.svg' },
  '金矿': { label: '金矿', color: '#f1c40f', icon: '/icons/minerals/gold.svg' },
  '铝土矿': { label: '铝土矿', color: '#9b59b6', icon: '/icons/minerals/bauxite.svg' },
  '锂矿': { label: '锂矿', color: '#1abc9c', icon: '/icons/minerals/lithium.svg' },
  '煤矿': { label: '煤矿', color: '#546e7a', icon: '/icons/minerals/coal.svg' },
  '石油': { label: '石油', color: '#2c3e50', icon: '/icons/minerals/oil.svg' },
  '天然气': { label: '天然气', color: '#3498db', icon: '/icons/minerals/gas.svg' },
  '稀土': { label: '稀土', color: '#e91e63', icon: '/icons/minerals/rare-earth.svg' },
  '镍矿': { label: '镍矿', color: '#27ae60', icon: '/icons/minerals/nickel.svg' },
  '锰矿': { label: '锰矿', color: '#8d6e63', icon: '/icons/minerals/manganese.svg' },
  '锡矿': { label: '锡矿', color: '#78909c', icon: '/icons/minerals/tin.svg' },
  '钴矿': { label: '钴矿', color: '#5c6bc0', icon: '/icons/minerals/cobalt.svg' },
  '钨矿': { label: '钨矿', color: '#ff7043', icon: '/icons/minerals/tungsten.svg' },
  '锌矿': { label: '锌矿', color: '#26a69a', icon: '/icons/minerals/zinc.svg' },
  '铀矿': { label: '铀矿', color: '#66bb6a', icon: '/icons/minerals/uranium.svg' },
  '钻石矿': { label: '钻石矿', color: '#00bcd4', icon: '/icons/minerals/diamond.svg' },
  '铂族金属': { label: '铂族金属', color: '#b0bec5', icon: '/icons/minerals/platinum.svg' },
  '磷矿': { label: '磷矿', color: '#ab47bc', icon: '/icons/minerals/phosphate.svg' },
  '钾盐': { label: '钾盐', color: '#d4e157', icon: '/icons/minerals/potash.svg' },
}

function parseFeature(feature: GeoJSON.Feature): DataPoint {
  const p = feature.properties as Record<string, string>
  const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
  return {
    id: `${p.country_id}-${p.name}`,
    name: p.name,
    category: p.mineral_type,
    country: p.country,
    country_id: p.country_id,
    coordinates: coords,
    properties: {
      reserve_level: p.reserve_level,
      reserves: p.reserves,
      annual_production: p.annual_production,
      grade: p.grade,
      discovery_year: p.discovery_year,
      operator: p.operator,
      description: p.description,
      status: p.status,
    },
  }
}

function getCountryColor(points: DataPoint[]): { color: string; opacity: number } {
  const typeScores = new Map<string, number>()
  for (const p of points) {
    const weight = RESERVE_WEIGHT[p.properties.reserve_level as string] ?? 1
    typeScores.set(p.category, (typeScores.get(p.category) ?? 0) + weight)
  }
  let dominantType = ''
  let maxScore = 0
  for (const [type, score] of typeScores) {
    if (score > maxScore) { dominantType = type; maxScore = score }
  }
  const color = MINERAL_CATEGORIES[dominantType]?.color ?? '#95a5a6'
  const count = points.length
  const opacity = count >= 15 ? 0.8 : count >= 10 ? 0.7 : count >= 6 ? 0.55 : count >= 3 ? 0.4 : 0.25
  return { color, opacity }
}

const minerals: LayerConfig = {
  id: 'minerals',
  name: '全球矿产分布',
  description: '世界主要矿区及矿种分布，涵盖金属矿、能源矿和非金属矿',
  dataUrl: '/data/minerals.geojson',
  categories: MINERAL_CATEGORIES,
  parseFeature,
  getCountryColor,
  detailFields: [
    { key: 'reserves', label: '探明储量' },
    { key: 'annual_production', label: '年产量' },
    { key: 'grade', label: '品位/质量' },
    { key: 'discovery_year', label: '发现年份' },
    { key: 'operator', label: '运营方' },
    { key: 'status', label: '开发状态' },
  ],
  defaultVisible: true,
}

export default minerals
