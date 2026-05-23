import { useEffect, useRef } from 'react'
import maplibregl, { GlobeControl } from 'maplibre-gl'
import * as topojson from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { LayerState } from '../hooks/useLayers'
import type { MineralRecord } from '../layers/types'
import { groupMineralsByCountryId, MINERAL_COLORS, MINERAL_ICONS } from '../layers/minerals'

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

const RESERVE_WEIGHT: Record<string, number> = { '超大型': 4, '大型': 2, '中型': 1 }

function buildCountryFeatures(
  baseFeatures: GeoJSON.Feature[],
  grouped: Map<string, MineralRecord[]>,
  mineralTypeFilter: string | null,
): GeoJSON.Feature[] {
  return baseFeatures.reduce<GeoJSON.Feature[]>((acc, feature) => {
    const id = String(feature.id)
    let minerals = grouped.get(id)
    if (!minerals?.length) return acc

    if (mineralTypeFilter) {
      minerals = minerals.filter(m => m.mineral_type === mineralTypeFilter)
      if (!minerals.length) return acc
    }

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

    acc.push({
      ...feature,
      properties: {
        ...feature.properties,
        mineral_count: minerals.length,
        country_id: id,
        dominant_color: MINERAL_COLORS[dominantType] ?? '#95a5a6',
      },
    })
    return acc
  }, [])
}

interface MapViewProps {
  layerStates: LayerState[]
  onSelectCountry: (countryId: string, countryName: string, minerals: MineralRecord[]) => void
  selectedMineralType: string | null
}

const COUNTRY_FILL_LAYER = 'country-fill'
const COUNTRY_LINE_LAYER = 'country-line'
const COUNTRY_HOVER_LAYER = 'country-hover'
const MINERAL_POINTS_LAYER = 'mineral-points'
const COUNTRIES_SOURCE = 'countries'
const MINERALS_SOURCE = 'minerals'

export default function MapView({ layerStates, onSelectCountry, selectedMineralType }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mineralDataRef = useRef<Map<string, MineralRecord[]>>(new Map())
  const countryNamesRef = useRef<Map<string, string>>(new Map())
  const onSelectRef = useRef(onSelectCountry)
  onSelectRef.current = onSelectCountry

  const baseFeaturesRef = useRef<GeoJSON.Feature[]>([])
  const readyRef = useRef(false)

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
    map.addControl(new GlobeControl(), 'top-right')
    mapRef.current = map

    map.on('load', async () => {
      map.setProjection({ type: 'globe' })
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

      baseFeaturesRef.current = geo.features

      const countryFeatures = buildCountryFeatures(geo.features, grouped, null)
      const countryGeo: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: countryFeatures }

      map.addSource(COUNTRIES_SOURCE, { type: 'geojson', data: countryGeo })
      map.addSource(MINERALS_SOURCE, { type: 'geojson', data: mineralGeo })

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

      map.addLayer({
        id: COUNTRY_LINE_LAYER,
        type: 'line',
        source: COUNTRIES_SOURCE,
        paint: {
          'line-color': '#cbd5e1',
          'line-width': 0.5,
        },
      })

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

      const iconSize = 32
      const loadSvgIcon = (name: string, url: string): Promise<void> =>
        new Promise((resolve) => {
          const img = new Image(iconSize, iconSize)
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = iconSize
            canvas.height = iconSize
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, iconSize, iconSize)
            const data = ctx.getImageData(0, 0, iconSize, iconSize)
            map.addImage(name, data)
            resolve()
          }
          img.onerror = () => resolve()
          img.src = url
        })

      await Promise.all(
        Object.entries(MINERAL_ICONS).map(([type, url]) => loadSvgIcon(`mineral-${type}`, url))
      )

      const iconImageExpr: unknown[] = ['match', ['get', 'mineral_type']]
      for (const type of Object.keys(MINERAL_ICONS)) {
        iconImageExpr.push(type, `mineral-${type}`)
      }
      iconImageExpr.push(`mineral-${Object.keys(MINERAL_ICONS)[0]}`)

      map.addLayer({
        id: MINERAL_POINTS_LAYER,
        type: 'symbol',
        source: MINERALS_SOURCE,
        layout: {
          'icon-image': iconImageExpr as maplibregl.ExpressionSpecification,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 1, 0.5, 5, 0.75, 10, 1],
          'icon-allow-overlap': true,
        },
      })

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

      readyRef.current = true
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return

    const mineralsLayer = layerStates.find(ls => ls.config.id === 'minerals')
    if (!mineralsLayer) return

    const vis = mineralsLayer.visible ? 'visible' : 'none'
    if (map.getLayer(COUNTRY_FILL_LAYER)) map.setLayoutProperty(COUNTRY_FILL_LAYER, 'visibility', vis)
    if (map.getLayer(COUNTRY_LINE_LAYER)) map.setLayoutProperty(COUNTRY_LINE_LAYER, 'visibility', vis)
    if (map.getLayer(MINERAL_POINTS_LAYER)) map.setLayoutProperty(MINERAL_POINTS_LAYER, 'visibility', vis)
  }, [layerStates])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current) return

    if (selectedMineralType) {
      map.setFilter(MINERAL_POINTS_LAYER, ['==', ['get', 'mineral_type'], selectedMineralType])
    } else {
      map.setFilter(MINERAL_POINTS_LAYER, null)
    }

    const countryFeatures = buildCountryFeatures(
      baseFeaturesRef.current,
      mineralDataRef.current,
      selectedMineralType,
    )
    const source = map.getSource(COUNTRIES_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (source) {
      source.setData({ type: 'FeatureCollection', features: countryFeatures })
    }
  }, [selectedMineralType])

  return <div ref={containerRef} className="map-container" />
}
