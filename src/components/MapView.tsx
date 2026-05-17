import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { LayerState } from '../hooks/useLayers'
import type { MineralRecord } from '../layers/types'
import { groupMineralsByCountryId, MINERAL_COLORS } from '../layers/minerals'

function fixRing(ring: number[][]): number[][] {
  const result: number[][] = [ring[0]]
  for (let i = 1; i < ring.length; i++) {
    const prev = result[i - 1]
    const curr = [ring[i][0], ring[i][1]]
    while (curr[0] - prev[0] > 180) curr[0] -= 360
    while (prev[0] - curr[0] > 180) curr[0] += 360
    result.push(curr)
  }
  return result
}

function fixAntimeridian(geo: GeoJSON.FeatureCollection): void {
  for (const feature of geo.features) {
    const geom = feature.geometry
    if (geom.type === 'MultiPolygon') {
      geom.coordinates = geom.coordinates.map(
        polygon => polygon.map(fixRing)
      )
    } else if (geom.type === 'Polygon') {
      geom.coordinates = geom.coordinates.map(fixRing)
    }
  }
}

interface MapViewProps {
  layerStates: LayerState[]
  onSelectCountry: (countryId: string, countryName: string, minerals: MineralRecord[]) => void
}

const COUNTRY_FILL_LAYER = 'country-fill'
const COUNTRY_LINE_LAYER = 'country-line'
const COUNTRY_HOVER_LAYER = 'country-hover'
const MINERAL_POINTS_LAYER = 'mineral-points'
const COUNTRIES_SOURCE = 'countries'
const MINERALS_SOURCE = 'minerals'

export default function MapView({ layerStates, onSelectCountry }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mineralDataRef = useRef<Map<string, MineralRecord[]>>(new Map())
  const countryNamesRef = useRef<Map<string, string>>(new Map())
  const onSelectRef = useRef(onSelectCountry)
  onSelectRef.current = onSelectCountry

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          { id: 'osm-tiles', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 },
        ],
      },
      center: [105, 30],
      zoom: 1.8,
      attributionControl: {},
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('load', async () => {
      const [worldModule, mineralRes] = await Promise.all([
        import('world-atlas/countries-110m.json'),
        fetch('/data/minerals.geojson'),
      ])
      const worldAtlas = worldModule.default
      const mineralGeo = await mineralRes.json() as GeoJSON.FeatureCollection

      const topo = worldAtlas as unknown as Topology<{ countries: GeometryCollection }>
      const geo = topojson.feature(topo, topo.objects.countries) as GeoJSON.FeatureCollection
      fixAntimeridian(geo)

      const nameMap = new Map<string, string>()
      for (const geom of topo.objects.countries.geometries) {
        nameMap.set(String(geom.id), (geom.properties as { name: string }).name)
      }
      countryNamesRef.current = nameMap

      const grouped = groupMineralsByCountryId(mineralGeo.features)
      mineralDataRef.current = grouped

      geo.features = geo.features.filter(feature => {
        const id = String(feature.id)
        const minerals = grouped.get(id)
        if (!minerals?.length) return false

        const RESERVE_WEIGHT: Record<string, number> = { '超大型': 4, '大型': 2, '中型': 1 }
        const typeScores = new Map<string, number>()
        for (const m of minerals) {
          const weight = RESERVE_WEIGHT[m.reserve_level] ?? 1
          typeScores.set(m.mineral_type, (typeScores.get(m.mineral_type) ?? 0) + weight)
        }
        let dominantType = ''
        let maxScore = 0
        for (const [type, score] of typeScores) {
          if (score > maxScore) { dominantType = type; maxScore = score }
        }

        feature.properties = {
          ...feature.properties,
          mineral_count: minerals.length,
          country_id: id,
          dominant_color: MINERAL_COLORS[dominantType] ?? '#95a5a6',
        }
        return true
      })

      if (!map.getSource(COUNTRIES_SOURCE)) {
        map.addSource(COUNTRIES_SOURCE, { type: 'geojson', data: geo })
      }
      if (!map.getSource(MINERALS_SOURCE)) {
        map.addSource(MINERALS_SOURCE, { type: 'geojson', data: mineralGeo })
      }

      if (!map.getLayer(COUNTRY_FILL_LAYER)) {
        map.addLayer({
          id: COUNTRY_FILL_LAYER,
          type: 'fill',
          source: COUNTRIES_SOURCE,
          paint: {
            'fill-color': ['get', 'dominant_color'],
            'fill-opacity': [
              'interpolate', ['linear'], ['get', 'mineral_count'],
              1, 0.25,
              3, 0.4,
              6, 0.55,
              10, 0.7,
              15, 0.8,
            ],
          },
        })
      }

      if (!map.getLayer(COUNTRY_LINE_LAYER)) {
        map.addLayer({
          id: COUNTRY_LINE_LAYER,
          type: 'line',
          source: COUNTRIES_SOURCE,
          paint: {
            'line-color': '#cbd5e1',
            'line-width': 0.5,
          },
        })
      }

      if (!map.getLayer(COUNTRY_HOVER_LAYER)) {
        map.addLayer({
          id: COUNTRY_HOVER_LAYER,
          type: 'line',
          source: COUNTRIES_SOURCE,
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
          },
          filter: ['==', 'country_id', ''],
        })
      }

      if (!map.getLayer(MINERAL_POINTS_LAYER)) {
        map.addLayer({
          id: MINERAL_POINTS_LAYER,
          type: 'circle',
          source: MINERALS_SOURCE,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3, 5, 5, 10, 8],
            'circle-color': [
              'match', ['get', 'mineral_type'],
              '铁矿', '#e74c3c',
              '铜矿', '#e67e22',
              '金矿', '#f1c40f',
              '铝土矿', '#9b59b6',
              '锂矿', '#1abc9c',
              '煤矿', '#546e7a',
              '石油', '#2c3e50',
              '稀土', '#e91e63',
              '#95a5a6',
            ],
            'circle-opacity': 0.9,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#fff',
          },
        })
      }

      let hoveredId: string | null = null

      map.on('mousemove', COUNTRY_FILL_LAYER, (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const id = feature.properties?.country_id as string
        if (id !== hoveredId) {
          hoveredId = id
          map.setFilter(COUNTRY_HOVER_LAYER, ['==', 'country_id', id])
          map.getCanvas().style.cursor = (feature.properties?.mineral_count ?? 0) > 0 ? 'pointer' : ''
        }
      })

      map.on('mouseleave', COUNTRY_FILL_LAYER, () => {
        hoveredId = null
        map.setFilter(COUNTRY_HOVER_LAYER, ['==', 'country_id', ''])
        map.getCanvas().style.cursor = ''
      })

      map.on('click', COUNTRY_FILL_LAYER, (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const countryId = feature.properties?.country_id as string
        const minerals = mineralDataRef.current.get(countryId)
        if (!minerals?.length) return
        const name = countryNamesRef.current.get(countryId) ?? countryId
        onSelectRef.current(countryId, name, minerals)
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return

    const mineralsLayer = layerStates.find(ls => ls.config.id === 'minerals')
    if (!mineralsLayer) return

    const vis = mineralsLayer.visible ? 'visible' : 'none'
    if (map.getLayer(COUNTRY_FILL_LAYER)) map.setLayoutProperty(COUNTRY_FILL_LAYER, 'visibility', vis)
    if (map.getLayer(COUNTRY_LINE_LAYER)) map.setLayoutProperty(COUNTRY_LINE_LAYER, 'visibility', vis)
    if (map.getLayer(MINERAL_POINTS_LAYER)) map.setLayoutProperty(MINERAL_POINTS_LAYER, 'visibility', vis)
  }, [layerStates])

  return <div ref={containerRef} className="map-container" />
}
